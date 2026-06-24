package com.example.rag.auth.oauth;

import com.example.rag.user.AuthProvider;
import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import com.example.rag.user.UserStatus;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OAuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final OAuthService oauthService = new OAuthService(userRepository);

    @Test
    void createsPendingGoogleUserWhenEmailIsNew() {
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OAuthLoginResult result = oauthService.loginOrRegisterGoogle("new@example.com", "신규", "google-sub-1");
        User user = result.user();

        assertThat(result.newlyRegistered()).isTrue();
        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.getName()).isEqualTo("신규");
        assertThat(user.getAuthProvider()).isEqualTo(AuthProvider.GOOGLE);
        assertThat(user.getProviderId()).isEqualTo("google-sub-1");
        // 기존 가입 흐름과 동일하게 승인 대기 상태로 생성되고 비밀번호는 없다.
        assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING);
        assertThat(user.hasPassword()).isFalse();
    }

    @Test
    void reusesExistingAccountWhenEmailAlreadyExists() {
        User existing = new User("exists@example.com", "hashed", "기존");
        when(userRepository.findByEmail("exists@example.com")).thenReturn(Optional.of(existing));

        OAuthLoginResult result = oauthService.loginOrRegisterGoogle("exists@example.com", "구글이름", "google-sub-2");

        assertThat(result.user()).isSameAs(existing);
        assertThat(result.newlyRegistered()).isFalse();
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void fallsBackToEmailWhenGoogleNameIsBlank() {
        when(userRepository.findByEmail("noname@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OAuthLoginResult result = oauthService.loginOrRegisterGoogle("noname@example.com", "  ", "google-sub-3");

        assertThat(result.user().getName()).isEqualTo("noname@example.com");
    }
}
