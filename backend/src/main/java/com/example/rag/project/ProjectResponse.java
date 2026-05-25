package com.example.rag.project;

import java.time.Instant;

public record ProjectResponse(
        Long projectId,
        String name,
        ProjectRole role,
        Instant createdAt
) {
}
