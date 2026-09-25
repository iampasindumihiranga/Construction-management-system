package com.construction.repository;

import com.construction.model.ClientFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientFeedbackRepository extends JpaRepository<ClientFeedback, Long> {
    List<ClientFeedback> findByClientIdOrderBySubmittedAtDesc(Long clientId);
    List<ClientFeedback> findAllByOrderBySubmittedAtDesc();

    @Query("SELECT AVG(f.rating) FROM ClientFeedback f")
    Double getAverageRating();
    void deleteByProjectId(Long projectId);
}
