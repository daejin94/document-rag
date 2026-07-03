package com.example.rag.document;

import com.example.rag.common.ApiException;
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
    private final FileStorageService fileStorageService;
    private final DocumentProcessor documentProcessor;

    public DocumentService(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            ProjectService projectService,
            DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            FileStorageService fileStorageService,
            DocumentProcessor documentProcessor
    ) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.fileStorageService = fileStorageService;
        this.documentProcessor = documentProcessor;
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
            documentProcessor.process(document.getId(), userId, projectId);
        } catch (RuntimeException ex) {
            // executor 큐 포화 등으로 비동기 접수 자체가 실패한 경우
            document.markFailed("문서 처리를 시작하지 못했습니다.");
            documentRepository.save(document);
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "문서 처리를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
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

    public DocumentDetailResponse detail(Long userId, Long projectId, Long documentId) {
        DocumentEntity document = getAccessibleDocument(userId, projectId, documentId);
        return new DocumentDetailResponse(
                document.getId(),
                document.getTitle(),
                document.getOriginalFileName(),
                document.getStatus(),
                documentChunkRepository.countByDocumentId(document.getId()),
                document.getErrorMessage(),
                document.getCreatedAt()
        );
    }

    public DeleteDocumentResponse delete(Long userId, Long projectId, Long documentId) {
        DocumentEntity document = getAccessibleDocument(userId, projectId, documentId);
        projectService.requireAdmin(projectId, userId);
        documentRepository.delete(document);
        fileStorageService.deleteQuietly(document.getFilePath());
        return new DeleteDocumentResponse(true);
    }

    private DocumentEntity getAccessibleDocument(Long userId, Long projectId, Long documentId) {
        projectService.requireMember(projectId, userId);
        return documentRepository.findByIdAndProjectId(documentId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다."));
    }
}
