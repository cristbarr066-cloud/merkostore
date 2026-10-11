package com.merkostore.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    @Indexed
    private String storeId;

    @Indexed
    private String categoryId;

    @Indexed(unique = true, sparse = true)
    private String sku;

    private String name;
    private String description;
    private BigDecimal costPrice;
    private BigDecimal price;
    private BigDecimal discountPrice;
    private String unit; // e.g., UND, KG, LT, PAQ
    private Integer stock;
    private Integer minStockAlert;
    private String imageUrl;
    private Boolean isAvailable;
    private Boolean isFeatured;
    private List<String> tags;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
