package com.merkostore.api.controllers;

import com.merkostore.api.dtos.ApiResponse;
import com.merkostore.api.exceptions.ResourceNotFoundException;
import com.merkostore.api.models.Category;
import com.merkostore.api.models.FinancialTransaction;
import com.merkostore.api.models.Order;
import com.merkostore.api.models.Product;
import com.merkostore.api.models.StoreConfig;
import com.merkostore.api.models.User;
import com.merkostore.api.repositories.CategoryRepository;
import com.merkostore.api.repositories.FinancialTransactionRepository;
import com.merkostore.api.repositories.OrderRepository;
import com.merkostore.api.repositories.ProductRepository;
import com.merkostore.api.repositories.StoreConfigRepository;
import com.merkostore.api.repositories.UserRepository;
import com.merkostore.api.services.OrderService;
import jakarta.validation.Valid;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminDashboardController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;
    private final FinancialTransactionRepository financialRepository;
    private final StoreConfigRepository storeConfigRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrderService orderService;
    private final MongoTemplate mongoTemplate;

    // ==========================================
    // 1. DASHBOARD METRICS & CONFIG
    // ==========================================

    @GetMapping("/dashboard/metrics")
    public ResponseEntity<ApiResponse<DashboardMetrics>> getMetrics(@RequestParam(defaultValue = "default-store") String storeId) {
        Query activeOrdersQuery = Query.query(Criteria.where("storeId").is(storeId)
                .and("orderStatus").in(Order.OrderStatus.RECEIVED, Order.OrderStatus.PREPARING, Order.OrderStatus.READY));
        long activeOrdersCount = mongoTemplate.count(activeOrdersQuery, Order.class);

        Query totalOrdersQuery = Query.query(Criteria.where("storeId").is(storeId));
        long totalOrdersCount = mongoTemplate.count(totalOrdersQuery, Order.class);

        Aggregation salesAggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("storeId").is(storeId).and("orderStatus").ne(Order.OrderStatus.CANCELLED)),
                Aggregation.group().sum("total").as("totalSales")
        );
        AggregationResults<Map> salesResult = mongoTemplate.aggregate(salesAggregation, "orders", Map.class);
        BigDecimal totalSales = BigDecimal.ZERO;
        if (!salesResult.getMappedResults().isEmpty() && salesResult.getMappedResults().get(0).get("totalSales") != null) {
            Object rawTotal = salesResult.getMappedResults().get(0).get("totalSales");
            if (rawTotal instanceof Number) {
                totalSales = BigDecimal.valueOf(((Number) rawTotal).doubleValue());
            }
        }

        Query recentOrdersQuery = Query.query(Criteria.where("storeId").is(storeId))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .limit(10);
        List<Order> recentOrders = mongoTemplate.find(recentOrdersQuery, Order.class);

        Query recentTxQuery = Query.query(Criteria.where("storeId").is(storeId))
                .with(Sort.by(Sort.Direction.DESC, "date"))
                .limit(10);
        List<FinancialTransaction> recentTransactions = mongoTemplate.find(recentTxQuery, FinancialTransaction.class);

        DashboardMetrics metrics = DashboardMetrics.builder()
                .totalSales(totalSales)
                .totalOrdersCount(totalOrdersCount)
                .activeOrdersCount(activeOrdersCount)
                .recentTransactions(recentTransactions)
                .recentOrders(recentOrders)
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Métricas del tablero recuperadas con éxito", metrics));
    }

    @GetMapping("/store-config")
    public ResponseEntity<ApiResponse<StoreConfig>> getStoreConfig(@RequestParam(defaultValue = "default-store") String storeId) {
        StoreConfig config = storeConfigRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    StoreConfig defaultConfig = StoreConfig.builder()
                            .storeId(storeId)
                            .storeName("Don Pedro - Tienda de Barrio")
                            .whatsappPhone("573001234567")
                            .address("Calle 45 # 23 - 10 Barrio El Prado")
                            .deliveryFee(new BigDecimal("3000"))
                            .minimumOrder(new BigDecimal("10000"))
                            .isStoreOpen(true)
                            .enabledPaymentMethods(List.of("WHATSAPP", "CASH", "NEQUI"))
                            .build();
                    return storeConfigRepository.save(defaultConfig);
                });
        return ResponseEntity.ok(ApiResponse.ok("Configuración de tienda recuperada", config));
    }

    @PutMapping("/store-config")
    public ResponseEntity<ApiResponse<StoreConfig>> updateStoreConfig(@RequestBody StoreConfig config) {
        if (config.getStoreId() == null || config.getStoreId().isEmpty()) {
            config.setStoreId("default-store");
        }
        StoreConfig saved = storeConfigRepository.save(config);
        return ResponseEntity.ok(ApiResponse.ok("Configuración actualizada con éxito", saved));
    }

    // ==========================================
    // 2. PRODUCT MANAGEMENT (CRUD)
    // ==========================================

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<Product>>> getAllProductsAdmin(@RequestParam(defaultValue = "default-store") String storeId) {
        List<Product> products = productRepository.findByStoreId(storeId);
        return ResponseEntity.ok(ApiResponse.ok("Lista completa de productos", products));
    }

    @PostMapping("/products")
    public ResponseEntity<ApiResponse<Product>> createProduct(@Valid @RequestBody Product product) {
        if (product.getStoreId() == null || product.getStoreId().isEmpty()) {
            product.setStoreId("default-store");
        }
        if (product.getIsAvailable() == null) product.setIsAvailable(true);
        product.setUpdatedAt(LocalDateTime.now());

        Product saved = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Producto creado exitosamente", saved));
    }

    @PutMapping("/products/{productId}")
    public ResponseEntity<ApiResponse<Product>> updateProduct(@PathVariable String productId, @Valid @RequestBody Product updatedData) {
        return productRepository.findById(productId)
                .map(product -> {
                    product.setName(updatedData.getName());
                    product.setDescription(updatedData.getDescription());
                    product.setCategoryId(updatedData.getCategoryId());
                    product.setSku(updatedData.getSku());
                    product.setCostPrice(updatedData.getCostPrice());
                    product.setPrice(updatedData.getPrice());
                    product.setDiscountPrice(updatedData.getDiscountPrice());
                    product.setUnit(updatedData.getUnit());
                    product.setStock(updatedData.getStock());
                    product.setMinStockAlert(updatedData.getMinStockAlert());
                    product.setImageUrl(updatedData.getImageUrl());
                    if (updatedData.getIsAvailable() != null) product.setIsAvailable(updatedData.getIsAvailable());
                    if (updatedData.getIsFeatured() != null) product.setIsFeatured(updatedData.getIsFeatured());
                    product.setUpdatedAt(LocalDateTime.now());

                    Product saved = productRepository.save(product);
                    return ResponseEntity.ok(ApiResponse.ok("Producto actualizado exitosamente", saved));
                })
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con ID: " + productId));
    }

    @PatchMapping("/products/{productId}/toggle-availability")
    public ResponseEntity<ApiResponse<Product>> toggleProductAvailability(@PathVariable String productId) {
        return productRepository.findById(productId)
                .map(product -> {
                    product.setIsAvailable(!Boolean.TRUE.equals(product.getIsAvailable()));
                    product.setUpdatedAt(LocalDateTime.now());
                    Product saved = productRepository.save(product);
                    return ResponseEntity.ok(ApiResponse.ok("Estado de disponibilidad cambiado a: " + saved.getIsAvailable(), saved));
                })
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con ID: " + productId));
    }

    @DeleteMapping("/products/{productId}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable String productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Producto no encontrado con ID: " + productId);
        }
        productRepository.deleteById(productId);
        return ResponseEntity.ok(ApiResponse.ok("Producto eliminado correctamente", null));
    }

    // ==========================================
    // 3. CATEGORY MANAGEMENT (CRUD)
    // ==========================================

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<Category>>> getAllCategoriesAdmin(@RequestParam(defaultValue = "default-store") String storeId) {
        List<Category> categories = categoryRepository.findByStoreId(storeId);
        return ResponseEntity.ok(ApiResponse.ok("Lista completa de categorías", categories));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<Category>> createCategory(@Valid @RequestBody Category category) {
        if (category.getStoreId() == null || category.getStoreId().isEmpty()) {
            category.setStoreId("default-store");
        }
        if (category.getIsActive() == null) category.setIsActive(true);
        Category saved = categoryRepository.save(category);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Categoría creada con éxito", saved));
    }

    @PutMapping("/categories/{categoryId}")
    public ResponseEntity<ApiResponse<Category>> updateCategory(@PathVariable String categoryId, @Valid @RequestBody Category updatedData) {
        return categoryRepository.findById(categoryId)
                .map(cat -> {
                    cat.setName(updatedData.getName());
                    cat.setSlug(updatedData.getSlug());
                    cat.setIcon(updatedData.getIcon());
                    cat.setDisplayOrder(updatedData.getDisplayOrder());
                    if (updatedData.getIsActive() != null) cat.setIsActive(updatedData.getIsActive());
                    Category saved = categoryRepository.save(cat);
                    return ResponseEntity.ok(ApiResponse.ok("Categoría actualizada con éxito", saved));
                })
                .orElseThrow(() -> new ResourceNotFoundException("Categoría no encontrada con ID: " + categoryId));
    }

    @DeleteMapping("/categories/{categoryId}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable String categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException("Categoría no encontrada con ID: " + categoryId);
        }
        categoryRepository.deleteById(categoryId);
        return ResponseEntity.ok(ApiResponse.ok("Categoría eliminada con éxito", null));
    }

    // ==========================================
    // 4. ORDER MANAGEMENT
    // ==========================================

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<Order>>> getAllOrdersAdmin(@RequestParam(defaultValue = "default-store") String storeId) {
        List<Order> orders = orderRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
        return ResponseEntity.ok(ApiResponse.ok("Lista de pedidos recuperada", orders));
    }

    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<ApiResponse<Order>> updateOrderStatus(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isEmpty()) {
            throw new IllegalArgumentException("El campo 'status' es obligatorio");
        }
        Order updatedOrder = orderService.updateOrderStatus(orderId, newStatus);
        return ResponseEntity.ok(ApiResponse.ok("Estado del pedido actualizado a " + newStatus, updatedOrder));
    }

    @PatchMapping("/orders/{orderId}/payment-status")
    public ResponseEntity<ApiResponse<Order>> updatePaymentStatus(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body) {
        String newPaymentStatus = body.get("paymentStatus");
        if (newPaymentStatus == null || newPaymentStatus.isEmpty()) {
            throw new IllegalArgumentException("El campo 'paymentStatus' es obligatorio");
        }

        return orderRepository.findById(orderId)
                .map(order -> {
                    order.setPaymentStatus(Order.PaymentStatus.valueOf(newPaymentStatus.toUpperCase()));
                    Order saved = orderRepository.save(order);
                    return ResponseEntity.ok(ApiResponse.ok("Estado de pago actualizado a " + newPaymentStatus, saved));
                })
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con ID: " + orderId));
    }

    // ==========================================
    // 5. USER / ADMIN MANAGEMENT (CRUD)
    // ==========================================

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = userRepository.findAll();
        // Hide password hash before returning
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(ApiResponse.ok("Usuarios recuperados", users));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<User>> createAdminUser(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String name = body.get("name");
        String email = body.get("email");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre de usuario y la contraseña son obligatorios");
        }

        if (userRepository.existsByUsername(username.trim())) {
            throw new IllegalArgumentException("El nombre de usuario '" + username + "' ya existe en el sistema");
        }

        User newUser = User.builder()
                .username(username.trim())
                .password(passwordEncoder.encode(password.trim()))
                .name(name != null ? name.trim() : "Administrador")
                .email(email != null ? email.trim() : "")
                .role("ROLE_ADMIN")
                .storeId("default-store")
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(newUser);
        saved.setPassword(null); // Hide password

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Administrador creado exitosamente", saved));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String userId, Authentication authentication) {
        User userToDelete = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        if (authentication != null && authentication.getName().equalsIgnoreCase(userToDelete.getUsername())) {
            throw new IllegalArgumentException("No puedes eliminar tu propia cuenta mientras tienes la sesión activa");
        }

        if (userRepository.count() <= 1) {
            throw new IllegalArgumentException("No puedes eliminar el único administrador existente en el sistema");
        }

        userRepository.deleteById(userId);
        return ResponseEntity.ok(ApiResponse.ok("Administrador eliminado correctamente", null));
    }

    @Data
    @Builder
    public static class DashboardMetrics {
        private BigDecimal totalSales;
        private long totalOrdersCount;
        private long activeOrdersCount;
        private List<FinancialTransaction> recentTransactions;
        private List<Order> recentOrders;
    }
}
