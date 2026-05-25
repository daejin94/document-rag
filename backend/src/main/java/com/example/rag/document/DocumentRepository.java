package com.example.rag.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {

    List<DocumentEntity> findAllByProjectIdOrderByCreatedAtDesc(Long projectId);

    Optional<DocumentEntity> findByIdAndProjectId(Long id, Long projectId);

    boolean existsByIdAndProjectId(Long id, Long projectId);
}
