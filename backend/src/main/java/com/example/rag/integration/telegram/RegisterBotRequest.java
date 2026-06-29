package com.example.rag.integration.telegram;

import jakarta.validation.constraints.NotBlank;

public record RegisterBotRequest(
        @NotBlank String botToken
) {
}
