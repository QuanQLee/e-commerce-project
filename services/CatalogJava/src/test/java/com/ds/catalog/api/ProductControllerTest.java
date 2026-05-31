package com.ds.catalog.api;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ds.catalog.domain.Product;
import com.ds.catalog.repository.ProductRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @BeforeEach
    void cleanDatabase() {
        productRepository.deleteAll();
    }

    @Test
    void listProductsFiltersByTenantAndCategoryTree() throws Exception {
        productRepository.save(new Product("tenant-a", "Phone", "Phone", BigDecimal.valueOf(100), null, "electronics", 3));
        productRepository.save(new Product("tenant-a", "Case", "Case", BigDecimal.valueOf(10), null, "electronics/accessories", 10));
        productRepository.save(new Product("tenant-b", "Apple", "Fruit", BigDecimal.ONE, null, "grocery", 50));

        mockMvc.perform(get("/products")
                        .header("X-Tenant-Id", "tenant-a")
                        .param("category", "electronics"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Page", "1"))
                .andExpect(header().string("X-Page-Size", "50"))
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void createProductUsesTenantHeader() throws Exception {
        mockMvc.perform(post("/products")
                        .header("X-Tenant-Id", "tenant-a")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Phone",
                                  "description": "Flagship phone",
                                  "price": 799.99,
                                  "imageUrl": "https://example.com/phone.png",
                                  "category": "electronics",
                                  "stock": 12
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/products").header("X-Tenant-Id", "tenant-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tenantId", is("tenant-a")))
                .andExpect(jsonPath("$[0].name", is("Phone")));
    }

    @Test
    void listProductsRejectsDeepPage() throws Exception {
        mockMvc.perform(get("/products")
                        .param("page", Integer.toString(Integer.MAX_VALUE))
                        .param("pageSize", "200"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", is("Requested page is too deep.")));
    }
}
