package com.example.rag.llm;

import com.example.rag.common.ApiException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiOcrModelClient implements OcrModelClient {

    private static final String SYSTEM_PROMPT =
            "너는 OCR 엔진이다. 주어진 이미지에 보이는 모든 텍스트를 위에서 아래, 왼쪽에서 오른쪽 순서로 "
                    + "그대로 옮겨 적는다. 내용을 요약하거나 설명하거나 번역하지 말고, 보이지 않는 내용을 추측해 채우지 마라. "
                    + "표는 행 단위로 풀어서 적는다. 읽을 수 있는 텍스트가 전혀 없으면 빈 문자열만 출력한다.";
    private static final String USER_PROMPT = "이 이미지의 텍스트를 추출해줘.";

    private final OpenAiProperties properties;
    private final RestClient restClient;

    public OpenAiOcrModelClient(OpenAiProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder
                .baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .build();
    }

    @Override
    public OcrResult recognize(byte[] imageBytes, String mimeType) {
        ensureApiKey();
        String dataUrl = "data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(imageBytes);
        Map<String, Object> body = Map.of(
                "model", properties.ocrModel(),
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", List.of(
                                Map.of("type", "text", "text", USER_PROMPT),
                                Map.of("type", "image_url", "image_url", Map.of("url", dataUrl))
                        ))
                ),
                "temperature", 0
        );
        Map<String, Object> response = restClient.post()
                .uri("/v1/chat/completions")
                .body(body)
                .retrieve()
                .body(Map.class);
        if (response == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OCR API 응답이 비어 있습니다.");
        }
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "OCR API 응답에 결과가 없습니다.");
        }
        Map<String, Object> message = (Map<String, Object>) choices.getFirst().get("message");
        String text = message.get("content") == null ? "" : String.valueOf(message.get("content"));
        Map<String, Object> usage = (Map<String, Object>) response.getOrDefault("usage", Map.of());
        return new OcrResult(
                text,
                intValue(usage.get("prompt_tokens")),
                intValue(usage.get("completion_tokens"))
        );
    }

    @Override
    public String modelName() {
        return properties.ocrModel();
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
