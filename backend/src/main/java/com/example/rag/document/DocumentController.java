package com.example.rag.document;

import com.example.rag.auth.AuthUser;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public DocumentUploadResponse upload(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam MultipartFile file,
            @RequestParam @NotBlank String title
    ) {
        return documentService.upload(authUser.id(), file, title);
    }

    @GetMapping
    public List<DocumentListResponse> list(@AuthenticationPrincipal AuthUser authUser) {
        return documentService.list(authUser.id());
    }

    @GetMapping("/{documentId}")
    public DocumentDetailResponse detail(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long documentId) {
        return documentService.detail(authUser.id(), documentId);
    }

    @DeleteMapping("/{documentId}")
    public DeleteDocumentResponse delete(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long documentId) {
        return documentService.delete(authUser.id(), documentId);
    }
}
