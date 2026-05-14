package com.example.rag.chat;

import java.time.Instant;

public record ChatSessionResponse(Long sessionId, String title, Instant createdAt) {
}
