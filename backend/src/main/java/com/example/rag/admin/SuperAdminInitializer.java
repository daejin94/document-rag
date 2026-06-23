package com.example.rag.admin;

import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 앱 시작 시 {@code SUPER_ADMIN_EMAIL}로 지정된 이메일 계정을 SUPER_ADMIN으로 승격한다.
 * 이메일이 비어 있거나 해당 유저가 아직 가입하지 않았으면 조용히 통과한다.
 */
@Component
public class SuperAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminInitializer.class);

    private final AdminProperties adminProperties;
    private final UserRepository userRepository;

    public SuperAdminInitializer(AdminProperties adminProperties, UserRepository userRepository) {
        this.adminProperties = adminProperties;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = adminProperties.superAdminEmail();
        if (email == null || email.isBlank()) {
            return;
        }
        userRepository.findByEmail(email.trim()).ifPresentOrElse(user -> {
            if (!user.isSuperAdmin()) {
                user.promoteToSuperAdmin();
                userRepository.save(user);
                log.info("'{}' 계정을 SUPER_ADMIN으로 승격했습니다.", email);
            }
        }, () -> log.warn("SUPER_ADMIN_EMAIL '{}'에 해당하는 계정이 없어 승격을 건너뜁니다.", email));
    }
}
