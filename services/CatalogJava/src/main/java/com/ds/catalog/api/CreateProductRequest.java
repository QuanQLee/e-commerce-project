package com.ds.catalog.api;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateProductRequest(
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Size(max = 1000) String description,
        @NotNull @DecimalMin("0.00") BigDecimal price,
        @Size(max = 500) String imageUrl,
        @NotBlank @Size(max = 200) String category,
        @Min(0) int stock
) {
}
