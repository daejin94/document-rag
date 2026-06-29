package com.example.rag.integration.common;

/**
 * 플랫폼별 답변 전송 추상화. 워커는 플랫폼을 의식하지 않고 이 인터페이스로 답변/안내를 보낸다.
 * 봇 자격증명(텔레그램 봇 토큰 등)은 메시지를 받은 봇 설치에서 가져와 전달한다.
 */
public interface BotReplySender {

    Platform platform();

    /**
     * @param botCredential 봇 자격증명(텔레그램 봇 토큰 등, 플랫폼별 불투명 문자열)
     * @param channelId     대상 채널(텔레그램 chat_id 등)
     * @param text          전송할 텍스트
     * @param replyRef      답글 대상 참조(텔레그램 message_id 등). null이면 일반 메시지로 전송
     */
    void sendText(String botCredential, String channelId, String text, String replyRef);
}
