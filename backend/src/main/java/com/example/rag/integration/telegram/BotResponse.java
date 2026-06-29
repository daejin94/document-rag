package com.example.rag.integration.telegram;

import com.example.rag.integration.common.BotInstallation;

import java.time.Instant;

/**
 * 등록된 봇 응답. 토큰 원문은 노출하지 않고 마스킹된 값만 반환한다.
 */
public record BotResponse(
        Long id,
        String botUsername,
        String maskedToken,
        Instant createdAt
) {
    public static BotResponse from(BotInstallation installation) {
        return new BotResponse(
                installation.getId(),
                installation.getBotUsername(),
                installation.maskedToken(),
                installation.getCreatedAt());
    }
}
