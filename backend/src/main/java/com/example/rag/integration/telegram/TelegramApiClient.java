package com.example.rag.integration.telegram;

import com.example.rag.common.ApiException;
import com.example.rag.integration.config.IntegrationProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 텔레그램 Bot API 얇은 클라이언트. 멀티봇이므로 모든 메서드가 봇 토큰을 인자로 받는다.
 * 답변은 전송 실패를 피하기 위해 parse_mode 없이 평문으로 보낸다(MVP).
 */
@Component
public class TelegramApiClient {

    private final IntegrationProperties.Telegram properties;
    private final RestClient restClient;

    public TelegramApiClient(IntegrationProperties properties, RestClient.Builder builder) {
        this.properties = properties.telegram();
        this.restClient = builder.build();
    }

    /** 답변/안내 메시지를 채팅방으로 전송한다. replyToMessageId가 있으면 해당 메시지에 답글로 단다. */
    public void sendMessage(String botToken, String chatId, String text, Long replyToMessageId) {
        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", chatId);
        body.put("text", text);
        if (replyToMessageId != null) {
            body.put("reply_to_message_id", replyToMessageId);
        }
        restClient.post()
                .uri(methodUrl(botToken, "sendMessage"))
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    /** polling 모드에서 새 업데이트를 가져온다. offset 이전 업데이트는 확인 처리된다. */
    public List<TelegramUpdate> getUpdates(String botToken, long offset, int timeoutSeconds) {
        UpdatesResponse response = restClient.get()
                .uri(methodUrl(botToken, "getUpdates") + "?offset=" + offset + "&timeout=" + timeoutSeconds)
                .retrieve()
                .body(UpdatesResponse.class);
        if (response == null || response.result() == null) {
            return List.of();
        }
        return response.result();
    }

    /** webhook 모드 등록. secretToken은 이후 수신 요청의 X-Telegram-Bot-Api-Secret-Token 헤더로 검증된다. */
    public void setWebhook(String botToken, String url, String secretToken) {
        Map<String, Object> body = new HashMap<>();
        body.put("url", url);
        if (secretToken != null && !secretToken.isBlank()) {
            body.put("secret_token", secretToken);
        }
        restClient.post()
                .uri(methodUrl(botToken, "setWebhook"))
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    public void deleteWebhook(String botToken) {
        restClient.post()
                .uri(methodUrl(botToken, "deleteWebhook"))
                .body(Map.of())
                .retrieve()
                .toBodilessEntity();
    }

    /**
     * 토큰 유효성 검증 겸 봇 사용자명 조회. 유효하지 않으면 ApiException(BAD_REQUEST)을 던진다.
     */
    public String getMeUsername(String botToken) {
        MeResponse response;
        try {
            response = restClient.get()
                    .uri(methodUrl(botToken, "getMe"))
                    .retrieve()
                    .body(MeResponse.class);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "유효하지 않은 봇 토큰이거나 텔레그램에 연결할 수 없습니다.");
        }
        if (response == null || !response.ok() || response.result() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "유효하지 않은 봇 토큰입니다.");
        }
        return Optional.ofNullable(response.result().username()).orElse("");
    }

    private String methodUrl(String botToken, String method) {
        return properties.apiBaseUrl() + "/bot" + botToken + "/" + method;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record UpdatesResponse(boolean ok, List<TelegramUpdate> result) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record MeResponse(boolean ok, MeResult result) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record MeResult(Long id, String username) {
    }
}
