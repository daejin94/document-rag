package com.example.rag.auth.oauth;

import com.example.rag.user.User;

/**
 * 구글 로그인 처리 결과. {@code newlyRegistered}는 이번 로그인에서 계정이 새로 생성되었는지를 나타낸다
 * (신규 가입 안내와 기존 승인 대기 안내를 구분하기 위함).
 */
public record OAuthLoginResult(User user, boolean newlyRegistered) {
}
