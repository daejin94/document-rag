package com.example.rag.chat;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record QueryRequest(
        @NotBlank String question,
        List<Long> documentIds,
        Long sessionId
) {
}
