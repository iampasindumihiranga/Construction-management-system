package com.construction.repository;

import com.construction.model.ProjectDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectDocumentRepository extends JpaRepository<ProjectDocument, Long> {
    List<ProjectDocument> findByClientIdOrderByUploadedAtDesc(Long clientId);
    List<ProjectDocument> findByProjectIdOrderByUploadedAtDesc(Long projectId);
    List<ProjectDocument> findAllByOrderByUploadedAtDesc();
    void deleteByProjectId(Long projectId);
}
