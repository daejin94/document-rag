package com.example.rag.document;

import java.time.Instant;

public record DocumentDetailResponse(
        Long documentId,
        String title,
        String originalFileName,
        DocumentStatus status,
        long chunkCount,
        Instant createdAt
) {
}
