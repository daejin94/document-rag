package com.example.rag.integration.telegram;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TelegramLinkCodeRepository extends JpaRepository<TelegramLinkCode, Long> {

    Optional<TelegramLinkCode> findByCode(String code);
}
