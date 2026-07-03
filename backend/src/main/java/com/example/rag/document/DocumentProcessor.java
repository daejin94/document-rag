package com.example.rag.document;

import com.example.rag.llm.EmbedResult;
import com.example.rag.llm.EmbeddingModelClient;
import com.example.rag.usage.TokenUsageRecorder;
import com.example.rag.usage.TokenUsageType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * 업로드된 문서의 추출→chunk→embedding→저장을 비동기로 처리한다.
 * OpenAI 호출 동안 DB 커넥션을 점유하지 않도록 embedding을 모두 끝낸 뒤,
 * chunk 저장과 COMPLETED 전이를 하나의 트랜잭션으로 묶는다(부분 저장 방지).
 */
@Service
public class DocumentProcessor {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessor.class);

    private final DocumentRepository documentRepository;
    private final DocumentChunkJdbcRepository documentChunkJdbcRepository;
    private final TextExtractor textExtractor;
    private final DocumentChunker documentChunker;
    private final EmbeddingModelClient embeddingModelClient;
    private final TokenUsageRecorder tokenUsageRecorder;
    private final TransactionTemplate transactionTemplate;

    public DocumentProcessor(
            DocumentRepository documentRepository,
            DocumentChunkJdbcRepository documentChunkJdbcRepository,
            TextExtractor textExtractor,
            DocumentChunker documentChunker,
            EmbeddingModelClient embeddingModelClient,
            TokenUsageRecorder tokenUsageRecorder,
            TransactionTemplate transactionTemplate
    ) {
        this.documentRepository = documentRepository;
        this.documentChunkJdbcRepository = documentChunkJdbcRepository;
        this.textExtractor = textExtractor;
        this.documentChunker = documentChunker;
        this.embeddingModelClient = embeddingModelClient;
        this.tokenUsageRecorder = tokenUsageRecorder;
        this.transactionTemplate = transactionTemplate;
    }

    @Async(DocumentAsyncConfig.DOCUMENT_EXECUTOR)
    public void process(Long documentId, Long userId, Long projectId) {
        DocumentEntity document = documentRepository.findById(documentId).orElse(null);
        if (document == null) {
            return;
        }
        try {
            document.markProcessing();
            documentRepository.save(document);

            ExtractionResult extraction = textExtractor.extract(
                    Path.of(document.getFilePath()), document.getOriginalFileName());
            List<String> chunks = documentChunker.split(extraction.text());
            List<List<Float>> embeddings = new ArrayList<>(chunks.size());
            int embeddingTokens = 0;
            for (String chunk : chunks) {
                EmbedResult embedding = embeddingModelClient.embed(chunk);
                embeddingTokens += embedding.totalTokens();
                embeddings.add(embedding.embedding());
            }

            transactionTemplate.executeWithoutResult(status -> {
                for (int i = 0; i < chunks.size(); i++) {
                    documentChunkJdbcRepository.save(documentId, i, chunks.get(i), embeddings.get(i));
                }
                document.markCompleted();
                documentRepository.save(document);
            });

            tokenUsageRecorder.record(
                    userId, projectId, null,
                    TokenUsageType.EMBEDDING_UPLOAD, embeddingModelClient.modelName(),
                    embeddingTokens, 0
            );
            if (extraction.usedOcr()) {
                tokenUsageRecorder.record(
                        userId, projectId, null,
                        TokenUsageType.OCR_UPLOAD, extraction.ocrModel(),
                        extraction.ocrPromptTokens(), extraction.ocrCompletionTokens()
                );
            }
        } catch (RuntimeException ex) {
            log.warn("문서 처리 실패 documentId={}", documentId, ex);
            markFailedQuietly(documentId, ex.getMessage());
        }
    }

    private void markFailedQuietly(Long documentId, String message) {
        // 처리 중 문서가 삭제됐을 수 있으므로 다시 조회해 존재할 때만 FAILED로 기록한다
        try {
            documentRepository.findById(documentId).ifPresent(document -> {
                document.markFailed(message);
                documentRepository.save(document);
            });
        } catch (RuntimeException ex) {
            log.error("문서 실패 상태 기록 실패 documentId={}", documentId, ex);
        }
    }
}
