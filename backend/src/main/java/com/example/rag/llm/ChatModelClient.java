package com.example.rag.llm;

public interface ChatModelClient {

    ChatModelResult generate(ChatModelRequest request);

    String modelName();
}
