package com.merkostore.api.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    @NotBlank(message = "El mensaje no puede estar vacío")
    private String message;

    @Builder.Default
    private String storeId = "default-store";

    private String conversationId;

    private String customerName;

    /**
     * Catálogo en tiempo real sincronizado directamente desde el negocio / frontend
     */
    private List<ProductContextItem> currentCatalog;

    /**
     * Configuración en tiempo real de la tienda (horarios, teléfono, domicilio, etc.)
     */
    private StoreConfigContext storeConfig;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductContextItem {
        private String id;
        private String name;
        private String description;
        private BigDecimal price;
        private BigDecimal discountPrice;
        private Integer stock;
        private String category;
        private String imageUrl;
        private Boolean isAvailable;
        private String unit;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StoreConfigContext {
        private String storeName;
        private String whatsappPhone;
        private String address;
        private BigDecimal deliveryFee;
        private BigDecimal minimumOrder;
        private Boolean isStoreOpen;
    }
}
