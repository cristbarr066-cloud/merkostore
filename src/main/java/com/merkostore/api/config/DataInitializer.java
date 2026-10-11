package com.merkostore.api.config;

import com.merkostore.api.models.Category;
import com.merkostore.api.models.Order;
import com.merkostore.api.models.Product;
import com.merkostore.api.models.StoreConfig;
import com.merkostore.api.models.User;
import com.merkostore.api.repositories.CategoryRepository;
import com.merkostore.api.repositories.OrderRepository;
import com.merkostore.api.repositories.ProductRepository;
import com.merkostore.api.repositories.StoreConfigRepository;
import com.merkostore.api.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final StoreConfigRepository storeConfigRepository;
    private final OrderRepository orderRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        seedAdminUser();
        seedStoreConfig();
        seedCategoriesAndProducts();
        seedSampleOrders();
    }

    private void seedAdminUser() {
        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("1212"))
                    .name("Administrador Merkostore")
                    .email("admin@merkostore.com")
                    .role("ROLE_ADMIN")
                    .storeId("default-store")
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .build();
            userRepository.save(admin);
            System.out.println("✅ Usuario admin inicial creado (admin / 1212)");
        }
    }

    private void seedStoreConfig() {
        if (storeConfigRepository.findByStoreId("default-store").isEmpty()) {
            StoreConfig config = StoreConfig.builder()
                    .storeId("default-store")
                    .storeName("Don Pedro - Tienda de Barrio")
                    .whatsappPhone("573001234567")
                    .address("Calle 45 # 23 - 10 Barrio El Prado")
                    .deliveryFee(new BigDecimal("3000"))
                    .minimumOrder(new BigDecimal("10000"))
                    .isStoreOpen(true)
                    .enabledPaymentMethods(List.of("WHATSAPP", "CASH", "NEQUI"))
                    .build();
            storeConfigRepository.save(config);
            System.out.println("✅ Configuración de tienda inicial sembrada.");
        }
    }

    private void seedCategoriesAndProducts() {
        if (categoryRepository.count() == 0) {
            Category cat1 = Category.builder().id("cat1").storeId("default-store").name("🔴 Precios Rojos").slug("precios-rojos").icon("🏷️").displayOrder(1).isActive(true).build();
            Category cat2 = Category.builder().id("cat2").storeId("default-store").name("🥛 Lácteos y Huevos").slug("lacteos-huevos").icon("🥛").displayOrder(2).isActive(true).build();
            Category cat3 = Category.builder().id("cat3").storeId("default-store").name("🍺 Cervezas y Bebidas").slug("cervezas-bebidas").icon("🍺").displayOrder(3).isActive(true).build();
            Category cat4 = Category.builder().id("cat4").storeId("default-store").name("🌾 Abarrotes y Granos").slug("abarrotes-granos").icon("🌾").displayOrder(4).isActive(true).build();
            Category cat5 = Category.builder().id("cat5").storeId("default-store").name("🧼 Cuidado Personal").slug("cuidado-personal").icon("🧼").displayOrder(5).isActive(true).build();

            categoryRepository.saveAll(List.of(cat1, cat2, cat3, cat4, cat5));
            System.out.println("✅ Categorías iniciales sembradas.");
        }

        if (productRepository.count() < 5) {
            Product p1 = Product.builder()
                    .id("p1")
                    .storeId("default-store")
                    .categoryId("cat2")
                    .sku("HUE-001")
                    .name("Huevo Kikes Rojo AA X30 Unds")
                    .description("Cubeta de huevos frescos AA x 30 unidades")
                    .costPrice(new BigDecimal("13500"))
                    .price(new BigDecimal("24500"))
                    .discountPrice(new BigDecimal("14700"))
                    .unit("UND")
                    .stock(35)
                    .minStockAlert(10)
                    .imageUrl("https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=500")
                    .isAvailable(true)
                    .isFeatured(true)
                    .updatedAt(LocalDateTime.now())
                    .build();

            Product p2 = Product.builder()
                    .id("p2")
                    .storeId("default-store")
                    .categoryId("cat4")
                    .sku("CAF-002")
                    .name("Café Sello Rojo 425g")
                    .description("Café molido tradicional de Colombia")
                    .costPrice(new BigDecimal("16500"))
                    .price(new BigDecimal("21990"))
                    .unit("UND")
                    .stock(20)
                    .minStockAlert(5)
                    .imageUrl("https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500")
                    .isAvailable(true)
                    .isFeatured(false)
                    .updatedAt(LocalDateTime.now())
                    .build();

            Product p3 = Product.builder()
                    .id("p3")
                    .storeId("default-store")
                    .categoryId("cat4")
                    .sku("PAN-003")
                    .name("Harina Pan De Maíz Blanco 1 Kg")
                    .description("Harina de maíz blanco precocida")
                    .costPrice(new BigDecimal("2800"))
                    .price(new BigDecimal("4800"))
                    .discountPrice(new BigDecimal("3600"))
                    .unit("KG")
                    .stock(50)
                    .minStockAlert(15)
                    .imageUrl("https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500")
                    .isAvailable(true)
                    .isFeatured(true)
                    .updatedAt(LocalDateTime.now())
                    .build();

            Product p4 = Product.builder()
                    .id("p4")
                    .storeId("default-store")
                    .categoryId("cat4")
                    .sku("ACE-004")
                    .name("Aceite Medalla De Oro Mezcla 3 Lt")
                    .description("Aceite vegetal de cocina para freír y preparar")
                    .costPrice(new BigDecimal("14200"))
                    .price(new BigDecimal("19490"))
                    .unit("LT")
                    .stock(14)
                    .minStockAlert(5)
                    .imageUrl("https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500")
                    .isAvailable(true)
                    .isFeatured(false)
                    .updatedAt(LocalDateTime.now())
                    .build();

            Product p5 = Product.builder()
                    .id("p5")
                    .storeId("default-store")
                    .categoryId("cat4")
                    .sku("AZU-005")
                    .name("Azúcar Blanca 2.5 Kg")
                    .description("Azúcar blanca refinada de alta pureza")
                    .costPrice(new BigDecimal("7200"))
                    .price(new BigDecimal("9900"))
                    .unit("PAQ")
                    .stock(28)
                    .minStockAlert(6)
                    .imageUrl("https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=500")
                    .isAvailable(true)
                    .isFeatured(false)
                    .updatedAt(LocalDateTime.now())
                    .build();

            Product p6 = Product.builder()
                    .id("p6")
                    .storeId("default-store")
                    .categoryId("cat3")
                    .sku("CER-006")
                    .name("Cerveza Club Colombia Dorada 330ml x6")
                    .description("Sixpack de cerveza Club Colombia Dorada helada")
                    .costPrice(new BigDecimal("18000"))
                    .price(new BigDecimal("24900"))
                    .discountPrice(new BigDecimal("21500"))
                    .unit("PAQ")
                    .stock(15)
                    .minStockAlert(5)
                    .imageUrl("https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500")
                    .isAvailable(true)
                    .isFeatured(true)
                    .updatedAt(LocalDateTime.now())
                    .build();

            Product m1 = Product.builder()
                    .id("m1")
                    .storeId("default-store")
                    .categoryId("cat4")
                    .sku("MER-001")
                    .name("Mercado Familiar Esencial")
                    .description("Combo 5 Productos Detal para el hogar")
                    .costPrice(new BigDecimal("32000"))
                    .price(new BigDecimal("54000"))
                    .discountPrice(new BigDecimal("44900"))
                    .unit("COMBO")
                    .stock(14)
                    .minStockAlert(3)
                    .imageUrl("https://images.unsplash.com/photo-1542838132-92c53300491e?w=500")
                    .isAvailable(true)
                    .isFeatured(true)
                    .updatedAt(LocalDateTime.now())
                    .build();

            Product m2 = Product.builder()
                    .id("m2")
                    .storeId("default-store")
                    .categoryId("cat2")
                    .sku("MER-002")
                    .name("Mercado Desayuno Completo")
                    .description("Combo 3 Productos Desayuno con café y huevos")
                    .costPrice(new BigDecimal("24000"))
                    .price(new BigDecimal("39900"))
                    .discountPrice(new BigDecimal("34500"))
                    .unit("COMBO")
                    .stock(20)
                    .minStockAlert(3)
                    .imageUrl("https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500")
                    .isAvailable(true)
                    .isFeatured(true)
                    .updatedAt(LocalDateTime.now())
                    .build();

            productRepository.saveAll(List.of(p1, p2, p3, p4, p5, p6, m1, m2));
            System.out.println("✅ Catálogo de productos completo sembrado.");
        }
    }

    private void seedSampleOrders() {
        if (orderRepository.count() == 0) {
            List<Product> products = productRepository.findByStoreId("default-store");
            if (products.isEmpty()) return;

            Random random = new Random();
            List<Order> sampleOrders = new ArrayList<>();

            String[] customerNames = {
                    "María Camila Rodríguez", "Carlos Eduardo Gómez", "Ana Lucía Torres",
                    "Javier Fernández", "Dra. Sofía Martínez", "Roberto Restrepo",
                    "Valentina Mendoza", "Jorge Isaacs"
            };
            String[] customerPhones = {
                    "3001234567", "3159876543", "3204567890", "3118765432",
                    "3046543210", "3173332211", "3007778899", "3185554433"
            };
            String[] addresses = {
                    "Calle 45 # 23-10 Ap 302", "Carrera 15 # 88-14", "Diagonal 65 # 12-40",
                    "Avenida 3N # 45-20", "Transversal 9 # 100-15", "Calle 10 # 5-30",
                    "Carrera 50 # 70-12", "Calle 80 # 11-25"
            };

            LocalDateTime now = LocalDateTime.now();

            // Generar 25 pedidos en los últimos 30 días
            for (int i = 1; i <= 25; i++) {
                int daysAgo = random.nextInt(30);
                int hoursAgo = random.nextInt(12);
                LocalDateTime orderDate = now.minusDays(daysAgo).minusHours(hoursAgo);

                int custIdx = random.nextInt(customerNames.length);
                Product mainProd = products.get(random.nextInt(products.size()));
                int qty1 = 1 + random.nextInt(3);
                BigDecimal price1 = mainProd.getDiscountPrice() != null ? mainProd.getDiscountPrice() : mainProd.getPrice();
                BigDecimal sub1 = price1.multiply(BigDecimal.valueOf(qty1));

                List<Order.OrderItem> items = new ArrayList<>();
                items.add(Order.OrderItem.builder()
                        .productId(mainProd.getId())
                        .productName(mainProd.getName())
                        .quantity(qty1)
                        .unitPrice(price1)
                        .subtotal(sub1)
                        .build());

                BigDecimal subtotal = sub1;

                // 50% de probabilidad de agregar un segundo ítem
                if (products.size() > 1 && random.nextBoolean()) {
                    Product secondProd = products.get((products.indexOf(mainProd) + 1) % products.size());
                    int qty2 = 1 + random.nextInt(2);
                    BigDecimal price2 = secondProd.getDiscountPrice() != null ? secondProd.getDiscountPrice() : secondProd.getPrice();
                    BigDecimal sub2 = price2.multiply(BigDecimal.valueOf(qty2));
                    items.add(Order.OrderItem.builder()
                            .productId(secondProd.getId())
                            .productName(secondProd.getName())
                            .quantity(qty2)
                            .unitPrice(price2)
                            .subtotal(sub2)
                            .build());
                    subtotal = subtotal.add(sub2);
                }

                BigDecimal deliveryFee = subtotal.compareTo(new BigDecimal("30000")) >= 0 ? BigDecimal.ZERO : new BigDecimal("3000");
                BigDecimal total = subtotal.add(deliveryFee);

                Order.OrderStatus status = Order.OrderStatus.DELIVERED;
                if (i == 1 || i == 2) status = Order.OrderStatus.RECEIVED;
                else if (i == 3) status = Order.OrderStatus.PREPARING;
                else if (i == 4) status = Order.OrderStatus.READY;

                Order.PaymentStatus payStatus = (status == Order.OrderStatus.DELIVERED) ? Order.PaymentStatus.PAID : Order.PaymentStatus.PENDING;

                Order order = Order.builder()
                        .orderNumber("MS-" + (1000 + i) + "-2026")
                        .storeId("default-store")
                        .customer(Order.CustomerInfo.builder()
                                .name(customerNames[custIdx])
                                .phone(customerPhones[custIdx])
                                .deliveryAddress(addresses[custIdx])
                                .notes("Entregar con cuidado en portería")
                                .build())
                        .items(items)
                        .fulfillmentType(i % 3 == 0 ? Order.FulfillmentType.PICKUP : Order.FulfillmentType.DELIVERY)
                        .deliveryFee(deliveryFee)
                        .subtotal(subtotal)
                        .total(total)
                        .paymentMethod(i % 2 == 0 ? "WHATSAPP" : "NEQUI")
                        .paymentStatus(payStatus)
                        .orderStatus(status)
                        .createdAt(orderDate)
                        .build();

                sampleOrders.add(order);
            }

            orderRepository.saveAll(sampleOrders);
            System.out.println("✅ 25 pedidos históricos de prueba sembrados en la base operacional.");
        }
    }
}

