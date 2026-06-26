package com.example.rag.integration.telegram;

import com.example.rag.integration.common.BotInstallation;
import com.example.rag.integration.common.BotInstallationRepository;
import com.example.rag.integration.common.Platform;
import com.example.rag.integration.config.IntegrationProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * polling 모드에서 등록된 모든 텔레그램 봇의 getUpdates를 주기적으로 호출한다(공개 URL이 없는 로컬·WSL 환경용).
 * 단일 스레드가 매 주기 설치 목록을 다시 읽어, 새로 등록된 봇도 다음 주기에 자동으로 폴링한다.
 * 봇별 offset은 메모리에 유지한다(짧은 폴링 timeout=0 + 간격 sleep).
 */
@Component
public class TelegramPoller implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(TelegramPoller.class);
    private static final int POLL_INTERVAL_MS = 1000;
    private static final int ERROR_BACKOFF_MS = 3000;

    private final IntegrationProperties.Telegram properties;
    private final TelegramApiClient apiClient;
    private final TelegramUpdateService updateService;
    private final BotInstallationRepository botInstallationRepository;

    private final Map<Long, Long> offsets = new HashMap<>();
    private volatile boolean running = false;
    private Thread pollThread;

    public TelegramPoller(IntegrationProperties properties,
                          TelegramApiClient apiClient,
                          TelegramUpdateService updateService,
                          BotInstallationRepository botInstallationRepository) {
        this.properties = properties.telegram();
        this.apiClient = apiClient;
        this.updateService = updateService;
        this.botInstallationRepository = botInstallationRepository;
    }

    @Override
    public void start() {
        if (!properties.isPolling()) {
            return;
        }
        running = true;
        pollThread = new Thread(this::loop, "telegram-poller");
        pollThread.setDaemon(true);
        pollThread.start();
        log.info("텔레그램 polling 시작(멀티봇)");
    }

    private void loop() {
        while (running) {
            List<BotInstallation> installations;
            try {
                installations = botInstallationRepository.findAllByPlatform(Platform.TELEGRAM);
            } catch (Exception e) {
                log.warn("봇 설치 목록 조회 실패, 재시도 대기", e);
                sleep(ERROR_BACKOFF_MS);
                continue;
            }
            for (BotInstallation installation : installations) {
                if (!running) {
                    return;
                }
                pollOne(installation);
            }
            sleep(POLL_INTERVAL_MS);
        }
    }

    private void pollOne(BotInstallation installation) {
        long offset = offsets.getOrDefault(installation.getId(), 0L);
        try {
            List<TelegramUpdate> updates = apiClient.getUpdates(installation.getBotToken(), offset, 0);
            for (TelegramUpdate update : updates) {
                updateService.handle(installation, update);
                if (update.updateId() != null) {
                    offsets.put(installation.getId(), update.updateId() + 1);
                }
            }
        } catch (Exception e) {
            log.warn("텔레그램 getUpdates 실패 installationId={}", installation.getId(), e);
        }
    }

    private void sleep(int millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            running = false;
        }
    }

    @Override
    public void stop() {
        running = false;
        if (pollThread != null) {
            pollThread.interrupt();
        }
    }

    @Override
    public boolean isRunning() {
        return running;
    }
}
