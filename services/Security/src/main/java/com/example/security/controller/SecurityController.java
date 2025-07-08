package com.example.security.controller;

import com.example.security.model.*;
import com.example.security.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping
public class SecurityController {

    private static final Logger log = LoggerFactory.getLogger(SecurityController.class);

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private final Map<String, Integer> attempts = new ConcurrentHashMap<>();
    private final AuditService auditService;

    public SecurityController(AuditService auditService) {
        this.auditService = auditService;
    }

    @PostMapping("/auth/login")
    public TokenResponse login(@RequestBody LoginRequest req, HttpServletRequest http) {
        String ip = http.getRemoteAddr();
        int failCount = attempts.getOrDefault(ip, 0);
        if (failCount >= MAX_FAILED_ATTEMPTS) {
            log.warn("blocked login from {}", ip);
            auditService.record(new AuditLog(req.username(), "login-blocked", "ip=" + ip));
            return new TokenResponse("blocked");
        }
        if (req.otp() == null || !req.otp().matches("\\d{6}")) {
            log.warn("invalid otp from {} for user {}", ip, req.username());
            attempts.put(ip, failCount + 1);
            auditService.record(new AuditLog(req.username(), "login-invalid-otp", "ip=" + ip));
            return new TokenResponse("invalid-otp");
        }
        attempts.remove(ip);
        log.info("successful login for user {} from {}", req.username(), ip);
        auditService.record(new AuditLog(req.username(), "login-success", "ip=" + ip));
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
        auditService.record(req);
    }
}
