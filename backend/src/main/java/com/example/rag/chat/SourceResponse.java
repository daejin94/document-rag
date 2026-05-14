package com.example.rag.chat;

public record SourceResponse(
        Long documentId,
        String documentTitle,
        Long chunkId,
        int chunkIndex,
        double similarity,
        String contentPreview
) {
}
