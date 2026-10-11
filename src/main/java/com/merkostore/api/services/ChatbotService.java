package com.merkostore.api.services;

import com.merkostore.api.dtos.ChatRequest;
import com.merkostore.api.dtos.ChatResponse;
import com.merkostore.api.models.ChatMessage;
import com.merkostore.api.models.Product;
import com.merkostore.api.models.StoreConfig;
import com.merkostore.api.repositories.ChatMessageRepository;
import com.merkostore.api.repositories.ProductRepository;
import com.merkostore.api.repositories.StoreConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final ProductRepository productRepository;
    private final StoreConfigRepository storeConfigRepository;
    private final ChatMessageRepository chatMessageRepository;

    @Value("${merkostore.llm.groq.api-key:}")
    private String groqApiKey;

    @Value("${merkostore.llm.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    @Value("${merkostore.llm.groq.api-url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public ChatResponse processUserMessage(ChatRequest request) {
        String conversationId = (request.getConversationId() != null && !request.getConversationId().isBlank())
                ? request.getConversationId()
                : UUID.randomUUID().toString();

        String storeId = (request.getStoreId() != null && !request.getStoreId().isBlank())
                ? request.getStoreId()
                : "default-store";

        String userText = request.getMessage().trim();

        // 1. Guardar mensaje del usuario en BD
        saveMessage(conversationId, storeId, "user", userText, "USER_INPUT");

        // 2. Obtener contexto de negocio en tiempo real (RAG Liviano)
        StoreConfig storeConfig = storeConfigRepository.findByStoreId(storeId).orElse(null);
        List<Product> availableProducts = productRepository.findByStoreIdAndIsAvailableTrue(storeId);

        // 3. Intentar procesar con LLM (Groq / Llama) si hay API Key configurada
        String botReply = null;
        String detectedIntent = "GENERAL_ASSISTANCE";
        List<ChatResponse.ProductSummary> matchedSummaries = new ArrayList<>();

        if (groqApiKey != null && !groqApiKey.isBlank() && !groqApiKey.equalsIgnoreCase("your_api_key_here")) {
            try {
                botReply = callGroqLlm(userText, storeConfig, availableProducts, conversationId);
                detectedIntent = "LLM_GENERATED";
            } catch (Exception e) {
                log.warn("Fallo la llamada a Groq LLM API ({}), ejecutando motor experto de dominio: {}", e.getMessage(), e.toString());
            }
        }

        // 4. Si no hay LLM configurado o falló, procesar con Motor Experto de Dominio Merkostore
        if (botReply == null || botReply.isBlank()) {
            DomainProcessingResult result = processWithDomainEngine(userText, storeConfig, availableProducts);
            botReply = result.reply;
            detectedIntent = result.intent;
            matchedSummaries = result.matchedProducts;
        }

        // 5. Generar sugerencias dinámicas de preguntas para el usuario
        List<String> suggestions = generateSuggestions(detectedIntent, availableProducts);

        // 6. Guardar respuesta del bot en BD
        saveMessage(conversationId, storeId, "assistant", botReply, detectedIntent);

        return ChatResponse.builder()
                .conversationId(conversationId)
                .reply(botReply)
                .intent(detectedIntent)
                .suggestions(suggestions)
                .matchedProducts(matchedSummaries)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public List<String> getInitialSuggestions() {
        return List.of(
                "🔥 ¿Qué promociones hay hoy?",
                "🥛 ¿Tienen leche y huevos?",
                "🛵 ¿Cuánto vale el domicilio?",
                "💳 ¿Cuáles son los métodos de pago?",
                "📍 ¿Cuál es el horario y dirección?"
        );
    }

    private void saveMessage(String convId, String storeId, String role, String content, String intent) {
        try {
            ChatMessage msg = ChatMessage.builder()
                    .conversationId(convId)
                    .storeId(storeId)
                    .role(role)
                    .content(content)
                    .intent(intent)
                    .timestamp(LocalDateTime.now())
                    .build();
            chatMessageRepository.save(msg);
        } catch (Exception ex) {
            log.error("Error guardando historial de chat: {}", ex.getMessage());
        }
    }

    /**
     * Integración REST con LLM Externo (Groq Cloud API con Llama 3)
     */
    private String callGroqLlm(String userText, StoreConfig config, List<Product> products, String convId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        // Construir catálogo resumido para el prompt del sistema
        String catalogSummary = products.stream()
                .limit(25)
                .map(p -> String.format("- %s: $%s COP (Stock: %d %s)",
                        p.getName(),
                        formatMoney(p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice()),
                        p.getStock() != null ? p.getStock() : 0,
                        p.getUnit() != null ? p.getUnit() : "UND"))
                .collect(Collectors.joining("\n"));

        String storeName = config != null ? config.getStoreName() : "Merkostore";
        String deliveryFee = config != null && config.getDeliveryFee() != null ? formatMoney(config.getDeliveryFee()) : "3.000";
        String minOrder = config != null && config.getMinimumOrder() != null ? formatMoney(config.getMinimumOrder()) : "10.000";

        String systemPrompt = String.format(
                "Eres MerkoBot, el asistente inteligente y amigable de la tienda de barrio '%s'. " +
                "Tu objetivo es ayudar a los vecinos y clientes a consultar productos, precios, ofertas, " +
                "hacer pedidos por WhatsApp o en la app, y resolver dudas de domicilios.\n\n" +
                "REGLAS:\n" +
                "1. Responde de manera cálida, colombiana y profesional, con emojis adecuados.\n" +
                "2. El domicilio cuesta $%s COP y el pedido mínimo es $%s COP.\n" +
                "3. Métodos de pago: WhatsApp, Nequi, Daviplata, PSE y Contra-entrega en efectivo.\n" +
                "4. Catálogo actual en tiempo real:\n%s\n\n" +
                "5. Si el cliente pregunta por un producto que no está en la lista, dile amablemente que verificarás con Don Pedro el tiendero.\n" +
                "6. Sé conciso y al grano.",
                storeName, deliveryFee, minOrder, catalogSummary
        );

        Map<String, Object> systemMessage = Map.of("role", "system", "content", systemPrompt);
        Map<String, Object> userMessage = Map.of("role", "user", "content", userText);

        Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(systemMessage, userMessage),
                "temperature", 0.6,
                "max_tokens", 350
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(groqApiUrl, entity, Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            Map body = response.getBody();
            List choices = (List) body.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map firstChoice = (Map) choices.get(0);
                Map msg = (Map) firstChoice.get("message");
                if (msg != null && msg.get("content") != null) {
                    return msg.get("content").toString().trim();
                }
            }
        }
        return null;
    }

    /**
     * Motor Experto de Dominio Autónomo para Merkostore (Garantiza disponibilidad offline / sin API key externa)
     */
    private DomainProcessingResult processWithDomainEngine(String query, StoreConfig config, List<Product> products) {
        String lower = query.toLowerCase();
        String storeName = config != null ? config.getStoreName() : "Merkostore";
        String deliveryFee = config != null && config.getDeliveryFee() != null ? formatMoney(config.getDeliveryFee()) : "3.000";
        String minOrder = config != null && config.getMinimumOrder() != null ? formatMoney(config.getMinimumOrder()) : "10.000";

        // Saludo
        if (lower.matches(".*(hola|buenos d[ií]as|buenas tardes|buenas noches|hey|saludos).*")) {
            return new DomainProcessingResult(
                    "👋 ¡Hola! Bienvenido a *" + storeName + "*. Soy **MerkoBot**, tu asesor de compras inteligente. " +
                    "¿En qué te puedo colaborar hoy? Puedes consultarme por productos, precios, ofertas del día o información de envíos.",
                    "GREETING",
                    Collections.emptyList()
            );
        }

        // Domicilios / Envíos
        if (lower.contains("domicilio") || lower.contains("envio") || lower.contains("envío") || lower.contains("cuanto tarda") || lower.contains("tiempo")) {
            return new DomainProcessingResult(
                    "🛵 **Información de Domicilios en " + storeName + ":**\n\n" +
                    "• **Tarifa fija:** $" + deliveryFee + " COP en el sector.\n" +
                    "• **Pedido mínimo:** $" + minOrder + " COP.\n" +
                    "• **Tiempo estimado:** Entre 15 y 25 minutos directo a tu puerta.\n" +
                    "• **¡Super Promo!** Por compras superiores a $30.000 COP tu envío es **GRATIS** hoy.",
                    "DELIVERY_INFO",
                    Collections.emptyList()
            );
        }

        // Métodos de pago
        if (lower.contains("pago") || lower.contains("pagar") || lower.contains("nequi") || lower.contains("daviplata") || lower.contains("efectivo") || lower.contains("tarjeta")) {
            return new DomainProcessingResult(
                    "💳 **Métodos de Pago Disponibles:**\n\n" +
                    "1. 📲 **Nequi y Daviplata:** Pagas en línea o al repartidor al recibir.\n" +
                    "2. 💵 **Efectivo / Contra-entrega:** Indícanos con cuánto vas a pagar para enviarte el cambio exacto.\n" +
                    "3. 💬 **WhatsApp Directo:** Coordina transferencias directas con Don Pedro.",
                    "PAYMENT_INFO",
                    Collections.emptyList()
            );
        }

        // Horarios o Dirección
        if (lower.contains("horario") || lower.contains("abierto") || lower.contains("hora") || lower.contains("donde estan") || lower.contains("direcci")) {
            String address = config != null && config.getAddress() != null ? config.getAddress() : "Calle 45 # 23 - 10 Barrio El Prado";
            return new DomainProcessingResult(
                    "📍 **Ubicación y Horarios:**\n\n" +
                    "• **Dirección:** " + address + "\n" +
                    "• **Horario:** Lunes a Domingo de 7:00 a.m. a 9:30 p.m. (Jornada continua).\n" +
                    "• **Estado actual:** " + (config != null && Boolean.TRUE.equals(config.getIsStoreOpen()) ? "🟢 ¡Estamos ABIERTOS y despachando!" : "🟡 Consúltanos por WhatsApp."),
                    "STORE_INFO",
                    Collections.emptyList()
            );
        }

        // Ofertas / Descuentos
        if (lower.contains("oferta") || lower.contains("descuento") || lower.contains("promocion") || lower.contains("promoción") || lower.contains("barato")) {
            List<Product> discounted = products.stream()
                    .filter(p -> p.getDiscountPrice() != null && p.getDiscountPrice().compareTo(BigDecimal.ZERO) > 0)
                    .limit(5)
                    .toList();

            if (!discounted.isEmpty()) {
                StringBuilder sb = new StringBuilder("🔥 **¡Ofertas destacadas del día en " + storeName + "!**\n\n");
                List<ChatResponse.ProductSummary> summaries = new ArrayList<>();
                for (Product p : discounted) {
                    sb.append("• **").append(p.getName()).append("**: Ahora a **$").append(formatMoney(p.getDiscountPrice()))
                            .append(" COP** (Antes: $").append(formatMoney(p.getPrice())).append(" COP) - Stock: ")
                            .append(p.getStock()).append(" ").append(p.getUnit()).append("\n");
                    summaries.add(toSummary(p));
                }
                sb.append("\n🛒 Puedes agregarlos directamente a tu carrito desde la tienda.");
                return new DomainProcessingResult(sb.toString(), "DISCOUNTS", summaries);
            }
        }

        // Búsqueda inteligente de productos en catálogo
        List<Product> matched = products.stream()
                .filter(p -> {
                    String pName = p.getName().toLowerCase();
                    String pDesc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                    String tags = p.getTags() != null ? String.join(" ", p.getTags()).toLowerCase() : "";
                    String[] words = lower.split("\\s+");
                    for (String w : words) {
                        if (w.length() >= 3 && (pName.contains(w) || pDesc.contains(w) || tags.contains(w))) {
                            return true;
                        }
                    }
                    return false;
                })
                .limit(4)
                .toList();

        if (!matched.isEmpty()) {
            StringBuilder sb = new StringBuilder("✨ **Encontré estos productos para ti:**\n\n");
            List<ChatResponse.ProductSummary> summaries = new ArrayList<>();
            for (Product p : matched) {
                BigDecimal finalPrice = p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice();
                sb.append("• **").append(p.getName()).append("**: $").append(formatMoney(finalPrice))
                        .append(" COP | ").append(p.getStock() > 0 ? "✅ En Stock (" + p.getStock() + " " + p.getUnit() + ")" : "❌ Agotado")
                        .append("\n");
                summaries.add(toSummary(p));
            }
            sb.append("\n¿Deseas que agregue alguno de estos a tu pedido o necesitas más detalles?");
            return new DomainProcessingResult(sb.toString(), "PRODUCT_SEARCH", summaries);
        }

        // Respuesta por defecto con asistencia guiada
        return new DomainProcessingResult(
                "Entiendo tu consulta sobre *" + query + "*. En *" + storeName + "* tenemos una amplia variedad de abarrotes, lácteos, bebidas, aseo y panadería.\n\n" +
                "💡 Puedes preguntarme por precios de productos (ej: *'precio del arroz'*, *'leche'*, *'huevos'*), el costo del domicilio, métodos de pago o promociones activas.",
                "DEFAULT_FALLBACK",
                Collections.emptyList()
        );
    }

    private ChatResponse.ProductSummary toSummary(Product p) {
        return ChatResponse.ProductSummary.builder()
                .id(p.getId())
                .name(p.getName())
                .price(p.getPrice())
                .discountPrice(p.getDiscountPrice())
                .stock(p.getStock())
                .unit(p.getUnit())
                .imageUrl(p.getImageUrl())
                .build();
    }

    private List<String> generateSuggestions(String intent, List<Product> products) {
        return switch (intent) {
            case "GREETING" -> List.of("🔥 Ver ofertas del día", "🥛 Consultar lácteos", "🛵 ¿Cuánto cuesta el envío?");
            case "DELIVERY_INFO" -> List.of("💳 ¿Cómo puedo pagar?", "⏰ ¿Cuál es el horario?", "🛒 Ver catálogo completo");
            case "PAYMENT_INFO" -> List.of("🛵 ¿Cuánto tarda el domicilio?", "📦 Pedir por WhatsApp", "🔥 Promociones de hoy");
            case "DISCOUNTS", "PRODUCT_SEARCH" -> List.of("🛵 Pedir a domicilio", "💳 Métodos de pago", "🥚 ¿Tienen huevos?");
            default -> List.of("🔥 Ofertas de hoy", "🥛 Precios de leche", "🛵 Costo de envío", "💳 Métodos de pago");
        };
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) return "0";
        NumberFormat nf = NumberFormat.getInstance(new Locale("es", "CO"));
        return nf.format(amount);
    }

    private record DomainProcessingResult(String reply, String intent, List<ChatResponse.ProductSummary> matchedProducts) {}
}
