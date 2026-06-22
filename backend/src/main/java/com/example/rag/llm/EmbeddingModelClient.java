package com.example.rag.llm;

public interface EmbeddingModelClient {

    EmbedResult embed(String text);

    String modelName();
}
