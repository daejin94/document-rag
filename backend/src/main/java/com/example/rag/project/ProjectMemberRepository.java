package com.example.rag.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    Optional<ProjectMember> findByProjectIdAndUserId(Long projectId, Long userId);

    boolean existsByProjectIdAndUserId(Long projectId, Long userId);

    @Query("""
            select member
            from ProjectMember member
            join fetch member.project project
            where member.user.id = :userId
            order by project.name asc
            """)
    List<ProjectMember> findAllWithProjectByUserId(@Param("userId") Long userId);

    @Query("""
            select member
            from ProjectMember member
            join fetch member.user user
            where member.project.id = :projectId
            order by member.role asc, user.email asc
            """)
    List<ProjectMember> findAllWithUserByProjectId(@Param("projectId") Long projectId);
}
