package com.example.rag.project;

import com.example.rag.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ProjectResponse create(@AuthenticationPrincipal AuthUser authUser, @Valid @RequestBody CreateProjectRequest request) {
        return projectService.create(authUser.id(), request);
    }

    @GetMapping
    public List<ProjectResponse> list(@AuthenticationPrincipal AuthUser authUser) {
        return projectService.list(authUser.id());
    }

    @GetMapping("/{projectId}/members")
    public List<ProjectMemberResponse> members(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long projectId) {
        return projectService.members(authUser.id(), projectId);
    }

    @PostMapping("/{projectId}/members")
    public ProjectMemberResponse addMember(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long projectId,
            @Valid @RequestBody AddProjectMemberRequest request
    ) {
        return projectService.addMember(authUser.id(), projectId, request);
    }

    @DeleteMapping("/{projectId}/members/{memberUserId}")
    public DeleteProjectMemberResponse deleteMember(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long projectId,
            @PathVariable Long memberUserId
    ) {
        return projectService.deleteMember(authUser.id(), projectId, memberUserId);
    }
}
