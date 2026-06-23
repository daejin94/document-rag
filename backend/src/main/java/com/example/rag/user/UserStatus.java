package com.example.rag.user;

/**
 * 가입 승인 상태. 신규 가입은 PENDING으로 시작하고, 관리자가 승인하면 APPROVED가 되어
 * 로그인할 수 있다. 거절된 계정은 REJECTED로 두어 로그인을 막는다.
 */
public enum UserStatus {
    PENDING,
    APPROVED,
    REJECTED
}
