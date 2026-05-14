package com.example.rag.document;

import com.example.rag.common.ApiException;
import com.example.rag.llm.EmbeddingModelClient;
import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;

@Service
public class DocumentService {

    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentChunkJdbcRepository documentChunkJdbcRepository;
    private final FileStorageService fileStorageService;
    private final TextExtractor textExtractor;
    private final DocumentChunker documentChunker;
    private final EmbeddingModelClient embeddingModelClient;

    public DocumentService(
            UserRepository userRepository,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentChunkJdbcRepository documentChunkJdbcRepository,
            FileStorageService fileStorageService,
            TextExtractor textExtractor,
            DocumentChunker documentChunker,
            EmbeddingModelClient embeddingModelClient
    ) {
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentChunkJdbcRepository = documentChunkJdbcRepository;
        this.fileStorageService = fileStorageService;
        this.textExtractor = textExtractor;
        this.documentChunker = documentChunker;
        this.embeddingModelClient = embeddingModelClient;
    }

    public DocumentUploadResponse upload(Long userId, MultipartFile file, String title) {
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "파일이 비어 있습니다.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "인증 사용자를 찾을 수 없습니다."));
        String originalFileName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        Path storedPath = fileStorageService.store(file);
        DocumentEntity document = documentRepository.save(new DocumentEntity(
                user,
                title,
                originalFileName,
                storedPath.toString(),
                file.getContentType()
        ));

        try {
            document.markProcessing();
            documentRepository.save(document);
            String text = textExtractor.extract(storedPath, originalFileName);
            List<String> chunks = documentChunker.split(text);
            for (int i = 0; i < chunks.size(); i++) {
                List<Float> embedding = embeddingModelClient.embed(chunks.get(i));
                documentChunkJdbcRepository.save(document.getId(), i, chunks.get(i), embedding);
            }
            document.markCompleted();
            documentRepository.save(document);
        } catch (RuntimeException ex) {
            document.markFailed(ex.getMessage());
            documentRepository.save(document);
            throw ex;
        }

        return new DocumentUploadResponse(document.getId(), document.getTitle(), document.getStatus());
    }

    public List<DocumentListResponse> list(Long userId) {
        return documentRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(document -> new DocumentListResponse(
                        document.getId(),
                        document.getTitle(),
                        document.getOriginalFileName(),
                        document.getStatus(),
                        document.getCreatedAt()
                ))
                .toList();
    }

    public DocumentDetailResponse detail(Long userId, Long documentId) {
        DocumentEntity document = getOwnedDocument(userId, documentId);
        return new DocumentDetailResponse(
                document.getId(),
                document.getTitle(),
                document.getOriginalFileName(),
                document.getStatus(),
                documentChunkRepository.countByDocumentId(document.getId()),
                document.getCreatedAt()
        );
    }

    public DeleteDocumentResponse delete(Long userId, Long documentId) {
        DocumentEntity document = getOwnedDocument(userId, documentId);
        documentRepository.delete(document);
        fileStorageService.deleteQuietly(document.getFilePath());
        return new DeleteDocumentResponse(true);
    }

    private DocumentEntity getOwnedDocument(Long userId, Long documentId) {
        return documentRepository.findByIdAndUserId(documentId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다."));
    }
}
