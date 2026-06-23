package com.example.rag.admin;

import com.example.rag.user.UserRole;

import java.time.Instant;

public record AdminUserResponse(
        Long userId,
        String email,
        String name,
        UserRole role,
        Instant createdAt,
        long totalTokens
) {
}
