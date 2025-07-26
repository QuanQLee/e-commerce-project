package com.example.security.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {
    private static final Duration STEP = Duration.ofSeconds(30);
    private static final String DEMO_SECRET = "JBSWY3DPEHPK3PXP";
    private final Map<String, byte[]> secrets = new ConcurrentHashMap<>();

    public OtpService() {
        // In production secrets would come from the User service
        secrets.put("u", decodeBase32(DEMO_SECRET));
    }

    public boolean verify(String username, String otp) {
        if (otp == null) {
            return false;
        }
        byte[] key = secrets.get(username);
        if (key == null) {
            return false;
        }
        int expected;
        try {
            expected = generateTotp(key, Instant.now());
        } catch (GeneralSecurityException e) {
            return false;
        }
        return String.format("%06d", expected).equals(otp);
    }

    private int generateTotp(byte[] key, Instant timestamp) throws GeneralSecurityException {
        long counter = timestamp.getEpochSecond() / STEP.getSeconds();
        byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(data);
        int offset = hash[hash.length - 1] & 0xF;
        int binary = ((hash[offset] & 0x7F) << 24)
                | ((hash[offset + 1] & 0xFF) << 16)
                | ((hash[offset + 2] & 0xFF) << 8)
                | (hash[offset + 3] & 0xFF);
        return binary % 1_000_000;
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
        if (index != result.length) {
            byte[] tmp = new byte[index];
            System.arraycopy(result, 0, tmp, 0, index);
            return tmp;
        }
        return result;
    }
}
