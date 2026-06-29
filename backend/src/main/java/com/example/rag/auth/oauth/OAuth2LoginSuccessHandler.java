package com.example.rag.auth.oauth;

import com.example.rag.auth.JwtService;
import com.example.rag.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * 구글 인증 성공 후 처리. 사용자를 우리 계정과 연결하고, 승인 상태에 따라 프론트엔드로 리다이렉트한다.
 * 승인된 계정이면 JWT를 발급해 {@code ?token=...}으로, 그 외에는 {@code ?oauth_error=...}로 돌려보낸다.
 */
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final OAuthService oauthService;
    private final JwtService jwtService;
    private final OAuthProperties properties;
    private final HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository;

    public OAuth2LoginSuccessHandler(OAuthService oauthService, JwtService jwtService, OAuthProperties properties,
                                     HttpCookieOAuth2AuthorizationRequestRepository authorizationRequestRepository) {
        this.oauthService = oauthService;
        this.jwtService = jwtService;
        this.properties = properties;
        this.authorizationRequestRepository = authorizationRequestRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        authorizationRequestRepository.removeAuthorizationRequestCookies(response);

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String email = oauthUser.getAttribute("email");
        String name = oauthUser.getAttribute("name");
        String providerId = oauthUser.getAttribute("sub");

        if (email == null || email.isBlank()) {
            redirect(request, response, errorUrl("no_email"));
            return;
        }

        OAuthLoginResult result = oauthService.loginOrRegisterGoogle(email, name, providerId);
        User user = result.user();

        String targetUrl;
        if (user.isDeleted()) {
            targetUrl = errorUrl("disabled");
        } else {
            switch (user.getStatus()) {
                // 이번에 새로 가입한 경우와 이미 가입돼 대기 중인 경우를 구분해 안내한다.
                case PENDING -> targetUrl = errorUrl(result.newlyRegistered() ? "signup" : "pending");
                case REJECTED -> targetUrl = errorUrl("rejected");
                default -> {
                    String token = jwtService.createAccessToken(user.getId(), user.getEmail(), user.getRole());
                    targetUrl = UriComponentsBuilder.fromUriString(properties.frontendUrl())
                            .queryParam("token", token)
                            .build()
                            .encode()
                            .toUriString();
                }
            }
        }
        redirect(request, response, targetUrl);
    }

    private String errorUrl(String reason) {
        return UriComponentsBuilder.fromUriString(properties.frontendUrl())
                .queryParam("oauth_error", reason)
                .build()
                .encode()
                .toUriString();
    }

    private void redirect(HttpServletRequest request, HttpServletResponse response, String targetUrl) throws IOException {
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
