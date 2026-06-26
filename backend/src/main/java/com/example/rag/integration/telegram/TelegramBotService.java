package com.example.rag.integration.telegram;

import com.example.rag.common.ApiException;
import com.example.rag.integration.common.BotInstallation;
import com.example.rag.integration.common.BotInstallationRepository;
import com.example.rag.integration.common.Platform;
import com.example.rag.integration.config.IntegrationProperties;
import com.example.rag.project.ProjectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

/**
 * 프로젝트에 텔레그램 봇을 등록/해제한다(봇 = 프로젝트). 등록 시 토큰 유효성을 getMe로 검증하고,
 * webhook 모드면 설치 단위 secret과 함께 텔레그램에 webhook을 등록한다.
 */
@Service
public class TelegramBotService {

    private static final Logger log = LoggerFactory.getLogger(TelegramBotService.class);
    private static final String SECRET_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int SECRET_LENGTH = 32;

    private final BotInstallationRepository botInstallationRepository;
    private final ProjectService projectService;
    private final TelegramApiClient apiClient;
    private final IntegrationProperties.Telegram properties;
    private final SecureRandom random = new SecureRandom();

    public TelegramBotService(BotInstallationRepository botInstallationRepository,
                              ProjectService projectService,
                              TelegramApiClient apiClient,
                              IntegrationProperties properties) {
        this.botInstallationRepository = botInstallationRepository;
        this.projectService = projectService;
        this.apiClient = apiClient;
        this.properties = properties.telegram();
    }

    @Transactional(readOnly = true)
    public List<BotResponse> list(Long userId, Long projectId) {
        projectService.requireMember(projectId, userId);
        return botInstallationRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(BotResponse::from)
                .toList();
    }

    @Transactional
    public BotResponse register(Long userId, Long projectId, String rawToken) {
        projectService.requireAdmin(projectId, userId);
        String token = rawToken == null ? "" : rawToken.trim();
        if (token.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "봇 토큰을 입력해 주세요.");
        }
        if (botInstallationRepository.existsByPlatformAndBotToken(Platform.TELEGRAM, token)) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 등록된 봇 토큰입니다.");
        }

        String username = apiClient.getMeUsername(token);
        String secret = generateSecret();
        BotInstallation installation = botInstallationRepository.save(
                new BotInstallation(Platform.TELEGRAM, projectId, token, username, secret, userId));

        if (properties.isWebhook()) {
            registerWebhook(installation);
        }
        return BotResponse.from(installation);
    }

    @Transactional
    public void delete(Long userId, Long projectId, Long installationId) {
        projectService.requireAdmin(projectId, userId);
        BotInstallation installation = botInstallationRepository.findByIdAndProjectId(installationId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "등록된 봇을 찾을 수 없습니다."));
        try {
            apiClient.deleteWebhook(installation.getBotToken());
        } catch (Exception e) {
            log.warn("텔레그램 webhook 해제 실패(무시) installationId={}", installationId, e);
        }
        botInstallationRepository.delete(installation);
    }

    private void registerWebhook(BotInstallation installation) {
        String base = properties.publicBaseUrl();
        if (base == null || base.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "webhook 모드이지만 공개 베이스 URL(app.integration.telegram.public-base-url)이 설정되지 않았습니다.");
        }
        String url = trimTrailingSlash(base) + "/api/integrations/telegram/webhook/" + installation.getId();
        apiClient.setWebhook(installation.getBotToken(), url, installation.getSecretToken());
        log.info("텔레그램 webhook 등록 installationId={} url={}", installation.getId(), url);
    }

    private String trimTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String generateSecret() {
        StringBuilder sb = new StringBuilder(SECRET_LENGTH);
        for (int i = 0; i < SECRET_LENGTH; i++) {
            sb.append(SECRET_ALPHABET.charAt(random.nextInt(SECRET_ALPHABET.length())));
        }
        return sb.toString();
    }
}
