package com.example.rag.integration.common;

import com.example.rag.chat.ChatService;
import com.example.rag.chat.QueryRequest;
import com.example.rag.chat.QueryResponse;
import com.example.rag.chat.SourceResponse;
import com.example.rag.common.ApiException;
import com.example.rag.integration.config.IntegrationAsyncConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 수신 질문을 비동기로 RAG 처리한다. 기존 읽기 경로 {@link ChatService#query}를 그대로 재사용하며,
 * query 내부의 멤버십 가드(requireMember)가 권한까지 검증한다.
 * 답변은 메시지를 받은 봇 설치의 토큰으로 같은 채널에 회신한다.
 */
@Component
public class BotQueryWorker {

    private static final Logger log = LoggerFactory.getLogger(BotQueryWorker.class);
    private static final String GENERIC_ERROR = "죄송합니다. 답변을 생성하는 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    private final ChatService chatService;
    private final InboundMessageService inboundMessageService;
    private final BotInstallationRepository botInstallationRepository;
    private final Map<Platform, BotReplySender> replySenders;

    public BotQueryWorker(ChatService chatService,
                          InboundMessageService inboundMessageService,
                          BotInstallationRepository botInstallationRepository,
                          List<BotReplySender> replySenders) {
        this.chatService = chatService;
        this.inboundMessageService = inboundMessageService;
        this.botInstallationRepository = botInstallationRepository;
        this.replySenders = new EnumMap<>(Platform.class);
        replySenders.forEach(sender -> this.replySenders.put(sender.platform(), sender));
    }

    @Async(IntegrationAsyncConfig.BOT_EXECUTOR)
    public void process(Long inboundId, Long projectId, Long userId) {
        InboundMessage message = inboundMessageService.get(inboundId);
        BotReplySender sender = replySenders.get(message.getPlatform());
        if (sender == null) {
            log.error("플랫폼 {} 의 답변 전송기가 없습니다.", message.getPlatform());
            return;
        }
        BotInstallation installation = botInstallationRepository.findById(message.getInstallationId()).orElse(null);
        if (installation == null) {
            log.error("봇 설치를 찾을 수 없어 답변을 보낼 수 없습니다 inboundId={}", inboundId);
            inboundMessageService.markFailed(inboundId, "봇 설치가 삭제됨");
            return;
        }
        String token = installation.getBotToken();
        String channelId = message.getChannelId();
        String replyRef = message.getReplyRef();

        inboundMessageService.markProcessing(inboundId);
        try {
            Long priorSessionId = inboundMessageService.findPriorSessionId(
                    message.getInstallationId(), message.getExternalUserId());

            // 봇 채널은 모드/임계값 선택 UI가 없으므로 둘 다 null → ChatService에서 기본값으로 처리한다.
            QueryResponse response = chatService.query(
                    userId, projectId, new QueryRequest(message.getQuestion(), null, priorSessionId, null, null));

            inboundMessageService.markDone(inboundId, response.sessionId());
            sender.sendText(token, channelId, formatAnswer(response), replyRef);
        } catch (ApiException e) {
            // 멤버십 거부 등 예상 가능한 오류는 사용자에게 사유를 그대로 안내한다.
            inboundMessageService.markFailed(inboundId, e.getMessage());
            sender.sendText(token, channelId, e.getMessage(), replyRef);
        } catch (Exception e) {
            log.error("봇 질의 처리 실패 inboundId={}", inboundId, e);
            inboundMessageService.markFailed(inboundId, e.toString());
            sender.sendText(token, channelId, GENERIC_ERROR, replyRef);
        }
    }

    private String formatAnswer(QueryResponse response) {
        String answer = response.answer();
        List<SourceResponse> sources = response.sources();
        if (sources == null || sources.isEmpty()) {
            return answer;
        }
        Set<String> titles = sources.stream()
                .map(SourceResponse::documentTitle)
                .filter(title -> title != null && !title.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (titles.isEmpty()) {
            return answer;
        }
        String sourceLine = String.join(", ", titles);
        return answer + "\n\n📎 출처: " + sourceLine;
    }
}
