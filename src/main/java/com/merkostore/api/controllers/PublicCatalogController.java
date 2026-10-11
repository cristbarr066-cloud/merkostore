package com.merkostore.api.controllers;

import com.merkostore.api.models.Category;
import com.merkostore.api.models.Product;
import com.merkostore.api.repositories.CategoryRepository;
import com.merkostore.api.repositories.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PublicCatalogController {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getActiveCategories(@RequestParam(defaultValue = "default-store") String storeId) {
        List<Category> categories = categoryRepository.findByStoreIdAndIsActiveTrueOrderByDisplayOrderAsc(storeId);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/products")
    public ResponseEntity<List<Product>> getProducts(
            @RequestParam(defaultValue = "default-store") String storeId,
            @RequestParam(required = false) String categoryId) {
        
        List<Product> products;
        if (categoryId != null && !categoryId.isEmpty()) {
            products = productRepository.findByStoreIdAndCategoryIdAndIsAvailableTrue(storeId, categoryId);
        } else {
            products = productRepository.findByStoreIdAndIsAvailableTrue(storeId);
        }
        return ResponseEntity.ok(products);
    }
}
