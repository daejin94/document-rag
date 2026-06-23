package com.example.rag.admin;

import com.example.rag.auth.AuthUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/usage/daily")
    public List<DailyUsageResponse> systemDailyUsage(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        adminService.requireSuperAdmin(authUser.id());
        return adminService.systemDailyUsage(from, to);
    }

    @GetMapping("/users")
    public List<AdminUserResponse> users(@AuthenticationPrincipal AuthUser authUser) {
        adminService.requireSuperAdmin(authUser.id());
        return adminService.listUsers();
    }

    @GetMapping("/users/{userId}/usage/daily")
    public List<DailyUsageResponse> userDailyUsage(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        adminService.requireSuperAdmin(authUser.id());
        return adminService.userDailyUsage(userId, from, to);
    }

    @DeleteMapping("/users/{userId}")
    public DeleteUserResponse deleteUser(@AuthenticationPrincipal AuthUser authUser, @PathVariable Long userId) {
        adminService.requireSuperAdmin(authUser.id());
        return adminService.deleteUser(authUser.id(), userId);
    }

    @GetMapping("/projects")
    public List<AdminProjectResponse> projects(@AuthenticationPrincipal AuthUser authUser) {
        adminService.requireSuperAdmin(authUser.id());
        return adminService.listProjects();
    }

    @GetMapping("/projects/{projectId}/usage/daily")
    public List<DailyUsageResponse> projectDailyUsage(
            @AuthenticationPrincipal AuthUser authUser,
            @PathVariable Long projectId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        adminService.requireSuperAdmin(authUser.id());
        return adminService.projectDailyUsage(projectId, from, to);
    }
}
