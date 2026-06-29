package com.example.rag.auth.oauth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * OAuth 로그인 완료 후 사용자를 돌려보낼 프론트엔드 주소.
 * 성공 시 {@code ?token=...}, 실패 시 {@code ?oauth_error=...}를 덧붙여 리다이렉트한다.
 */
@ConfigurationProperties(prefix = "app.oauth")
public record OAuthProperties(
        String frontendUrl
) {
}
