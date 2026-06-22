package com.example.rag.llm;

import java.util.List;

public record EmbedResult(
        List<Float> embedding,
        int totalTokens
) {
}
