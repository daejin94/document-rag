package com.example.rag.document;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DocumentChunker {

    private final RagProperties properties;

    public DocumentChunker(RagProperties properties) {
        this.properties = properties;
    }

    public List<String> split(String text) {
        int chunkSize = properties.chunkSize();
        int overlap = Math.min(properties.chunkOverlap(), Math.max(0, chunkSize - 1));
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(text.length(), start + chunkSize);
            chunks.add(text.substring(start, end).trim());
            if (end == text.length()) {
                break;
            }
            start = Math.max(0, end - overlap);
        }
        return chunks.stream().filter(chunk -> !chunk.isBlank()).toList();
    }
}
