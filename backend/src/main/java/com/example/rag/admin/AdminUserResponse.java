package com.example.rag.admin;

import com.example.rag.user.UserRole;
import com.example.rag.user.UserStatus;

import java.time.Instant;

public record AdminUserResponse(
        Long userId,
        String email,
        String name,
        UserRole role,
        UserStatus status,
        Instant createdAt,
        long totalTokens
) {
}
