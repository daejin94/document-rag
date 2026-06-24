package com.example.rag.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * 구글 인증 자체가 실패(사용자 취소, 토큰 교환 실패 등)했을 때 프론트엔드로 에러와 함께 돌려보낸다.
 */
@Component
public class OAuth2LoginFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final OAuthProperties properties;
    private final HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository;

    public OAuth2LoginFailureHandler(OAuthProperties properties,
                                     HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository) {
        this.properties = properties;
        this.authorizationRequestRepository = authorizationRequestRepository;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        authorizationRequestRepository.removeAuthorizationRequestCookies(response);
        String targetUrl = UriComponentsBuilder.fromUriString(properties.frontendUrl())
                .queryParam("oauth_error", "failed")
                .build()
                .encode()
                .toUriString();
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
