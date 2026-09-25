package com.construction.repository;

import com.construction.model.MaterialRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MaterialRequestRepository extends JpaRepository<MaterialRequest, Long> {

    Optional<MaterialRequest> findByRequestCodeIgnoreCase(String requestCode);

    boolean existsByRequestCodeIgnoreCase(String requestCode);

    List<MaterialRequest> findByProjectIdOrderByRequestDateDesc(Long projectId);

    List<MaterialRequest> findByStatusOrderByRequestDateDesc(String status);

    long countByStatusIgnoreCase(String status);

    @Query("SELECT r FROM MaterialRequest r WHERE " +
            "(:projectId IS NULL OR r.project.id = :projectId) AND " +
            "(:materialId IS NULL OR r.material.id = :materialId) AND " +
            "(:status IS NULL OR LOWER(r.status) = LOWER(:status)) " +
            "ORDER BY r.requestDate DESC, r.id DESC")
    List<MaterialRequest> filterRequests(
            @Param("projectId") Long projectId,
            @Param("materialId") Long materialId,
            @Param("status") String status
    );
}
