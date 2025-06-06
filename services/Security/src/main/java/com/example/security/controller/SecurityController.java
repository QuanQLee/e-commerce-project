package com.example.security.controller;

import com.example.security.model.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
public class SecurityController {

    @PostMapping("/auth/login")
    public TokenResponse login(@RequestBody LoginRequest req) {
        return new TokenResponse("demo-token");
    }

    @PostMapping("/risk/order-check")
    public RiskCheckResponse orderCheck(@RequestBody RiskCheckRequest req) {
        return new RiskCheckResponse(true, "");
    }

    @PostMapping("/risk/payment-check")
    public RiskCheckResponse paymentCheck(@RequestBody RiskCheckRequest req) {
        return new RiskCheckResponse(true, "");
    }

    @PostMapping("/rate-limit")
    public RateLimitResponse rateLimit(@RequestBody RateLimitRequest req) {
        return new RateLimitResponse(true);
    }

    @PostMapping("/audit")
    public void audit(@RequestBody AuditLog req) {
        // no-op
    }
}
