package com.example.rag.admin;

import com.example.rag.common.ApiException;
import com.example.rag.project.ProjectDeletionRepository;
import com.example.rag.project.ProjectEntity;
import com.example.rag.project.ProjectMember;
import com.example.rag.project.ProjectMemberRepository;
import com.example.rag.project.ProjectRepository;
import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectDeletionRepository projectDeletionRepository;
    private final AdminUsageRepository adminUsageRepository;

    public AdminService(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            ProjectDeletionRepository projectDeletionRepository,
            AdminUsageRepository adminUsageRepository
    ) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectDeletionRepository = projectDeletionRepository;
        this.adminUsageRepository = adminUsageRepository;
    }

    /**
     * SUPER_ADMIN 권한 관문. 프로젝트의 requireAdmin과 동일한 수동 가드 패턴이다.
     * JWT claim이 stale일 수 있으므로 DB의 현재 role을 신뢰한다.
     */
    public void requireSuperAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "인증 사용자를 찾을 수 없습니다."));
        if (user.isDeleted() || !user.isSuperAdmin()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }
    }

    @Transactional(readOnly = true)
    public List<DailyUsageResponse> systemDailyUsage(LocalDate from, LocalDate to) {
        return adminUsageRepository.systemDailyUsage(from, to);
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        Map<Long, Long> totals = adminUsageRepository.totalTokensByUser();
        return userRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc().stream()
                .map(user -> new AdminUserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getName(),
                        user.getRole(),
                        user.getCreatedAt(),
                        totals.getOrDefault(user.getId(), 0L)
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DailyUsageResponse> userDailyUsage(Long userId, LocalDate from, LocalDate to) {
        if (!userRepository.existsById(userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다.");
        }
        return adminUsageRepository.userDailyUsage(userId, from, to);
    }

    @Transactional
    public DeleteUserResponse deleteUser(Long actingUserId, Long targetUserId) {
        if (actingUserId.equals(targetUserId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "자기 자신은 삭제할 수 없습니다.");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        if (target.isDeleted()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미 삭제된 사용자입니다.");
        }
        target.markDeleted();
        userRepository.save(target);
        return new DeleteUserResponse(true);
    }

    @Transactional(readOnly = true)
    public List<AdminProjectResponse> listProjects() {
        Map<Long, Long> totals = adminUsageRepository.totalTokensByProject();
        return projectRepository.findAll().stream()
                .filter(project -> !projectDeletionRepository.existsByProjectId(project.getId()))
                .sorted(Comparator.comparing(ProjectEntity::getCreatedAt).reversed())
                .map(project -> toProjectResponse(project, totals))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DailyUsageResponse> projectDailyUsage(Long projectId, LocalDate from, LocalDate to) {
        if (!projectRepository.existsById(projectId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다.");
        }
        return adminUsageRepository.projectDailyUsage(projectId, from, to);
    }

    private AdminProjectResponse toProjectResponse(ProjectEntity project, Map<Long, Long> totals) {
        List<AdminProjectMemberResponse> members = projectMemberRepository
                .findAllWithUserByProjectId(project.getId()).stream()
                .map(this::toMemberResponse)
                .toList();
        return new AdminProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getCreatedAt(),
                project.getCreatedBy().getEmail(),
                members,
                totals.getOrDefault(project.getId(), 0L)
        );
    }

    private AdminProjectMemberResponse toMemberResponse(ProjectMember member) {
        User user = member.getUser();
        return new AdminProjectMemberResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                member.getRole()
        );
    }
}
