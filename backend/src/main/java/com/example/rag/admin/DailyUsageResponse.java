package com.example.rag.admin;

import java.time.LocalDate;

public record DailyUsageResponse(
        LocalDate date,
        long promptTokens,
        long completionTokens,
        long totalTokens
) {
}
