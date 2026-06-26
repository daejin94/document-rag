package com.example.rag.integration.telegram;

import com.example.rag.auth.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * 로그인 사용자가 텔레그램 계정 연결용 일회용 코드를 발급받는다.
 * 발급한 코드를 채팅방에서 /link &lt;code&gt; 로 입력하면 계정이 연결된다.
 */
@RestController
@RequestMapping("/api/integrations/telegram")
public class TelegramLinkController {

    private final TelegramLinkService linkService;

    public TelegramLinkController(TelegramLinkService linkService) {
        this.linkService = linkService;
    }

    @PostMapping("/link-codes")
    public LinkCodeResponse issue(@AuthenticationPrincipal AuthUser authUser) {
        TelegramLinkCode code = linkService.issueCode(authUser.id());
        return new LinkCodeResponse(code.getCode(), code.getExpiresAt());
    }

    public record LinkCodeResponse(String code, Instant expiresAt) {
    }
}
