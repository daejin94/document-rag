package com.example.rag.admin;

import java.time.LocalDate;

public record DailyUsageResponse(
        LocalDate date,
        long chatPromptTokens,
        long chatCompletionTokens,
        long embeddingTokens,
        long totalTokens
) {
}
