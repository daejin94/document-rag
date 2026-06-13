package com.example.rag.project;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectDeletionRepository extends JpaRepository<ProjectDeletion, Long> {

    boolean existsByProjectId(Long projectId);
}
