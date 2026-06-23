package com.example.rag.auth;

import com.example.rag.common.ApiException;
import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public SignupResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");
        }
        User user = userRepository.save(new User(
                request.email(),
                passwordEncoder.encode(request.password()),
                request.name()
        ));
        return new SignupResponse(user.getId(), user.getEmail(), user.getName());
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."));
        if (user.isDeleted()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        // 비밀번호 확인 후에 가입 승인 상태를 검사한다(계정 존재 여부 노출을 줄이기 위함).
        switch (user.getStatus()) {
            case PENDING -> throw new ApiException(HttpStatus.FORBIDDEN, "가입 승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다.");
            case REJECTED -> throw new ApiException(HttpStatus.FORBIDDEN, "가입이 거절되었습니다. 관리자에게 문의해주세요.");
            default -> { /* APPROVED: 통과 */ }
        }
        String accessToken = jwtService.createAccessToken(user.getId(), user.getEmail(), user.getRole());
        return new LoginResponse(accessToken, accessToken);
    }
}
