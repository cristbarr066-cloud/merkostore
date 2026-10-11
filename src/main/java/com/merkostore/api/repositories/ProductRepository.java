package com.merkostore.api.repositories;

import com.merkostore.api.models.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    List<Product> findByStoreIdAndIsAvailableTrue(String storeId);
    List<Product> findByStoreIdAndCategoryIdAndIsAvailableTrue(String storeId, String categoryId);
    List<Product> findByStoreId(String storeId);
}
