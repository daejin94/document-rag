package com.example.rag.integration.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 텔레그램 getUpdates/webhook 수신 페이로드. 필요한 필드만 매핑하고 나머지는 무시한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramUpdate(
        @JsonProperty("update_id") Long updateId,
        TelegramMessage message
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TelegramMessage(
            @JsonProperty("message_id") Long messageId,
            TelegramUser from,
            TelegramChat chat,
            String text
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TelegramUser(
            Long id,
            @JsonProperty("is_bot") Boolean isBot,
            @JsonProperty("first_name") String firstName,
            String username
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TelegramChat(
            Long id,
            String type
    ) {
    }

    public boolean hasText() {
        return message != null && message.text() != null && !message.text().isBlank();
    }

    public boolean fromBot() {
        return message != null && message.from() != null && Boolean.TRUE.equals(message.from().isBot());
    }
}
