package com.ds.catalog.api;

import com.ds.catalog.domain.Product;
import com.ds.catalog.service.ProductService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
public class ProductController {
    private static final String DEFAULT_TENANT_ID = "public";

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/products")
    public ResponseEntity<List<ProductResponse>> listProducts(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int pageSize,
            HttpServletResponse response
    ) {
        var result = productService.listProducts(normalizeTenantId(tenantId), category, page, pageSize);
        response.setHeader("X-Page", Integer.toString(result.page()));
        response.setHeader("X-Page-Size", Integer.toString(result.pageSize()));
        response.setHeader("X-Page-Size-Limit", Integer.toString(ProductService.MAX_PAGE_SIZE));
        return ResponseEntity.ok(result.items().stream().map(ProductResponse::from).toList());
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<ProductResponse> getProduct(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId,
            @PathVariable UUID id
    ) {
        return productService.getProduct(normalizeTenantId(tenantId), id)
                .map(ProductResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/products")
    public ResponseEntity<UUID> createProduct(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId,
            @Valid @RequestBody CreateProductRequest request
    ) {
        Product product = productService.createProduct(normalizeTenantId(tenantId), request);
        var location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(product.getId())
                .toUri();
        return ResponseEntity.created(location).body(product.getId());
    }

    private static String normalizeTenantId(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return DEFAULT_TENANT_ID;
        }
        return tenantId.trim();
    }
}
