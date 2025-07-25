package com.example.security.controller;

import com.example.security.model.AuditLog;
import com.example.security.service.AuditService;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.time.Instant;
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
        String otp = generateOtp();

        mvc.perform(post("/auth/login")
                .contentType("application/json")
                .content("{\"username\":\"u\",\"password\":\"p\",\"otp\":\"" + otp + "\"}"))
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

    private String generateOtp() throws Exception {
        byte[] key = decodeBase32("JBSWY3DPEHPK3PXP");
        long counter = Instant.now().getEpochSecond() / 30;
        byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(data);
        int offset = hash[hash.length - 1] & 0xF;
        int binary = ((hash[offset] & 0x7F) << 24) |
                ((hash[offset + 1] & 0xFF) << 16) |
                ((hash[offset + 2] & 0xFF) << 8) |
                (hash[offset + 3] & 0xFF);
        int otp = binary % 1_000_000;
        return String.format("%06d", otp);
    }

    private byte[] decodeBase32(String str) {
        String base32 = str.replace("=", "").toUpperCase();
        int buffer = 0, bitsLeft = 0, index = 0;
        byte[] result = new byte[base32.length() * 5 / 8];
        for (char c : base32.toCharArray()) {
            int val = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                result[index++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        byte[] out = new byte[index];
        System.arraycopy(result, 0, out, 0, index);
        return out;
    }
}

