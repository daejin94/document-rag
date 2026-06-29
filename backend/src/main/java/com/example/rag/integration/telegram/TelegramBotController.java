package com.example.rag.integration.telegram;

import com.example.rag.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 프로젝트별 텔레그램 봇 등록 관리 API. 프로젝트 단위 경로 + 기존 멤버십 가드를 따른다.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/integrations/telegram/bots")
public class TelegramBotController {

    private final TelegramBotService botService;

    public TelegramBotController(TelegramBotService botService) {
        this.botService = botService;
    }

    @GetMapping
    public List<BotResponse> list(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long projectId) {
        return botService.list(authUser.id(), projectId);
    }

    @PostMapping
    public BotResponse register(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long projectId,
            @Valid @RequestBody RegisterBotRequest request) {
        return botService.register(authUser.id(), projectId, request.botToken());
    }

    @DeleteMapping("/{installationId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long projectId,
            @PathVariable Long installationId) {
        botService.delete(authUser.id(), projectId, installationId);
        return ResponseEntity.noContent().build();
    }
}
