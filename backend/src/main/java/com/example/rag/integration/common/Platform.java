package com.example.rag.integration.common;

/**
 * 연동 대상 외부 채팅 플랫폼. MVP는 TELEGRAM만 지원하며, SLACK은 이후 확장 지점이다.
 */
public enum Platform {
    TELEGRAM,
    SLACK
}
