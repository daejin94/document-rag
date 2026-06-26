package com.example.rag.integration.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 수신 메시지의 동기 처리 단계: 멱등성 확보 → 계정 연결 확인 → 작업 행 저장.
 * 프로젝트는 메시지를 받은 봇 설치(B-1)로 결정된다. 실제 RAG 질의는 {@link BotQueryWorker}가 비동기로 수행한다.
 */
@Service
public class InboundMessageService {

    private final InboundMessageRepository inboundMessageRepository;
    private final IdentityLinkRepository identityLinkRepository;

    public InboundMessageService(InboundMessageRepository inboundMessageRepository,
                                 IdentityLinkRepository identityLinkRepository) {
        this.inboundMessageRepository = inboundMessageRepository;
        this.identityLinkRepository = identityLinkRepository;
    }

    /**
     * 질문 1건을 접수한다. 중복이면 무시하고, 계정 연결이 없으면 SKIPPED로 기록한다.
     * 정상 접수된 경우에만 워커가 처리할 대상(inboundId, projectId, userId)을 반환한다.
     */
    @Transactional
    public InboundIntakeResult intake(BotInstallation installation, String providerEventId, String channelId,
                                      String externalUserId, String question, String replyRef) {
        Platform platform = installation.getPlatform();
        if (inboundMessageRepository.existsByInstallationIdAndProviderEventId(installation.getId(), providerEventId)) {
            return InboundIntakeResult.of(InboundIntakeResult.Outcome.DUPLICATE);
        }

        InboundMessage message;
        try {
            message = inboundMessageRepository.save(new InboundMessage(
                    platform, installation.getId(), providerEventId, channelId, externalUserId, question, replyRef));
        } catch (DataIntegrityViolationException e) {
            // 동시 수신으로 유니크 제약 충돌 → 다른 스레드가 이미 접수한 것으로 간주
            return InboundIntakeResult.of(InboundIntakeResult.Outcome.DUPLICATE);
        }

        Optional<IdentityLink> identity = identityLinkRepository.findByPlatformAndExternalUserId(platform, externalUserId);
        if (identity.isEmpty()) {
            message.markSkipped("외부 사용자 계정 미연결");
            return InboundIntakeResult.of(InboundIntakeResult.Outcome.NOT_LINKED);
        }

        return InboundIntakeResult.accepted(message.getId(), installation.getProjectId(), identity.get().getUserId());
    }

    @Transactional(readOnly = true)
    public InboundMessage get(Long inboundId) {
        return inboundMessageRepository.findById(inboundId)
                .orElseThrow(() -> new IllegalStateException("수신 메시지를 찾을 수 없습니다: " + inboundId));
    }

    /** 같은 봇+사용자 대화의 가장 최근 세션 id. 없으면 null(새 세션 생성). */
    @Transactional(readOnly = true)
    public Long findPriorSessionId(Long installationId, String externalUserId) {
        return inboundMessageRepository
                .findFirstByInstallationIdAndExternalUserIdAndChatSessionIdNotNullOrderByCreatedAtDesc(
                        installationId, externalUserId)
                .map(InboundMessage::getChatSessionId)
                .orElse(null);
    }

    @Transactional
    public void markProcessing(Long inboundId) {
        get(inboundId).markProcessing();
    }

    @Transactional
    public void markDone(Long inboundId, Long chatSessionId) {
        get(inboundId).markDone(chatSessionId);
    }

    @Transactional
    public void markFailed(Long inboundId, String error) {
        get(inboundId).markFailed(error);
    }
}
