package com.example.rag.admin;

import java.time.Instant;
import java.util.List;

public record AdminProjectResponse(
        Long projectId,
        String name,
        String description,
        Instant createdAt,
        String createdByEmail,
        List<AdminProjectMemberResponse> members,
        long totalTokens
) {
}
