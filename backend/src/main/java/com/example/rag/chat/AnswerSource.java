package com.example.rag.chat;

import com.example.rag.document.DocumentChunk;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "answer_sources")
public class AnswerSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_message_id", nullable = false)
    private ChatMessage chatMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_chunk_id", nullable = false)
    private DocumentChunk documentChunk;

    @Column(nullable = false)
    private double similarityScore;

    @Column(nullable = false)
    private Instant createdAt;

    protected AnswerSource() {
    }

    public AnswerSource(ChatMessage chatMessage, DocumentChunk documentChunk, double similarityScore) {
        this.chatMessage = chatMessage;
        this.documentChunk = documentChunk;
        this.similarityScore = similarityScore;
    }

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }

    public DocumentChunk getDocumentChunk() {
        return documentChunk;
    }

    public double getSimilarityScore() {
        return similarityScore;
    }
}
