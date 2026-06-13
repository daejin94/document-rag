package com.example.rag.project;

import jakarta.validation.constraints.NotBlank;

public record CreateProjectRequest(@NotBlank String name) {
}
