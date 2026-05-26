package com.example.rag.project;

import com.example.rag.common.ApiException;
import com.example.rag.user.User;
import com.example.rag.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            UserRepository userRepository
    ) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ProjectResponse create(Long userId, CreateProjectRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "인증 사용자를 찾을 수 없습니다."));
        ProjectEntity project = projectRepository.save(new ProjectEntity(request.name().trim(), user));
        ProjectMember member = projectMemberRepository.save(new ProjectMember(project, user, ProjectRole.ADMIN));
        return toProjectResponse(member);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(Long userId) {
        return projectMemberRepository.findAllWithProjectByUserId(userId).stream()
                .map(this::toProjectResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> members(Long userId, Long projectId) {
        requireMember(projectId, userId);
        return projectMemberRepository.findAllWithUserByProjectId(projectId).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional
    public ProjectMemberResponse addMember(Long userId, Long projectId, AddProjectMemberRequest request) {
        requireAdmin(projectId, userId);
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 프로젝트 멤버입니다.");
        }
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));
        ProjectRole role = request.role() == null ? ProjectRole.MEMBER : request.role();
        ProjectMember member = projectMemberRepository.save(new ProjectMember(project, user, role));
        return toMemberResponse(member);
    }

    @Transactional
    public DeleteProjectMemberResponse deleteMember(Long userId, Long projectId, Long memberUserId) {
        requireAdmin(projectId, userId);
        if (userId.equals(memberUserId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "자기 자신은 삭제할 수 없습니다.");
        }
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, memberUserId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "프로젝트 멤버를 찾을 수 없습니다."));
        if (member.getRole() == ProjectRole.ADMIN
                && projectMemberRepository.countByProjectIdAndRole(projectId, ProjectRole.ADMIN) <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "마지막 관리자는 삭제할 수 없습니다.");
        }
        projectMemberRepository.delete(member);
        return new DeleteProjectMemberResponse(true);
    }

    public void requireMember(Long projectId, Long userId) {
        if (projectMemberRepository.findByProjectIdAndUserId(projectId, userId).isEmpty()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "프로젝트 접근 권한이 없습니다.");
        }
    }

    public void requireAdmin(Long projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "프로젝트 접근 권한이 없습니다."));
        if (member.getRole() != ProjectRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "프로젝트 관리자만 수행할 수 있습니다.");
        }
    }

    private ProjectResponse toProjectResponse(ProjectMember member) {
        ProjectEntity project = member.getProject();
        return new ProjectResponse(project.getId(), project.getName(), member.getRole(), project.getCreatedAt());
    }

    private ProjectMemberResponse toMemberResponse(ProjectMember member) {
        User user = member.getUser();
        return new ProjectMemberResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                member.getRole(),
                member.getCreatedAt()
        );
    }
}
