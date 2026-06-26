package com.example.rag.integration.common;

/**
 * 수신 메시지 인테이크 결과. 동기 처리(멱등성·계정 확인) 후 워커 실행 여부를 결정한다.
 * 프로젝트는 봇 설치로 결정되므로 바인딩 미존재 케이스는 없다.
 */
public record InboundIntakeResult(Outcome outcome, Long inboundId, Long projectId, Long userId) {

    public enum Outcome {
        /** 정상 접수 — 워커가 RAG 질의를 수행해야 함 */
        ACCEPTED,
        /** 이미 처리된(또는 처리 중인) 중복 이벤트 — 무시 */
        DUPLICATE,
        /** 외부 사용자가 앱 계정에 연결되지 않음 */
        NOT_LINKED
    }

    public static InboundIntakeResult accepted(Long inboundId, Long projectId, Long userId) {
        return new InboundIntakeResult(Outcome.ACCEPTED, inboundId, projectId, userId);
    }

    public static InboundIntakeResult of(Outcome outcome) {
        return new InboundIntakeResult(outcome, null, null, null);
    }
}
