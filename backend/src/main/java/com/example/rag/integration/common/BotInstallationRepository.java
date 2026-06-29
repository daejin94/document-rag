package com.example.rag.integration.common;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BotInstallationRepository extends JpaRepository<BotInstallation, Long> {

    boolean existsByPlatformAndBotToken(Platform platform, String botToken);

    List<BotInstallation> findAllByProjectIdOrderByCreatedAtDesc(Long projectId);

    List<BotInstallation> findAllByPlatform(Platform platform);

    Optional<BotInstallation> findByIdAndProjectId(Long id, Long projectId);
}
