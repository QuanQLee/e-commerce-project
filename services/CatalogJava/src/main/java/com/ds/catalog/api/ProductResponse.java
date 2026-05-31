package com.ds.catalog.api;

import com.ds.catalog.domain.Product;
import java.math.BigDecimal;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        String tenantId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        String category,
        int stock
) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getTenantId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getImageUrl(),
                product.getCategory(),
                product.getStock()
        );
    }
}
