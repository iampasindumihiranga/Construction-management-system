package com.construction.repository;

import com.construction.model.ProjectRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRequestRepository extends JpaRepository<ProjectRequest, Long> {
    List<ProjectRequest> findByClientIdOrderByCreatedAtDesc(Long clientId);
    List<ProjectRequest> findAllByOrderByCreatedAtDesc();
    List<ProjectRequest> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
    List<ProjectRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<ProjectRequest> findBySelectedDesignId(Long designId);
}
