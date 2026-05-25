package com.example.rag.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findAllByUserIdOrderByUpdatedAtDesc(Long userId);

    Optional<ChatSession> findByIdAndUserId(Long id, Long userId);
}
