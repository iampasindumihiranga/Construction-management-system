package com.construction.repository;

import com.construction.model.InquiryMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InquiryMessageRepository extends JpaRepository<InquiryMessage, Long> {
    long countByInquiryId(Long inquiryId);
}
