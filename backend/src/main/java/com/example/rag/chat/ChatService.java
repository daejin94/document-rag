package com.example.rag.chat;

import com.example.rag.common.ApiException;
import com.example.rag.document.DocumentChunk;
import com.example.rag.document.DocumentChunkJdbcRepository;
import com.example.rag.document.DocumentChunkRepository;
import com.example.rag.document.DocumentRepository;
import com.example.rag.document.RagProperties;
import com.example.rag.document.SearchResult;
import com.example.rag.llm.ChatModelClient;
import com.example.rag.llm.ChatModelRequest;
import com.example.rag.llm.ChatModelResult;
import com.example.rag.llm.EmbeddingModelClient;
import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ChatService {

    private static final String NO_CONTEXT_ANSWER = "등록된 문서에서 관련 정보를 찾을 수 없습니다.";

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentChunkJdbcRepository documentChunkJdbcRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final AnswerSourceRepository answerSourceRepository;
    private final EmbeddingModelClient embeddingModelClient;
    private final ChatModelClient chatModelClient;
    private final PromptBuilder promptBuilder;
    private final RagProperties ragProperties;

    public ChatService(
            UserRepository userRepository,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentChunkJdbcRepository documentChunkJdbcRepository,
            ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository,
            AnswerSourceRepository answerSourceRepository,
            EmbeddingModelClient embeddingModelClient,
            ChatModelClient chatModelClient,
            PromptBuilder promptBuilder,
            RagProperties ragProperties
    ) {
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentChunkJdbcRepository = documentChunkJdbcRepository;
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.answerSourceRepository = answerSourceRepository;
        this.embeddingModelClient = embeddingModelClient;
        this.chatModelClient = chatModelClient;
        this.promptBuilder = promptBuilder;
        this.ragProperties = ragProperties;
    }

    @Transactional
    public QueryResponse query(Long userId, QueryRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "인증 사용자를 찾을 수 없습니다."));
        validateDocumentOwnership(userId, request.documentIds());

        ChatSession session = chatSessionRepository.save(new ChatSession(user, titleFromQuestion(request.question())));
        chatMessageRepository.save(new ChatMessage(session, MessageRole.USER, request.question()));

        List<Float> questionEmbedding = embeddingModelClient.embed(request.question());
        List<SearchResult> searchResults = documentChunkJdbcRepository.search(
                userId,
                request.documentIds(),
                questionEmbedding,
                ragProperties.topK()
        );

        if (searchResults.isEmpty() || searchResults.getFirst().similarity() < ragProperties.similarityThreshold()) {
            ChatMessage assistantMessage = chatMessageRepository.save(new ChatMessage(session, MessageRole.ASSISTANT, NO_CONTEXT_ANSWER));
            return new QueryResponse(
                    assistantMessage.getContent(),
                    List.of(),
                    new ModelResponse(chatModelClient.modelName(), embeddingModelClient.modelName()),
                    new UsageResponse(0, 0)
            );
        }

        ChatModelResult modelResult = chatModelClient.generate(new ChatModelRequest(
                promptBuilder.systemPrompt(),
                promptBuilder.userPrompt(request.question(), searchResults)
        ));
        ChatMessage assistantMessage = chatMessageRepository.save(new ChatMessage(session, MessageRole.ASSISTANT, modelResult.answer()));

        for (SearchResult result : searchResults) {
            DocumentChunk chunk = documentChunkRepository.findById(result.chunkId())
                    .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "검색된 chunk를 찾을 수 없습니다."));
            answerSourceRepository.save(new AnswerSource(assistantMessage, chunk, result.similarity()));
        }

        return new QueryResponse(
                modelResult.answer(),
                searchResults.stream().map(this::toSourceResponse).toList(),
                new ModelResponse(chatModelClient.modelName(), embeddingModelClient.modelName()),
                new UsageResponse(modelResult.promptTokens(), modelResult.completionTokens())
        );
    }

    @Transactional(readOnly = true)
    public List<ChatSessionResponse> sessions(Long userId) {
        return chatSessionRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(session -> new ChatSessionResponse(session.getId(), session.getTitle(), session.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> messages(Long userId, Long sessionId) {
        chatSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "채팅 세션을 찾을 수 없습니다."));
        return chatMessageRepository.findAllByChatSessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(message -> new ChatMessageResponse(
                        message.getRole(),
                        message.getContent(),
                        sourcesForMessage(message),
                        message.getCreatedAt()
                ))
                .toList();
    }

    private void validateDocumentOwnership(Long userId, List<Long> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) {
            return;
        }
        for (Long documentId : documentIds) {
            if (documentRepository.findByIdAndUserId(documentId, userId).isEmpty()) {
                throw new ApiException(HttpStatus.FORBIDDEN, "접근할 수 없는 문서가 포함되어 있습니다.");
            }
        }
    }

    private SourceResponse toSourceResponse(SearchResult result) {
        String preview = result.content();
        if (preview.length() > 160) {
            preview = preview.substring(0, 160) + "...";
        }
        return new SourceResponse(
                result.documentId(),
                result.documentTitle(),
                result.chunkId(),
                result.chunkIndex(),
                result.similarity(),
                preview
        );
    }

    private List<SourceResponse> sourcesForMessage(ChatMessage message) {
        if (message.getRole() != MessageRole.ASSISTANT) {
            return List.of();
        }
        return answerSourceRepository.findAllByChatMessageId(message.getId()).stream()
                .map(source -> {
                    var chunk = source.getDocumentChunk();
                    var document = chunk.getDocument();
                    return new SourceResponse(
                            document.getId(),
                            document.getTitle(),
                            chunk.getId(),
                            chunk.getChunkIndex(),
                            source.getSimilarityScore(),
                            preview(chunk.getContent())
                    );
                })
                .toList();
    }

    private String preview(String content) {
        if (content.length() <= 160) {
            return content;
        }
        return content.substring(0, 160) + "...";
    }

    private String titleFromQuestion(String question) {
        String normalized = question.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= 40) {
            return normalized;
        }
        return normalized.substring(0, 40);
    }
}
