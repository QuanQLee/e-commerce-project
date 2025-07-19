package com.example.security.controller;

import com.example.security.model.AuditLog;
import com.example.security.service.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.junit.jupiter.api.Assertions.*;

@WebMvcTest(SecurityController.class)
@Import(AuditService.class)
public class LoginControllerTests {
    @Autowired
    private MockMvc mvc;

    @Test
    void loginRequiresOtp() throws Exception {
        mvc.perform(post("/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"u\",\"password\":\"p\"}"))
            .andExpect(status().isOk())
            .andExpect(content().string("{\"token\":\"invalid-otp\"}"));
    }

    @Autowired
    private AuditService auditService;

    @Test
    void auditRecordedOnSuccess() throws Exception {
        mvc.perform(post("/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"u\",\"password\":\"p\",\"otp\":\"123456\"}"))
            .andExpect(status().isOk())
            .andExpect(content().string("{\"token\":\"demo-token\"}"));

        assertFalse(auditService.getEntries().isEmpty());
    }

    @Test
    void auditEndpointStoresLog() throws Exception {
        mvc.perform(post("/audit")
                .contentType("application/json")
                .content("{\"userId\":\"admin\",\"action\":\"update\",\"detail\":\"d\"}"))
            .andExpect(status().isAccepted());

        assertEquals(1, auditService.getEntries().size());
    }
}

