package com.example.rag.llm;

public record OcrResult(
        String text,
        int promptTokens,
        int completionTokens
) {
    public int totalTokens() {
        return promptTokens + completionTokens;
    }
}
