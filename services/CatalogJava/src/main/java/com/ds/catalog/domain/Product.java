package com.ds.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "products", schema = "catalog")
public class Product {
    @Id
    @Column(name = "\"Id\"", nullable = false)
    private UUID id;

    @Column(name = "\"TenantId\"", nullable = false, length = 80)
    private String tenantId;

    @Column(name = "\"Name\"", nullable = false, length = 200)
    private String name;

    @Column(name = "\"Description\"", nullable = false, length = 1000)
    private String description;

    @Column(name = "\"Price\"", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "\"ImageUrl\"", length = 500)
    private String imageUrl;

    @Column(name = "\"Category\"", nullable = false, length = 200)
    private String category;

    @Column(name = "\"Stock\"", nullable = false)
    private int stock;

    protected Product() {
    }

    public Product(
            String tenantId,
            String name,
            String description,
            BigDecimal price,
            String imageUrl,
            String category,
            int stock
    ) {
        this.id = UUID.randomUUID();
        this.tenantId = tenantId == null || tenantId.isBlank() ? "public" : tenantId.trim();
        this.name = name;
        this.description = description;
        this.price = price;
        this.imageUrl = imageUrl;
        this.category = category;
        this.stock = stock;
    }

    public UUID getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getCategory() {
        return category;
    }

    public int getStock() {
        return stock;
    }
}
