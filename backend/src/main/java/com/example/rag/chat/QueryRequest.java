package com.example.rag.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record QueryRequest(
        @NotBlank String question,
        @NotNull Long projectId,
        List<Long> documentIds,
        Long sessionId
) {
}
