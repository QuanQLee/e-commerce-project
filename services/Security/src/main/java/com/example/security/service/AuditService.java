package com.example.security.service;

import com.example.security.model.AuditLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class AuditService {
    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private final List<AuditLog> entries = new CopyOnWriteArrayList<>();
    private final Path logFile;

    public AuditService() {
        Path logsDir = Paths.get("logs");
        try {
            Files.createDirectories(logsDir);
        } catch (IOException e) {
            log.warn("could not create logs directory", e);
        }
        logFile = logsDir.resolve("audit.log");
    }

    public void record(AuditLog entry) {
        entries.add(entry);
        String line = String.format("%s %s %s %s%n", Instant.now(), entry.userId(), entry.action(), entry.detail());
        try {
            Files.writeString(logFile, line, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException e) {
            log.warn("failed writing audit log", e);
        }
        log.info("audit: {} {} {}", entry.userId(), entry.action(), entry.detail());
    }

    public List<AuditLog> getEntries() {
        return List.copyOf(entries);
    }
}

