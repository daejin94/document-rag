package com.example.rag.auth;

import com.example.rag.common.ApiException;
import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtService jwtService = mock(JwtService.class);
    private final AuthService authService = new AuthService(userRepository, passwordEncoder, jwtService);

    @Test
    void loginRejectsSocialAccountWithoutPassword() {
        // 구글로 가입한 계정(비밀번호 없음)에 이메일/비밀번호 로그인을 시도하면 안내와 함께 거부한다.
        User googleUser = User.googleUser("social@example.com", "소셜", "google-sub");
        when(userRepository.findByEmail("social@example.com")).thenReturn(Optional.of(googleUser));

        assertThatThrownBy(() -> authService.login(new LoginRequest("social@example.com", "anything")))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(ex.getMessage()).contains("구글 로그인");
                });
    }
}
