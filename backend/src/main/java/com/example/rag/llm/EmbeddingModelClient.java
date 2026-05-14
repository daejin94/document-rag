package com.example.rag.llm;

import java.util.List;

public interface EmbeddingModelClient {

    List<Float> embed(String text);

    String modelName();
}
