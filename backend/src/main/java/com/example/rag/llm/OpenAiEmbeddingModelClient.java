package com.example.rag.llm;

import com.example.rag.common.ApiException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class OpenAiEmbeddingModelClient implements EmbeddingModelClient {

    private final OpenAiProperties properties;
    private final RestClient restClient;

    public OpenAiEmbeddingModelClient(OpenAiProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder
                .baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .build();
    }

    @Override
    public List<Float> embed(String text) {
        ensureApiKey();
        Map<String, Object> response = restClient.post()
                .uri("/v1/embeddings")
                .body(Map.of("model", properties.embeddingModel(), "input", text))
                .retrieve()
                .body(Map.class);
        if (response == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Embedding API 응답이 비어 있습니다.");
        }
        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        if (data == null || data.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Embedding API 응답에 벡터가 없습니다.");
        }
        List<Number> embedding = (List<Number>) data.getFirst().get("embedding");
        return embedding.stream().map(Number::floatValue).toList();
    }

    @Override
    public String modelName() {
        return properties.embeddingModel();
    }

    private void ensureApiKey() {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "OPENAI_API_KEY가 설정되지 않았습니다.");
        }
    }
}
