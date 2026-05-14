package com.example.rag.chat;

import java.util.List;

public record QueryResponse(
        String answer,
        List<SourceResponse> sources,
        ModelResponse model,
        UsageResponse usage
) {
}
