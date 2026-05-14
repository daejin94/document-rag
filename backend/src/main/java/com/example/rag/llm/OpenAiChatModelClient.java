package com.example.rag.llm;

import com.example.rag.common.ApiException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class OpenAiChatModelClient implements ChatModelClient {

    private final OpenAiProperties properties;
    private final RestClient restClient;

    public OpenAiChatModelClient(OpenAiProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder
                .baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .build();
    }

    @Override
    public ChatModelResult generate(ChatModelRequest request) {
        ensureApiKey();
        Map<String, Object> body = Map.of(
                "model", properties.chatModel(),
                "messages", List.of(
                        Map.of("role", "system", "content", request.systemPrompt()),
                        Map.of("role", "user", "content", request.userPrompt())
                ),
                "temperature", 0.2
        );
        Map<String, Object> response = restClient.post()
                .uri("/v1/chat/completions")
                .body(body)
                .retrieve()
                .body(Map.class);
        if (response == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Chat API 응답이 비어 있습니다.");
        }
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Chat API 응답에 답변이 없습니다.");
        }
        Map<String, Object> message = (Map<String, Object>) choices.getFirst().get("message");
        String answer = String.valueOf(message.get("content"));
        Map<String, Object> usage = (Map<String, Object>) response.getOrDefault("usage", Map.of());
        return new ChatModelResult(
                answer,
                intValue(usage.get("prompt_tokens")),
                intValue(usage.get("completion_tokens"))
        );
    }

    @Override
    public String modelName() {
        return properties.chatModel();
    }

    private int intValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    private void ensureApiKey() {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "OPENAI_API_KEY가 설정되지 않았습니다.");
        }
    }
}
