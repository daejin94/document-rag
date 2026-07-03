package com.example.rag.document;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 문서 추출/embedding 처리는 업로드 요청 스레드와 분리해 비동기로 실행한다.
 * MVP는 인메모리 ThreadPoolTaskExecutor를 사용한다(인스턴스 재시작 시 인플라이트 문서는 PROCESSING으로 남을 수 있음).
 */
@Configuration
@EnableAsync
public class DocumentAsyncConfig {

    public static final String DOCUMENT_EXECUTOR = "documentProcessingExecutor";

    @Bean(DOCUMENT_EXECUTOR)
    public Executor documentProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("doc-process-");
        executor.initialize();
        return executor;
    }
}
