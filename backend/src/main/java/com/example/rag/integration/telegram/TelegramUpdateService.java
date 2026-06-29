package com.example.rag.integration.telegram;

import com.example.rag.integration.common.BotInstallation;
import com.example.rag.integration.common.BotQueryWorker;
import com.example.rag.integration.common.InboundIntakeResult;
import com.example.rag.integration.common.InboundMessageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * 텔레그램 업데이트 1건을 해석해 명령(/start·/link·/ask)과 질문을 분기한다.
 * 프로젝트는 메시지를 받은 봇 설치로 결정된다(B-1). webhook·polling 양쪽 수신 경로가 공통으로 사용한다.
 */
@Service
public class TelegramUpdateService {

    private static final Logger log = LoggerFactory.getLogger(TelegramUpdateService.class);

    private static final String HELP =
            "DocQ 봇입니다. 등록된 프로젝트 문서를 기반으로 질문에 답합니다.\n"
                    + "• 계정 연결: /link <앱에서 발급한 코드>\n"
                    + "• 질문: 메시지를 그대로 입력하거나 /ask <질문>\n"
                    + "먼저 앱에서 /link 로 계정을 연결해 주세요.";
    private static final String NOT_LINKED =
            "먼저 계정을 연결해 주세요. 앱에서 연결 코드를 발급받아 /link <코드> 를 입력하면 됩니다.";

    private final InboundMessageService inboundMessageService;
    private final BotQueryWorker botQueryWorker;
    private final TelegramLinkService linkService;
    private final TelegramReplySender replySender;

    public TelegramUpdateService(InboundMessageService inboundMessageService,
                                 BotQueryWorker botQueryWorker,
                                 TelegramLinkService linkService,
                                 TelegramReplySender replySender) {
        this.inboundMessageService = inboundMessageService;
        this.botQueryWorker = botQueryWorker;
        this.linkService = linkService;
        this.replySender = replySender;
    }

    public void handle(BotInstallation installation, TelegramUpdate update) {
        if (update == null || !update.hasText() || update.fromBot()) {
            return;
        }
        TelegramUpdate.TelegramMessage message = update.message();
        String token = installation.getBotToken();
        String channelId = String.valueOf(message.chat().id());
        String externalUserId = message.from() != null ? String.valueOf(message.from().id()) : null;
        String replyRef = String.valueOf(message.messageId());
        String eventId = String.valueOf(update.updateId());
        String text = message.text().trim();

        try {
            route(installation, token, channelId, externalUserId, replyRef, eventId, text);
        } catch (Exception e) {
            log.error("텔레그램 업데이트 처리 실패 updateId={}", update.updateId(), e);
        }
    }

    private void route(BotInstallation installation, String token, String channelId, String externalUserId,
                       String replyRef, String eventId, String text) {
        if (text.startsWith("/start") || text.startsWith("/help")) {
            replySender.sendText(token, channelId, HELP, replyRef);
            return;
        }
        if (text.startsWith("/link")) {
            String code = stripCommand(text, "/link");
            replySender.sendText(token, channelId, linkService.link(externalUserId, code), replyRef);
            return;
        }
        if (text.startsWith("/ask")) {
            String question = stripCommand(text, "/ask");
            if (question.isBlank()) {
                replySender.sendText(token, channelId, "사용법: /ask <질문>", replyRef);
                return;
            }
            processQuestion(installation, token, channelId, externalUserId, replyRef, eventId, question);
            return;
        }
        if (text.startsWith("/")) {
            replySender.sendText(token, channelId, "지원하지 않는 명령입니다.\n\n" + HELP, replyRef);
            return;
        }
        processQuestion(installation, token, channelId, externalUserId, replyRef, eventId, text);
    }

    private void processQuestion(BotInstallation installation, String token, String channelId, String externalUserId,
                                 String replyRef, String eventId, String question) {
        InboundIntakeResult result = inboundMessageService.intake(
                installation, eventId, channelId, externalUserId, question, replyRef);
        switch (result.outcome()) {
            case ACCEPTED -> botQueryWorker.process(result.inboundId(), result.projectId(), result.userId());
            case NOT_LINKED -> replySender.sendText(token, channelId, NOT_LINKED, replyRef);
            case DUPLICATE -> { /* 중복 수신 — 무시 */ }
        }
    }

    private String stripCommand(String text, String command) {
        String rest = text.substring(command.length());
        // /ask@botname 형태의 멘션 접미사 제거
        if (rest.startsWith("@")) {
            int space = rest.indexOf(' ');
            rest = space < 0 ? "" : rest.substring(space);
        }
        return rest.trim();
    }
}
