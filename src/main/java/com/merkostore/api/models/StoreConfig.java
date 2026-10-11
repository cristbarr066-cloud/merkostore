package com.merkostore.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "store_config")
public class StoreConfig {

    @Id
    private String id;
    private String storeId;
    private String storeName;
    private String whatsappPhone;
    private String address;
    private BigDecimal deliveryFee;
    private BigDecimal minimumOrder;
    private Boolean isStoreOpen;
    private List<String> enabledPaymentMethods; // WHATSAPP, CASH, NEQUI, PSE
}
