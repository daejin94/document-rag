package com.example.rag.document;

import com.example.rag.common.ApiException;
import com.example.rag.llm.EmbeddingModelClient;
import com.example.rag.project.ProjectEntity;
import com.example.rag.project.ProjectRepository;
import com.example.rag.project.ProjectService;
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
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentChunkJdbcRepository documentChunkJdbcRepository;
    private final FileStorageService fileStorageService;
    private final TextExtractor textExtractor;
    private final DocumentChunker documentChunker;
    private final EmbeddingModelClient embeddingModelClient;

    public DocumentService(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            ProjectService projectService,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentChunkJdbcRepository documentChunkJdbcRepository,
            FileStorageService fileStorageService,
            TextExtractor textExtractor,
            DocumentChunker documentChunker,
            EmbeddingModelClient embeddingModelClient
    ) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentChunkJdbcRepository = documentChunkJdbcRepository;
        this.fileStorageService = fileStorageService;
        this.textExtractor = textExtractor;
        this.documentChunker = documentChunker;
        this.embeddingModelClient = embeddingModelClient;
    }

    public DocumentUploadResponse upload(Long userId, Long projectId, MultipartFile file, String title) {
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "파일이 비어 있습니다.");
        }
        projectService.requireMember(projectId, userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "인증 사용자를 찾을 수 없습니다."));
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));
        String originalFileName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        Path storedPath = fileStorageService.store(file);
        DocumentEntity document = documentRepository.save(new DocumentEntity(
                user,
                project,
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

    public List<DocumentListResponse> list(Long userId, Long projectId) {
        projectService.requireMember(projectId, userId);
        return documentRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId).stream()
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
        DocumentEntity document = getAccessibleDocument(userId, documentId);
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
        DocumentEntity document = getAccessibleDocument(userId, documentId);
        projectService.requireAdmin(document.getProject().getId(), userId);
        documentRepository.delete(document);
        fileStorageService.deleteQuietly(document.getFilePath());
        return new DeleteDocumentResponse(true);
    }

    private DocumentEntity getAccessibleDocument(Long userId, Long documentId) {
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다."));
        projectService.requireMember(document.getProject().getId(), userId);
        return document;
    }
}
