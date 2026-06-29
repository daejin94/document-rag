package com.example.rag.integration.common;

public enum InboundStatus {
    /** 수신·저장됨, 처리 대기 */
    PENDING,
    /** 워커가 RAG 질의 처리 중 */
    PROCESSING,
    /** 답변 생성·전송 완료 */
    DONE,
    /** 처리 중 오류 */
    FAILED,
    /** 바인딩 없음/계정 미연결 등으로 RAG 질의 없이 안내만 한 경우 */
    SKIPPED
}
