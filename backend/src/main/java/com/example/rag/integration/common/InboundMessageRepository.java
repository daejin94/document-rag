package com.example.rag.integration.common;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InboundMessageRepository extends JpaRepository<InboundMessage, Long> {

    boolean existsByInstallationIdAndProviderEventId(Long installationId, String providerEventId);

    /**
     * 같은 봇(설치)+사용자 대화의 가장 최근 세션을 찾아 후속 질문에 맥락을 이어 준다.
     * 세션이 연결된(=실제 RAG 질의가 수행된) 메시지만 대상으로 한다.
     */
    Optional<InboundMessage> findFirstByInstallationIdAndExternalUserIdAndChatSessionIdNotNullOrderByCreatedAtDesc(
            Long installationId, String externalUserId);
}
