package com.merkostore.api.repositories;

import com.merkostore.api.models.Category;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends MongoRepository<Category, String> {
    List<Category> findByStoreIdAndIsActiveTrueOrderByDisplayOrderAsc(String storeId);
    List<Category> findByStoreId(String storeId);
}
