package com.example.rag.usage;

import org.springframework.stereotype.Component;

@Component
public class TokenUsageRecorder {

    private final TokenUsageRepository tokenUsageRepository;

    public TokenUsageRecorder(TokenUsageRepository tokenUsageRepository) {
        this.tokenUsageRepository = tokenUsageRepository;
    }

    public void record(
            Long userId,
            Long projectId,
            Long sessionId,
            TokenUsageType usageType,
            String model,
            int promptTokens,
            int completionTokens
    ) {
        if (promptTokens <= 0 && completionTokens <= 0) {
            return;
        }
        tokenUsageRepository.save(new TokenUsage(
                userId,
                projectId,
                sessionId,
                usageType,
                model,
                promptTokens,
                completionTokens
        ));
    }
}
