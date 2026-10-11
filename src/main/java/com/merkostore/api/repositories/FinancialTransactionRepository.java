package com.merkostore.api.repositories;

import com.merkostore.api.models.FinancialTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FinancialTransactionRepository extends MongoRepository<FinancialTransaction, String> {
    List<FinancialTransaction> findByStoreIdAndDateBetween(String storeId, LocalDateTime start, LocalDateTime end);
    List<FinancialTransaction> findByStoreIdOrderByDateDesc(String storeId);
}
