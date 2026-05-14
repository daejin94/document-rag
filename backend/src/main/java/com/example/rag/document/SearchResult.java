package com.example.rag.document;

public record SearchResult(
        Long chunkId,
        Long documentId,
        String documentTitle,
        int chunkIndex,
        String content,
        double distance,
        double similarity
) {
}
