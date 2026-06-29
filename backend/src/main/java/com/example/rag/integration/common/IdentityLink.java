package com.example.rag.integration.common;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * 외부 플랫폼 사용자 ↔ 앱 계정 매핑. 매핑된 user_id의 권한으로 RAG 질의를 수행한다.
 */
@Entity
@Table(name = "identity_links")
public class IdentityLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Platform platform;

    @Column(name = "external_user_id", nullable = false)
    private String externalUserId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected IdentityLink() {
    }

    public IdentityLink(Platform platform, String externalUserId, Long userId) {
        this.platform = platform;
        this.externalUserId = externalUserId;
        this.userId = userId;
    }

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }

    /** 같은 외부 사용자를 다른 앱 계정으로 다시 연결한다. */
    public void relinkTo(Long userId) {
        this.userId = userId;
    }

    public Long getId() {
        return id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getExternalUserId() {
        return externalUserId;
    }

    public Long getUserId() {
        return userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
