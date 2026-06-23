package com.example.rag.admin;

import com.example.rag.project.ProjectRole;

public record AdminProjectMemberResponse(
        Long userId,
        String email,
        String name,
        ProjectRole role
) {
}
