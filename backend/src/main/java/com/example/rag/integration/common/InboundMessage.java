package com.example.rag.integration.common;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * 외부 플랫폼에서 수신한 질문 1건. 비동기 작업 큐이자 멱등성 키 저장소다.
 * (platform, provider_event_id) 유니크 제약으로 webhook/polling 중복 수신을 차단한다.
 */
@Entity
@Table(name = "inbound_messages")
public class InboundMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Platform platform;

    @Column(name = "installation_id")
    private Long installationId;

    @Column(name = "provider_event_id", nullable = false)
    private String providerEventId;

    @Column(name = "channel_id", nullable = false)
    private String channelId;

    @Column(name = "external_user_id")
    private String externalUserId;

    @Column(nullable = false, columnDefinition = "text")
    private String question;

    /** 답변을 스레드/답글로 보내기 위한 참조(텔레그램 message_id 등) */
    @Column(name = "reply_ref")
    private String replyRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InboundStatus status = InboundStatus.PENDING;

    @Column(name = "chat_session_id")
    private Long chatSessionId;

    @Column(columnDefinition = "text")
    private String error;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected InboundMessage() {
    }

    public InboundMessage(Platform platform, Long installationId, String providerEventId, String channelId,
                          String externalUserId, String question, String replyRef) {
        this.platform = platform;
        this.installationId = installationId;
        this.providerEventId = providerEventId;
        this.channelId = channelId;
        this.externalUserId = externalUserId;
        this.question = question;
        this.replyRef = replyRef;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void markProcessing() {
        this.status = InboundStatus.PROCESSING;
    }

    public void markDone(Long chatSessionId) {
        this.status = InboundStatus.DONE;
        this.chatSessionId = chatSessionId;
    }

    public void markFailed(String error) {
        this.status = InboundStatus.FAILED;
        this.error = truncate(error);
    }

    public void markSkipped(String reason) {
        this.status = InboundStatus.SKIPPED;
        this.error = truncate(reason);
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 1000 ? value.substring(0, 1000) : value;
    }

    public Long getId() {
        return id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public Long getInstallationId() {
        return installationId;
    }

    public String getProviderEventId() {
        return providerEventId;
    }

    public String getChannelId() {
        return channelId;
    }

    public String getExternalUserId() {
        return externalUserId;
    }

    public String getQuestion() {
        return question;
    }

    public String getReplyRef() {
        return replyRef;
    }

    public InboundStatus getStatus() {
        return status;
    }

    public Long getChatSessionId() {
        return chatSessionId;
    }

    public String getError() {
        return error;
    }
}
