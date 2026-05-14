package com.example.rag.chat;

import java.time.Instant;
import java.util.List;

public record ChatMessageResponse(
        MessageRole role,
        String content,
        List<SourceResponse> sources,
        Instant createdAt
) {
}
