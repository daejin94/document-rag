package com.example.rag.project;

import com.example.rag.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "project_deletions")
public class ProjectDeletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by_user_id", nullable = false)
    private User deletedBy;

    @Column(nullable = false)
    private Instant deletedAt;

    protected ProjectDeletion() {
    }

    public ProjectDeletion(ProjectEntity project, User deletedBy) {
        this.project = project;
        this.deletedBy = deletedBy;
    }

    @PrePersist
    void prePersist() {
        deletedAt = Instant.now();
    }
}
