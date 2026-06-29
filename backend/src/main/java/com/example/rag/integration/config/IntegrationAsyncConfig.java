package com.example.rag.integration.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 수신 메시지(질문)의 RAG 처리는 webhook/polling 수신 스레드와 분리해 비동기로 실행한다.
 * MVP는 인메모리 ThreadPoolTaskExecutor를 사용한다(인스턴스 재시작 시 인플라이트 유실 가능).
 */
@Configuration
@EnableAsync
public class IntegrationAsyncConfig {

    public static final String BOT_EXECUTOR = "botQueryExecutor";

    @Bean(BOT_EXECUTOR)
    public Executor botQueryExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("bot-query-");
        executor.initialize();
        return executor;
    }
}
