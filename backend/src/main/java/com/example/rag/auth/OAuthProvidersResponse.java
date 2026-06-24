package com.example.rag.auth;

/**
 * 활성화된 소셜 로그인 제공자 여부. 현재는 구글만 지원한다.
 */
public record OAuthProvidersResponse(boolean google) {
}
