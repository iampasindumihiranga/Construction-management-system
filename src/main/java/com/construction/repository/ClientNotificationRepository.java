package com.construction.repository;

import com.construction.model.ClientNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientNotificationRepository extends JpaRepository<ClientNotification, Long> {
    List<ClientNotification> findByClientIdOrderByCreatedAtDesc(Long clientId);
    long countByClientIdAndIsReadFalse(Long clientId);
}
