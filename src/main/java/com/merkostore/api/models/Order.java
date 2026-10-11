package com.merkostore.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "orders")
public class Order {

    @Id
    private String id;

    @Indexed(sparse = true)
    private String orderNumber;

    @Indexed(sparse = true)
    private String idempotencyKey;

    @Indexed
    private String storeId;

    private CustomerInfo customer;
    private List<OrderItem> items;

    private FulfillmentType fulfillmentType; // DELIVERY, PICKUP
    private BigDecimal deliveryFee;
    private BigDecimal subtotal;
    private BigDecimal total;

    private String paymentMethod; // WHATSAPP, NEQUI, PSE, CASH_ON_DELIVERY
    private PaymentStatus paymentStatus; // PENDING, PAID, REFUNDED
    private OrderStatus orderStatus; // RECEIVED, PREPARING, READY, DELIVERED, CANCELLED

    @CreatedDate
    private LocalDateTime createdAt;

    public enum FulfillmentType {
        DELIVERY, PICKUP
    }

    public enum PaymentStatus {
        PENDING, PAID, REFUNDED
    }

    public enum OrderStatus {
        RECEIVED, PREPARING, READY, DELIVERED, CANCELLED
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfo {
        private String name;
        private String phone;
        private String deliveryAddress;
        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItem {
        private String productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal subtotal;
    }
}
