package com.example.rag.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findAllByUserIdAndProjectIdOrderByUpdatedAtDesc(Long userId, Long projectId);

    Optional<ChatSession> findByIdAndUserIdAndProjectId(Long id, Long userId, Long projectId);
}
