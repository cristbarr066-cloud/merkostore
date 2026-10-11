package com.merkostore.api.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrderRequest {

    @NotBlank(message = "El ID de la tienda es obligatorio")
    @Builder.Default
    private String storeId = "default-store";

    @NotEmpty(message = "El pedido debe contener al menos un producto")
    @Valid
    private List<OrderItemRequest> items;

    @NotNull(message = "La información del cliente es obligatoria")
    @Valid
    private CustomerDTO customer;

    @NotBlank(message = "El método de pago es obligatorio")
    private String paymentMethod; // CASH, NEQUI, WHATSAPP, PSE

    @NotBlank(message = "El tipo de entrega es obligatorio")
    private String fulfillmentType; // DELIVERY, PICKUP

    private String idempotencyKey;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemRequest {
        @NotBlank(message = "El ID del producto es obligatorio")
        private String productId;

        @NotNull(message = "La cantidad es obligatoria")
        @Min(value = 1, message = "La cantidad mínima debe ser 1")
        private Integer quantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerDTO {
        @NotBlank(message = "El nombre del cliente es obligatorio")
        private String name;

        @NotBlank(message = "El teléfono de contacto es obligatorio")
        private String phone;

        @NotBlank(message = "La dirección de entrega es obligatoria")
        private String deliveryAddress;

        private String notes;
    }
}
