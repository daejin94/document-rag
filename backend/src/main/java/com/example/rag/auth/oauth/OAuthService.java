package com.example.rag.auth.oauth;

import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 구글 OAuth 로그인 사용자를 우리 사용자 계정과 연결한다. 이메일을 기준으로 기존 계정이 있으면
 * 재사용하고(구글이 이메일을 검증하므로), 없으면 승인 대기(PENDING) 상태로 새로 생성한다.
 */
@Service
public class OAuthService {

    private final UserRepository userRepository;

    public OAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public OAuthLoginResult loginOrRegisterGoogle(String email, String name, String providerId) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            return new OAuthLoginResult(existing.get(), false);
        }
        User created = userRepository.save(
                User.googleUser(email, (name == null || name.isBlank()) ? email : name, providerId));
        return new OAuthLoginResult(created, true);
    }
}
