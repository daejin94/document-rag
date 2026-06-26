package com.example.rag.integration.common;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IdentityLinkRepository extends JpaRepository<IdentityLink, Long> {

    Optional<IdentityLink> findByPlatformAndExternalUserId(Platform platform, String externalUserId);
}
