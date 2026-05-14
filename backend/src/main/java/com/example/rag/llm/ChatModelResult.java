package com.example.rag.llm;

public record ChatModelResult(
        String answer,
        int promptTokens,
        int completionTokens
) {
}
