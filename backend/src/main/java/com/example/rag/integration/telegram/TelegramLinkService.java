package com.example.rag.integration.telegram;

import com.example.rag.common.ApiException;
import com.example.rag.integration.common.IdentityLink;
import com.example.rag.integration.common.IdentityLinkRepository;
import com.example.rag.integration.common.Platform;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * 텔레그램 계정 연결. 앱에서 일회용 코드를 발급하고, 채팅방의 /link &lt;code&gt; 명령으로 소비한다.
 */
@Service
public class TelegramLinkService {

    private static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;

    private final TelegramLinkCodeRepository linkCodeRepository;
    private final IdentityLinkRepository identityLinkRepository;
    private final SecureRandom random = new SecureRandom();

    public TelegramLinkService(TelegramLinkCodeRepository linkCodeRepository,
                               IdentityLinkRepository identityLinkRepository) {
        this.linkCodeRepository = linkCodeRepository;
        this.identityLinkRepository = identityLinkRepository;
    }

    /** 로그인 사용자를 위한 일회용 연결 코드 발급. */
    @Transactional
    public TelegramLinkCode issueCode(Long userId) {
        String code = generateCode();
        return linkCodeRepository.save(new TelegramLinkCode(code, userId, Instant.now().plus(CODE_TTL)));
    }

    /**
     * 채팅방에서 /link 로 들어온 코드를 검증·소비하고 외부 사용자 ↔ 앱 계정 매핑을 만든다.
     * 결과는 채팅방에 그대로 보낼 안내 문구로 반환한다.
     */
    @Transactional
    public String link(String externalUserId, String code) {
        if (code == null || code.isBlank()) {
            return "사용법: /link <앱에서 발급한 코드>";
        }
        Optional<TelegramLinkCode> found = linkCodeRepository.findByCode(code.trim().toUpperCase());
        if (found.isEmpty()) {
            return "유효하지 않은 코드입니다. 앱에서 코드를 다시 발급해 주세요.";
        }
        TelegramLinkCode linkCode = found.get();
        if (!linkCode.isUsable(Instant.now())) {
            return "만료되었거나 이미 사용된 코드입니다. 앱에서 코드를 다시 발급해 주세요.";
        }

        linkCode.markUsed();
        identityLinkRepository.findByPlatformAndExternalUserId(Platform.TELEGRAM, externalUserId)
                .ifPresentOrElse(
                        existing -> existing.relinkTo(linkCode.getUserId()),
                        () -> identityLinkRepository.save(
                                new IdentityLink(Platform.TELEGRAM, externalUserId, linkCode.getUserId())));
        return "계정 연결이 완료되었습니다. 이제 이 채팅방에서 질문하면 프로젝트 문서를 기반으로 답변해 드립니다.";
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        String code = sb.toString();
        if (linkCodeRepository.findByCode(code).isPresent()) {
            // 극히 드문 충돌 시 재귀로 재생성
            return generateCode();
        }
        return code;
    }
}
