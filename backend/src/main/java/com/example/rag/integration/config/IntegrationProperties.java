package com.example.rag.integration.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 외부 채팅 플랫폼 연동 설정. 봇 토큰은 더 이상 전역 설정이 아니라 프로젝트별로 DB(bot_installations)에 등록한다.
 * 여기서는 수신 모드(polling/webhook)와 webhook 등록에 쓸 공개 URL만 둔다.
 */
@ConfigurationProperties(prefix = "app.integration")
public record IntegrationProperties(
        @DefaultValue Telegram telegram
) {

    public record Telegram(
            @DefaultValue("false") boolean enabled,
            /** polling | webhook | off — 등록된 모든 봇에 공통 적용 */
            @DefaultValue("off") String mode,
            /** webhook 모드에서 봇 webhook URL을 만들 공개 베이스(예: https://your-host). 끝에 경로를 붙인다. */
            @DefaultValue("") String publicBaseUrl,
            @DefaultValue("https://api.telegram.org") String apiBaseUrl
    ) {
        public boolean isPolling() {
            return enabled && "polling".equalsIgnoreCase(mode);
        }

        public boolean isWebhook() {
            return enabled && "webhook".equalsIgnoreCase(mode);
        }
    }
}
