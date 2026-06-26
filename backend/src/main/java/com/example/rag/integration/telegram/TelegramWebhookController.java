package com.example.rag.integration.telegram;

import com.example.rag.integration.common.BotInstallation;
import com.example.rag.integration.common.BotInstallationRepository;
import com.example.rag.integration.common.Platform;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 텔레그램 webhook 수신 엔드포인트. 경로의 installationId로 어느 봇이 받았는지 식별하고,
 * 설치별 secret token 헤더로 보호한다(JWT 아님, SecurityConfig permitAll).
 * 텔레그램 재시도를 피하기 위해 검증·접수만 동기로 하고 즉시 200을 반환한다.
 */
@RestController
@RequestMapping("/api/integrations/telegram")
public class TelegramWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TelegramWebhookController.class);
    private static final String SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";

    private final BotInstallationRepository botInstallationRepository;
    private final TelegramUpdateService updateService;

    public TelegramWebhookController(BotInstallationRepository botInstallationRepository,
                                     TelegramUpdateService updateService) {
        this.botInstallationRepository = botInstallationRepository;
        this.updateService = updateService;
    }

    @PostMapping("/webhook/{installationId}")
    public ResponseEntity<Void> webhook(
            @PathVariable Long installationId,
            @RequestHeader(value = SECRET_HEADER, required = false) String secretToken,
            @RequestBody TelegramUpdate update) {
        BotInstallation installation = botInstallationRepository.findById(installationId).orElse(null);
        if (installation == null || installation.getPlatform() != Platform.TELEGRAM) {
            // 알 수 없는 설치 — 200으로 흘려보내 텔레그램 재시도를 막는다.
            return ResponseEntity.ok().build();
        }
        if (!installation.getSecretToken().equals(secretToken)) {
            log.warn("텔레그램 webhook secret token 불일치 installationId={}", installationId);
            return ResponseEntity.status(401).build();
        }
        updateService.handle(installation, update);
        return ResponseEntity.ok().build();
    }
}
