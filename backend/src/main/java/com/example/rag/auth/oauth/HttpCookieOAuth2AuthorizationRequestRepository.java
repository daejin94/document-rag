package com.example.rag.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.Serializable;
import java.util.Base64;

/**
 * Authorization 요청을 HTTP 세션 대신 단기 쿠키에 저장한다. SecurityConfig가 stateless이므로
 * 세션 기반 기본 구현(HttpSessionOAuth2AuthorizationRequestRepository)을 쓸 수 없기 때문이다.
 *
 * <p>구글로 리다이렉트되었다가 콜백으로 돌아오는 짧은 시간 동안만 유지되며, SameSite=Lax로 두어
 * 구글에서 콜백으로 돌아오는 top-level GET 요청에 쿠키가 포함되도록 한다.
 */
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    public static final String OAUTH2_AUTH_REQUEST_COOKIE = "oauth2_auth_request";
    private static final int COOKIE_EXPIRE_SECONDS = 180;

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return readCookie(request)
                .map(value -> deserialize(value, OAuth2AuthorizationRequest.class))
                .orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
                                         HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            removeAuthorizationRequestCookies(response);
            return;
        }
        addCookie(response, serialize(authorizationRequest));
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
                                                                 HttpServletResponse response) {
        // 콜백 처리 시 호출된다. 저장된 요청을 돌려주되 쿠키 삭제는 성공/실패 핸들러에서 처리한다.
        return loadAuthorizationRequest(request);
    }

    public void removeAuthorizationRequestCookies(HttpServletResponse response) {
        ResponseCookie cookie = baseCookie("", 0).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private java.util.Optional<String> readCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return java.util.Optional.empty();
        }
        for (var cookie : request.getCookies()) {
            if (OAUTH2_AUTH_REQUEST_COOKIE.equals(cookie.getName())) {
                return java.util.Optional.of(cookie.getValue());
            }
        }
        return java.util.Optional.empty();
    }

    private void addCookie(HttpServletResponse response, String value) {
        ResponseCookie cookie = baseCookie(value, COOKIE_EXPIRE_SECONDS).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value, int maxAge) {
        return ResponseCookie.from(OAUTH2_AUTH_REQUEST_COOKIE, value)
                .path("/")
                .httpOnly(true)
                .secure(false) // 로컬 개발(http) 기준. 운영(https)에서는 true 권장.
                .sameSite("Lax")
                .maxAge(maxAge);
    }

    private static String serialize(Serializable object) {
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ObjectOutputStream oos = new ObjectOutputStream(bos)) {
            oos.writeObject(object);
            oos.flush();
            return Base64.getUrlEncoder().encodeToString(bos.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException("Authorization 요청 직렬화 실패", e);
        }
    }

    private static <T> T deserialize(String value, Class<T> type) {
        byte[] bytes = Base64.getUrlDecoder().decode(value);
        try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(bytes))) {
            return type.cast(ois.readObject());
        } catch (Exception e) {
            throw new IllegalStateException("Authorization 요청 역직렬화 실패", e);
        }
    }
}
