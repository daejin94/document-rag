package com.example.rag.user;

/**
 * 계정의 인증 수단. LOCAL은 이메일/비밀번호, GOOGLE은 구글 OAuth 로그인이다.
 */
public enum AuthProvider {
    LOCAL,
    GOOGLE
}
