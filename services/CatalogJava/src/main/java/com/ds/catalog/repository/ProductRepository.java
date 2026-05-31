package com.ds.catalog.repository;

import com.ds.catalog.domain.Product;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    Page<Product> findByTenantId(String tenantId, Pageable pageable);

    @Query("""
            select p
            from Product p
            where p.tenantId = :tenantId
              and (p.category = :category or p.category like concat(:category, '/%'))
            """)
    Page<Product> findByTenantIdAndCategoryTree(
            @Param("tenantId") String tenantId,
            @Param("category") String category,
            Pageable pageable
    );

    Optional<Product> findByTenantIdAndId(String tenantId, UUID id);
}
