package com.example.rag.document;

public record DocumentUploadResponse(Long documentId, String title, DocumentStatus status) {
}
