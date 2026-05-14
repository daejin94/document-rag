package com.example.rag.document;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

    long countByDocumentId(Long documentId);
}
