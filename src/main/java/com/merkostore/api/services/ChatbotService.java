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

        // 2. Obtener contexto de negocio en tiempo real (RAG Liviano conectado a los productos reales)
        StoreConfig storeConfig = resolveStoreConfig(request, storeId);
        List<Product> availableProducts = resolveAvailableProducts(request, storeId);

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

        // 4. Si no hay LLM configurado o falló, procesar con Motor Experto de Dominio conectado a la tienda real
        if (botReply == null || botReply.isBlank()) {
            DomainProcessingResult result = processWithDomainEngine(userText, storeConfig, availableProducts);
            botReply = result.reply;
            detectedIntent = result.intent;
            matchedSummaries = result.matchedProducts;
        }

        // 5. Generar sugerencias dinámicas basadas EXCLUSIVAMENTE en los productos reales del negocio
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
        List<Product> prods = productRepository.findByStoreIdAndIsAvailableTrue("default-store");
        return generateSuggestions("GREETING", prods);
    }

    private StoreConfig resolveStoreConfig(ChatRequest request, String storeId) {
        if (request.getStoreConfig() != null) {
            ChatRequest.StoreConfigContext c = request.getStoreConfig();
            return StoreConfig.builder()
                    .storeId(storeId)
                    .storeName(c.getStoreName() != null ? c.getStoreName() : "Don Pedro - Tienda de Barrio")
                    .whatsappPhone(c.getWhatsappPhone() != null ? c.getWhatsappPhone() : "573001234567")
                    .address(c.getAddress() != null ? c.getAddress() : "Calle 45 # 23 - 10 Barrio El Prado")
                    .deliveryFee(c.getDeliveryFee() != null ? c.getDeliveryFee() : new BigDecimal("3000"))
                    .minimumOrder(c.getMinimumOrder() != null ? c.getMinimumOrder() : new BigDecimal("10000"))
                    .isStoreOpen(c.getIsStoreOpen() != null ? c.getIsStoreOpen() : true)
                    .build();
        }
        return storeConfigRepository.findByStoreId(storeId).orElseGet(() -> StoreConfig.builder()
                .storeId(storeId)
                .storeName("Don Pedro - Tienda de Barrio")
                .whatsappPhone("573001234567")
                .address("Calle 45 # 23 - 10 Barrio El Prado")
                .deliveryFee(new BigDecimal("3000"))
                .minimumOrder(new BigDecimal("10000"))
                .isStoreOpen(true)
                .build());
    }

    private List<Product> resolveAvailableProducts(ChatRequest request, String storeId) {
        // Si el cliente envía el catálogo activo en tiempo real (directamente sincronizado con el negocio/UI)
        if (request.getCurrentCatalog() != null && !request.getCurrentCatalog().isEmpty()) {
            return request.getCurrentCatalog().stream()
                    .filter(item -> item.getIsAvailable() == null || Boolean.TRUE.equals(item.getIsAvailable()))
                    .<Product>map(item -> Product.builder()
                            .id(item.getId())
                            .name(item.getName())
                            .description(item.getDescription())
                            .price(item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO)
                            .discountPrice(item.getDiscountPrice())
                            .stock(item.getStock() != null ? item.getStock() : 1)
                            .unit(item.getUnit() != null ? item.getUnit() : "UND")
                            .categoryId(item.getCategory() != null ? item.getCategory() : "cat1")
                            .imageUrl(item.getImageUrl())
                            .isAvailable(true)
                            .storeId(storeId)
                            .build())
                    .toList();
        }
        // De lo contrario, usar MongoDB
        return productRepository.findByStoreIdAndIsAvailableTrue(storeId);
    }

    private void saveMessage(String conversationId, String storeId, String role, String content, String intent) {
        try {
            ChatMessage msg = ChatMessage.builder()
                    .conversationId(conversationId)
                    .storeId(storeId)
                    .role(role)
                    .content(content)
                    .intent(intent)
                    .timestamp(LocalDateTime.now())
                    .build();
            chatMessageRepository.save(msg);
        } catch (Exception e) {
            log.error("Error al persistir mensaje de chat: {}", e.getMessage());
        }
    }

    private String callGroqLlm(String userText, StoreConfig config, List<Product> products, String conversationId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        String catalogSummary = products.stream()
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
                "Eres MerkoBot, el asistente inteligente y amigable de la tienda '%s'. " +
                "Tu objetivo es ayudar a los clientes a consultar productos reales, precios, ofertas, " +
                "y resolver dudas de domicilios.\n\n" +
                "REGLAS ESTRICTAS DE NEGOCIO:\n" +
                "1. Responde de manera cálida, colombiana y profesional, con emojis adecuados.\n" +
                "2. El domicilio cuesta $%s COP y el pedido mínimo es $%s COP.\n" +
                "3. Métodos de pago: WhatsApp, Nequi, Daviplata y Efectivo Contra-entrega.\n" +
                "4. CATÁLOGO REAL EN TIEMPO REAL (ESTOS SON LOS ÚNICOS PRODUCTOS QUE EXISTEN EN LA TIENDA):\n%s\n\n" +
                "5. ¡REGLA CRÍTICA! NUNCA inventes productos ni marcas que no estén en la lista anterior. Si el cliente pregunta por un producto que NO está en la lista (por ejemplo, si pregunta por algo que no vendemos), indícale amablemente que en este momento no lo tenemos disponible en el inventario de %s y sugiérele los productos que SÍ tenemos.\n" +
                "6. Sé conciso y claro.",
                storeName, deliveryFee, minOrder, catalogSummary, storeName
        );

        Map<String, Object> systemMessage = Map.of("role", "system", "content", systemPrompt);
        Map<String, Object> userMessage = Map.of("role", "user", "content", userText);

        Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(systemMessage, userMessage),
                "temperature", 0.4,
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
     * Motor Experto de Dominio Autónomo para Merkostore (Garantiza disponibilidad y fidelidad con los productos reales)
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
                    "¿En qué te puedo colaborar hoy? Puedes consultarme por nuestros productos en inventario, precios, ofertas del día o información de envíos.",
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
                    "• **¡Envío Gratis!** Por compras superiores a $30.000 COP tu envío es sin costo.",
                    "DELIVERY_INFO",
                    Collections.emptyList()
            );
        }

        // Métodos de pago
        if (lower.contains("pago") || lower.contains("pagar") || lower.contains("nequi") || lower.contains("daviplata") || lower.contains("efectivo") || lower.contains("tarjeta")) {
            return new DomainProcessingResult(
                    "💳 **Métodos de Pago Disponibles en " + storeName + ":**\n\n" +
                    "1. 📲 **Nequi y Daviplata:** Pagas en línea o al repartidor al recibir.\n" +
                    "2. 💵 **Efectivo / Contra-entrega:** Indícanos con cuánto vas a pagar para enviarte el cambio exacto.\n" +
                    "3. 💬 **WhatsApp Directo:** Coordina pedidos y transferencias directamente.",
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
                    "• **Estado actual:** " + (config != null && Boolean.TRUE.equals(config.getIsStoreOpen()) ? "🟢 ¡Estamos ABIERTOS y atendiendo pedidos!" : "🟡 Consúltanos por WhatsApp."),
                    "STORE_INFO",
                    Collections.emptyList()
            );
        }

        // Ofertas / Descuentos REALES
        if (lower.contains("oferta") || lower.contains("descuento") || lower.contains("promocion") || lower.contains("promoción") || lower.contains("barato")) {
            List<Product> discounted = products.stream()
                    .filter(p -> p.getDiscountPrice() != null && p.getDiscountPrice().compareTo(BigDecimal.ZERO) > 0)
                    .limit(4)
                    .toList();

            if (!discounted.isEmpty()) {
                StringBuilder sb = new StringBuilder("🔥 **¡Ofertas destacadas activas en " + storeName + "!**\n\n");
                List<ChatResponse.ProductSummary> summaries = new ArrayList<>();
                for (Product p : discounted) {
                    sb.append("• **").append(p.getName()).append("**: Ahora a **$").append(formatMoney(p.getDiscountPrice()))
                            .append(" COP** (Antes: $").append(formatMoney(p.getPrice())).append(" COP)\n");
                    summaries.add(toSummary(p));
                }
                sb.append("\n🛒 Puedes agregarlos directamente a tu carrito desde las tarjetas de abajo.");
                return new DomainProcessingResult(sb.toString(), "DISCOUNTS", summaries);
            }
        }

        // Búsqueda inteligente de productos en el catálogo real
        List<Product> matched = products.stream()
                .filter(p -> {
                    String pName = p.getName().toLowerCase();
                    String pDesc = p.getDescription() != null ? p.getDescription().toLowerCase() : "";
                    String[] words = lower.split("\\s+");
                    for (String w : words) {
                        if (w.length() >= 3 && (pName.contains(w) || pDesc.contains(w))) {
                            return true;
                        }
                    }
                    return false;
                })
                .limit(4)
                .toList();

        if (!matched.isEmpty()) {
            StringBuilder sb = new StringBuilder("✨ **Encontré estos productos disponibles para ti en " + storeName + ":**\n\n");
            List<ChatResponse.ProductSummary> summaries = new ArrayList<>();
            for (Product p : matched) {
                BigDecimal finalPrice = p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice();
                sb.append("• **").append(p.getName()).append("**: $").append(formatMoney(finalPrice))
                        .append(" COP | ").append((p.getStock() != null && p.getStock() > 0) ? "✅ En Stock (" + p.getStock() + " " + p.getUnit() + ")" : "❌ Agotado")
                        .append("\n");
                summaries.add(toSummary(p));
            }
            sb.append("\n¿Deseas que agregue alguno de estos a tu pedido o necesitas más detalles?");
            return new DomainProcessingResult(sb.toString(), "PRODUCT_SEARCH", summaries);
        }

        // Si el cliente preguntó por un producto que NO está en el catálogo real
        StringBuilder notFound = new StringBuilder();
        notFound.append("En este momento no contamos con ese producto en el inventario disponible de **").append(storeName).append("**.\n\n");
        notFound.append("📦 **Los productos que sí tenemos disponibles hoy son:**\n");
        
        List<Product> sampleProducts = products.stream().limit(6).toList();
        for (Product p : sampleProducts) {
            BigDecimal finalPrice = p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice();
            notFound.append("• **").append(p.getName()).append("**: $").append(formatMoney(finalPrice)).append(" COP\n");
        }
        notFound.append("\n¿Te gustaría consultar o pedir alguno de estos productos?");

        return new DomainProcessingResult(
                notFound.toString(),
                "PRODUCT_NOT_FOUND",
                Collections.emptyList()
        );
    }

    private ChatResponse.ProductSummary toSummary(Product p) {
        return ChatResponse.ProductSummary.builder()
                .id(p.getId())
                .name(p.getName())
                .price(p.getDiscountPrice() != null ? p.getDiscountPrice() : p.getPrice())
                .discountPrice(p.getDiscountPrice())
                .stock(p.getStock())
                .unit(p.getUnit())
                .imageUrl(p.getImageUrl())
                .build();
    }

    private List<String> generateSuggestions(String intent, List<Product> products) {
        List<String> dynamicSuggestions = new ArrayList<>();

        if (products != null && !products.isEmpty()) {
            // Producto en descuento real
            products.stream()
                    .filter(p -> p.getDiscountPrice() != null && p.getDiscountPrice().compareTo(BigDecimal.ZERO) > 0)
                    .findFirst()
                    .ifPresent(p -> dynamicSuggestions.add("🔥 Oferta: " + p.getName()));

            // Primeros 2 productos disponibles en stock
            products.stream()
                    .filter(p -> p.getStock() != null && p.getStock() > 0)
                    .limit(2)
                    .forEach(p -> dynamicSuggestions.add("💲 Precio de " + p.getName()));
        }

        // Sugerencias fijas del negocio
        dynamicSuggestions.add("🛵 ¿Cuánto vale el domicilio?");
        dynamicSuggestions.add("💳 Métodos de pago");
        dynamicSuggestions.add("⏰ Horario de atención");

        return dynamicSuggestions.stream().distinct().limit(6).toList();
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) return "0";
        NumberFormat nf = NumberFormat.getInstance(new Locale("es", "CO"));
        return nf.format(amount);
    }

    private record DomainProcessingResult(String reply, String intent, List<ChatResponse.ProductSummary> matchedProducts) {}
}
