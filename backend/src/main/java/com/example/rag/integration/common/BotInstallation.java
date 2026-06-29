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
 * 프로젝트에 등록된 봇. 봇이 받은 메시지는 이 설치가 가리키는 프로젝트로 라우팅된다(봇 = 프로젝트).
 */
@Entity
@Table(name = "bot_installations")
public class BotInstallation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Platform platform;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "bot_token", nullable = false)
    private String botToken;

    @Column(name = "bot_username")
    private String botUsername;

    @Column(name = "secret_token", nullable = false)
    private String secretToken;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected BotInstallation() {
    }

    public BotInstallation(Platform platform, Long projectId, String botToken, String botUsername,
                           String secretToken, Long createdByUserId) {
        this.platform = platform;
        this.projectId = projectId;
        this.botToken = botToken;
        this.botUsername = botUsername;
        this.secretToken = secretToken;
        this.createdByUserId = createdByUserId;
    }

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }

    /** 토큰 끝 4자리만 노출하는 마스킹 문자열. */
    public String maskedToken() {
        if (botToken == null || botToken.length() < 4) {
            return "••••";
        }
        return "••••" + botToken.substring(botToken.length() - 4);
    }

    public Long getId() {
        return id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public Long getProjectId() {
        return projectId;
    }

    public String getBotToken() {
        return botToken;
    }

    public String getBotUsername() {
        return botUsername;
    }

    public String getSecretToken() {
        return secretToken;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
