package com.example.rag.chat;

/**
 * 답변 생성 시 문서(Context) 의존도를 정한다.
 *
 * <ul>
 *   <li>{@link #STRICT} — 문서 Context만 근거로 답한다. 검색 컨텍스트가 없고 대화 history도 없으면
 *       LLM을 호출하지 않고 "관련 정보 없음"으로 단락한다. (기본값)</li>
 *   <li>{@link #HYBRID} — 문서 Context를 우선하되, 부족하면 모델의 일반 지식으로 보충한다.
 *       검색 컨텍스트가 없어도 답변을 시도한다.</li>
 * </ul>
 */
public enum AnswerMode {
    STRICT,
    HYBRID;

    public static AnswerMode orDefault(AnswerMode mode) {
        return mode == null ? STRICT : mode;
    }
}
