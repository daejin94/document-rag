package com.example.rag.chat;

import com.example.rag.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/query")
    public QueryResponse query(@AuthenticationPrincipal AuthUser authUser, @Valid @RequestBody QueryRequest request) {
        return chatService.query(authUser.id(), request);
    }

    @GetMapping("/sessions")
    public List<ChatSessionResponse> sessions(@AuthenticationPrincipal AuthUser authUser) {
        return chatService.sessions(authUser.id());
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public List<ChatMessageResponse> messages(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long sessionId) {
        return chatService.messages(authUser.id(), sessionId);
    }
}
