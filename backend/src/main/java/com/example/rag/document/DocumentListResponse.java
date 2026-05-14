package com.example.rag.document;

import java.time.Instant;

public record DocumentListResponse(
        Long documentId,
        String title,
        String originalFileName,
        DocumentStatus status,
        Instant createdAt
) {
}
