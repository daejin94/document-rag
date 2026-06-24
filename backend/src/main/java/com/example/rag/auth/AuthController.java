package com.example.rag.auth;

import jakarta.validation.Valid;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository;

    public AuthController(AuthService authService,
                          ObjectProvider<ClientRegistrationRepository> clientRegistrationRepository) {
        this.authService = authService;
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    @PostMapping("/signup")
    public SignupResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * 활성화된 소셜 로그인 제공자를 알려준다. 프론트는 이 값으로 "구글로 로그인" 버튼 노출 여부를 정한다.
     * 자격증명이 없으면 ClientRegistrationRepository 빈이 없으므로 google=false가 된다.
     */
    @GetMapping("/oauth-providers")
    public OAuthProvidersResponse oauthProviders() {
        ClientRegistrationRepository repository = clientRegistrationRepository.getIfAvailable();
        boolean google = repository != null && repository.findByRegistrationId("google") != null;
        return new OAuthProvidersResponse(google);
    }
}
