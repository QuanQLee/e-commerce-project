package com.example.security.model;

/**
 * Login request with optional one time password for two-factor auth.
 */
public record LoginRequest(String username, String password, String otp) {}

