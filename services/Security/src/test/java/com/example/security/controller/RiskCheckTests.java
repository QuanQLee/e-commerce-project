package com.example.security.controller;

import com.example.security.service.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SecurityController.class)
@Import(AuditService.class)
public class RiskCheckTests {
    @Autowired
    private MockMvc mvc;

    @Test
    void suspiciousOrderBlocked() throws Exception {
        mvc.perform(post("/risk/order-check")
                .contentType("application/json")
                .content("{\"userId\":\"fraud\",\"action\":\"order\"}"))
            .andExpect(status().isOk())
            .andExpect(content().string("{\"allowed\":false,\"reason\":\"suspicious activity\"}"));
    }
}
