package com.example.rag.project;

import java.time.Instant;

public record ProjectMemberResponse(
        Long userId,
        String email,
        String name,
        ProjectRole role,
        Instant joinedAt
) {
}
