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

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "financial_transactions")
public class FinancialTransaction {

    @Id
    private String id;

    @Indexed
    private String storeId;

    private TransactionType type; // INCOME, EXPENSE
    private String category; // VENTA_PEDIDO, PROVEEDOR, SERVICIOS, NOMINA, OTRO
    private String orderId;
    private BigDecimal amount;
    private String description;
    private String paymentMethod;
    private String createdBy;

    @CreatedDate
    @Indexed
    private LocalDateTime date;

    public enum TransactionType {
        INCOME, EXPENSE
    }
}
