package com.example.rag.integration.telegram;

import com.example.rag.integration.common.BotReplySender;
import com.example.rag.integration.common.Platform;
import org.springframework.stereotype.Component;

@Component
public class TelegramReplySender implements BotReplySender {

    private final TelegramApiClient apiClient;

    public TelegramReplySender(TelegramApiClient apiClient) {
        this.apiClient = apiClient;
    }

    @Override
    public Platform platform() {
        return Platform.TELEGRAM;
    }

    @Override
    public void sendText(String botCredential, String channelId, String text, String replyRef) {
        apiClient.sendMessage(botCredential, channelId, text, parseReplyRef(replyRef));
    }

    private Long parseReplyRef(String replyRef) {
        if (replyRef == null || replyRef.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(replyRef);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
