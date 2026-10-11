package com.merkostore.api.services;

import com.merkostore.api.dtos.CreateOrderRequest;
import com.merkostore.api.exceptions.InsufficientStockException;
import com.merkostore.api.exceptions.InvalidOrderStateException;
import com.merkostore.api.exceptions.ResourceNotFoundException;
import com.merkostore.api.models.Order;
import com.merkostore.api.models.Product;
import com.merkostore.api.models.StoreConfig;
import com.merkostore.api.repositories.OrderRepository;
import com.merkostore.api.repositories.ProductRepository;
import com.merkostore.api.repositories.StoreConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StoreConfigRepository storeConfigRepository;
    private final MongoTemplate mongoTemplate;

    private final Random random = new Random();

    public Order createOrder(CreateOrderRequest request) {
        String storeId = request.getStoreId() != null ? request.getStoreId() : "default-store";

        // 0. Idempotency Check: Prevent duplicate order processing for identical idempotency key
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().trim().isEmpty()) {
            Query idempotencyQuery = Query.query(Criteria.where("storeId").is(storeId)
                    .and("idempotencyKey").is(request.getIdempotencyKey().trim()));
            Order existingOrder = mongoTemplate.findOne(idempotencyQuery, Order.class);
            if (existingOrder != null) {
                return existingOrder; // Return previously created order without re-decrementing stock
            }
        }

        // 1. Fetch Store Config to get official fees and thresholds
        StoreConfig storeConfig = storeConfigRepository.findByStoreId(storeId)
                .orElseGet(() -> StoreConfig.builder()
                        .storeId(storeId)
                        .storeName("Don Pedro - Tienda de Barrio")
                        .deliveryFee(new BigDecimal("3000"))
                        .minimumOrder(new BigDecimal("10000"))
                        .isStoreOpen(true)
                        .build());

        if (Boolean.FALSE.equals(storeConfig.getIsStoreOpen())) {
            throw new IllegalArgumentException("La tienda se encuentra cerrada temporalmente para recibir pedidos.");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<Order.OrderItem> orderItems = new ArrayList<>();
        List<DecrementedItem> decrementedItems = new ArrayList<>();

        try {
            // 2. Process each item: validate server-side price and stock, and perform atomic decrement
            for (CreateOrderRequest.OrderItemRequest itemReq : request.getItems()) {
                Product product = productRepository.findById(itemReq.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con ID: " + itemReq.getProductId()));

                if (!Boolean.TRUE.equals(product.getIsAvailable())) {
                    throw new IllegalArgumentException("El producto '" + product.getName() + "' no está disponible actualmente.");
                }

                if (product.getStock() != null && product.getStock() < itemReq.getQuantity()) {
                    throw new InsufficientStockException("Stock insuficiente para '" + product.getName() + "'. Disponibles: " + product.getStock());
                }

                // Determine effective server-side price
                BigDecimal effectivePrice = (product.getDiscountPrice() != null && product.getDiscountPrice().compareTo(BigDecimal.ZERO) > 0)
                        ? product.getDiscountPrice()
                        : product.getPrice();

                if (effectivePrice == null) {
                    effectivePrice = BigDecimal.ZERO;
                }

                BigDecimal itemSubtotal = effectivePrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                subtotal = subtotal.add(itemSubtotal);

                // ATOMIC decrement in MongoDB
                if (product.getStock() != null) {
                    Query query = Query.query(Criteria.where("_id").is(product.getId()).and("stock").gte(itemReq.getQuantity()));
                    Update update = new Update().inc("stock", -itemReq.getQuantity());

                    Product updatedProduct = mongoTemplate.findAndModify(query, update, Product.class);
                    if (updatedProduct == null) {
                        throw new InsufficientStockException("Conflicto de stock concurrente. El producto '" + product.getName() + "' ya no tiene suficientes existencias.");
                    }
                    decrementedItems.add(new DecrementedItem(product.getId(), itemReq.getQuantity()));
                }

                orderItems.add(Order.OrderItem.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .quantity(itemReq.getQuantity())
                        .unitPrice(effectivePrice)
                        .subtotal(itemSubtotal)
                        .build());
            }

            // 3. Verify minimum order threshold
            if (storeConfig.getMinimumOrder() != null && subtotal.compareTo(storeConfig.getMinimumOrder()) < 0) {
                throw new IllegalArgumentException("El subtotal del pedido ($" + subtotal + ") es inferior al monto mínimo permitido ($" + storeConfig.getMinimumOrder() + ").");
            }

            // 4. Calculate official delivery fee
            BigDecimal deliveryFee = BigDecimal.ZERO;
            Order.FulfillmentType fulfillmentType = "PICKUP".equalsIgnoreCase(request.getFulfillmentType())
                    ? Order.FulfillmentType.PICKUP
                    : Order.FulfillmentType.DELIVERY;

            if (fulfillmentType == Order.FulfillmentType.DELIVERY) {
                // Free delivery if subtotal >= 30,000 COP
                if (subtotal.compareTo(new BigDecimal("30000")) < 0) {
                    deliveryFee = storeConfig.getDeliveryFee() != null ? storeConfig.getDeliveryFee() : new BigDecimal("3000");
                }
            }

            BigDecimal total = subtotal.add(deliveryFee);

            // 5. Build and save Order entity
            String orderNumber = "MS-" + (1000 + random.nextInt(9000)) + "-" + (System.currentTimeMillis() % 1000);

            Order.CustomerInfo customerInfo = Order.CustomerInfo.builder()
                    .name(request.getCustomer().getName())
                    .phone(request.getCustomer().getPhone())
                    .deliveryAddress(request.getCustomer().getDeliveryAddress())
                    .notes(request.getCustomer().getNotes())
                    .build();

            Order order = Order.builder()
                    .orderNumber(orderNumber)
                    .storeId(storeId)
                    .idempotencyKey(request.getIdempotencyKey() != null ? request.getIdempotencyKey().trim() : null)
                    .customer(customerInfo)
                    .items(orderItems)
                    .fulfillmentType(fulfillmentType)
                    .deliveryFee(deliveryFee)
                    .subtotal(subtotal)
                    .total(total)
                    .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod().toUpperCase() : "WHATSAPP")
                    .paymentStatus(Order.PaymentStatus.PENDING)
                    .orderStatus(Order.OrderStatus.RECEIVED)
                    .createdAt(LocalDateTime.now())
                    .build();

            return orderRepository.save(order);

        } catch (Exception ex) {
            // Rollback decremented stock if order creation fails after partial decrement
            for (DecrementedItem item : decrementedItems) {
                Query query = Query.query(Criteria.where("_id").is(item.productId));
                Update update = new Update().inc("stock", item.quantity);
                mongoTemplate.updateFirst(query, update, Product.class);
            }
            throw ex;
        }
    }

    public Order getOrderByOrderNumber(String orderNumber) {
        return orderRepository.findByStoreIdOrderByCreatedAtDesc("default-store").stream()
                .filter(o -> o.getOrderNumber() != null && o.getOrderNumber().equalsIgnoreCase(orderNumber))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con el número: " + orderNumber));
    }

    public Order updateOrderStatus(String orderId, String newStatusStr) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado con ID: " + orderId));

        Order.OrderStatus newStatus;
        try {
            newStatus = Order.OrderStatus.valueOf(newStatusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Estado de pedido no válido: " + newStatusStr);
        }

        Order.OrderStatus currentStatus = order.getOrderStatus();
        validateStatusTransition(currentStatus, newStatus);

        // If order is cancelled, restore product stock
        if (newStatus == Order.OrderStatus.CANCELLED && currentStatus != Order.OrderStatus.CANCELLED) {
            restoreStockForOrder(order);
        }

        order.setOrderStatus(newStatus);
        
        // If order marked as DELIVERED, automatically set payment status to PAID if it was PENDING
        if (newStatus == Order.OrderStatus.DELIVERED && order.getPaymentStatus() == Order.PaymentStatus.PENDING) {
            order.setPaymentStatus(Order.PaymentStatus.PAID);
        }

        return orderRepository.save(order);
    }

    private void validateStatusTransition(Order.OrderStatus current, Order.OrderStatus next) {
        if (current == Order.OrderStatus.CANCELLED) {
            throw new InvalidOrderStateException("No se puede cambiar el estado de un pedido CANCELADO.");
        }
        if (current == Order.OrderStatus.DELIVERED && next != Order.OrderStatus.CANCELLED) {
            throw new InvalidOrderStateException("No se puede cambiar el estado de un pedido ya ENTREGADO.");
        }
        if (current == next) {
            return;
        }
    }

    private void restoreStockForOrder(Order order) {
        if (order.getItems() != null) {
            for (Order.OrderItem item : order.getItems()) {
                if (item.getProductId() != null && item.getQuantity() != null) {
                    Query query = Query.query(Criteria.where("_id").is(item.getProductId()));
                    Update update = new Update().inc("stock", item.getQuantity());
                    mongoTemplate.updateFirst(query, update, Product.class);
                }
            }
        }
    }

    private record DecrementedItem(String productId, int quantity) {}
}
