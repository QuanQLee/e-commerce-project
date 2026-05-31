package com.ds.catalog.service;

import com.ds.catalog.api.CreateProductRequest;
import com.ds.catalog.domain.Product;
import com.ds.catalog.repository.ProductRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
    public static final int DEFAULT_PAGE_SIZE = 50;
    public static final int MAX_PAGE_SIZE = 200;

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public PageResult<Product> listProducts(String tenantId, String category, int page, int pageSize) {
        int normalizedPage = Math.max(page, 1);
        int normalizedPageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
        long skip = (long) (normalizedPage - 1) * normalizedPageSize;
        if (skip > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Requested page is too deep.");
        }

        var pageable = PageRequest.of(
                normalizedPage - 1,
                normalizedPageSize,
                Sort.by("name").ascending().and(Sort.by("id").ascending())
        );

        var normalizedCategory = category == null ? "" : category.trim();
        var products = normalizedCategory.isEmpty()
                ? productRepository.findByTenantId(tenantId, pageable)
                : productRepository.findByTenantIdAndCategoryTree(tenantId, normalizedCategory, pageable);
        return new PageResult<>(products.getContent(), normalizedPage, normalizedPageSize);
    }

    @Transactional(readOnly = true)
    public Optional<Product> getProduct(String tenantId, UUID id) {
        return productRepository.findByTenantIdAndId(tenantId, id);
    }

    @Transactional
    public Product createProduct(String tenantId, CreateProductRequest request) {
        var product = new Product(
                tenantId,
                request.name().trim(),
                request.description().trim(),
                request.price(),
                request.imageUrl(),
                request.category().trim(),
                request.stock()
        );
        return productRepository.save(product);
    }
}
