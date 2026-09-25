package com.construction.service;

import com.construction.model.ClientNotification;
import com.construction.repository.ClientNotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ClientNotificationService {

    private final ClientNotificationRepository notificationRepository;

    public ClientNotificationService(ClientNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<ClientNotification> findByClientId(Long clientId) {
        return notificationRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    public long countUnread(Long clientId) {
        return notificationRepository.countByClientIdAndIsReadFalse(clientId);
    }

    public ClientNotification markAsRead(Long id) {
        ClientNotification notification = notificationRepository.findById(id).orElse(null);
        if (notification != null) {
            notification.setRead(true);
            return notificationRepository.save(notification);
        }
        return null;
    }

    public void markAllAsRead(Long clientId) {
        List<ClientNotification> list = notificationRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        for (ClientNotification n : list) {
            n.setRead(true);
        }
        notificationRepository.saveAll(list);
    }

    public ClientNotification create(ClientNotification notification) {
        return notificationRepository.save(notification);
    }
}
