package com.construction.repository;

import com.construction.model.ClientInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientInquiryRepository extends JpaRepository<ClientInquiry, Long> {
    List<ClientInquiry> findByClientIdOrderByCreatedAtDesc(Long clientId);
    List<ClientInquiry> findAllByOrderByCreatedAtDesc();
    List<ClientInquiry> findByStatusOrderByCreatedAtDesc(String status);
    void deleteByProjectId(Long projectId);
    List<ClientInquiry> findByDesignId(Long designId);
}
