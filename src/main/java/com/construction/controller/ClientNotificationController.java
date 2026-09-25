package com.construction.controller;

import com.construction.model.ClientNotification;
import com.construction.service.ClientNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class ClientNotificationController {

    private final ClientNotificationService notificationService;

    public ClientNotificationController(ClientNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<ClientNotification>> findByClient(@RequestParam Long clientId) {
        return ResponseEntity.ok(notificationService.findByClientId(clientId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> countUnread(@RequestParam Long clientId) {
        Map<String, Object> map = new HashMap<>();
        map.put("unreadCount", notificationService.countUnread(clientId));
        return ResponseEntity.ok(map);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ClientNotification> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@RequestParam Long clientId) {
        notificationService.markAllAsRead(clientId);
        return ResponseEntity.ok().build();
    }
}
