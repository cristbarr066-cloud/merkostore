package com.merkostore.api.repositories;

import com.merkostore.api.models.StoreConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoreConfigRepository extends MongoRepository<StoreConfig, String> {
    Optional<StoreConfig> findByStoreId(String storeId);
}
