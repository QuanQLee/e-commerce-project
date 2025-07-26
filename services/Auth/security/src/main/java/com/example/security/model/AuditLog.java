package com.example.security.model;

public record AuditLog(String userId, String action, String detail) {}

