package com.example.rag.chat;

import com.example.rag.document.SearchResult;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PromptBuilder {

    public String systemPrompt() {
        return """
                너는 사용자가 업로드한 문서를 기반으로 답변하는 AI assistant다.

                규칙:
                1. 반드시 제공된 Context 안의 정보만 사용해서 답변한다.
                2. Conversation History는 현재 질문의 지시어나 생략된 맥락을 이해하고 이전 답변을 이어가기 위해 사용한다.
                3. Context에 없는 내용은 추측하지 않는다.
                4. Context에 질문과 관련된 단서나 수치가 일부라도 있으면 확인 가능한 범위에서 답하고, 부족한 부분은 부족하다고 말한다.
                5. 답변은 한국어로 작성한다.
                6. 가능한 한 구체적으로 답변한다.
                7. 답변 마지막에는 참고한 문서명을 요약한다.
                8. 표에서 추출된 텍스트는 줄바꿈과 공백이 깨질 수 있으므로, 인접한 헤더와 행을 함께 해석한다.
                9. 사용자가 월세를 물으면 월임대료로, 보증금을 물으면 임대보증금으로 해석한다.
                10. 현재 질문이 이전 답변의 요약, 재설명, 비교, 형식 변경처럼 대화 자체를 대상으로 하면 Conversation History를 근거로 답한다.
                11. 문서 내용에 대한 새 사실을 묻는데 Context와 Conversation History 안에서도 답을 판단할 수 없으면 "등록된 문서에서 관련 정보를 찾을 수 없습니다."라고 답한다.
                """;
    }

    public String userPrompt(String question, List<SearchResult> results, List<ChatMessage> history) {
        StringBuilder builder = new StringBuilder();
        builder.append("[Context]\n");
        for (SearchResult result : results) {
            builder.append("[문서]\n")
                    .append("title: ").append(result.documentTitle()).append('\n')
                    .append("documentId: ").append(result.documentId()).append('\n')
                    .append("chunkIndex: ").append(result.chunkIndex()).append('\n')
                    .append("content:\n").append(result.content()).append("\n\n");
        }
        if (!history.isEmpty()) {
            builder.append("[Conversation History]\n");
            for (ChatMessage message : history) {
                builder.append(message.getRole()).append(": ").append(message.getContent()).append("\n\n");
            }
        }
        builder.append("[Current Question]\n").append(question);
        return builder.toString();
    }

    public String searchText(String question, List<ChatMessage> history) {
        StringBuilder builder = new StringBuilder();
        if (!history.isEmpty()) {
            builder.append("이전 대화:\n");
            for (ChatMessage message : history) {
                builder.append(message.getRole()).append(": ").append(message.getContent()).append('\n');
            }
            builder.append('\n');
        }
        builder.append("현재 질문:\n").append(question);
        return builder.toString();
    }
}
