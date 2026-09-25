package com.construction.controller;

import com.construction.model.ClientFeedback;
import com.construction.service.ClientFeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
public class ClientFeedbackController {

    private final ClientFeedbackService feedbackService;

    public ClientFeedbackController(ClientFeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping
    public ResponseEntity<ClientFeedback> submit(@Valid @RequestBody ClientFeedback feedback) {
        return ResponseEntity.status(HttpStatus.CREATED).body(feedbackService.submit(feedback));
    }

    @GetMapping
    public ResponseEntity<List<ClientFeedback>> findAll(@RequestParam(required = false) Long clientId) {
        if (clientId != null) {
            return ResponseEntity.ok(feedbackService.findByClientId(clientId));
        }
        return ResponseEntity.ok(feedbackService.findAll());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("averageRating", feedbackService.getAverageRating());
        summary.put("totalReviews", feedbackService.findAll().size());
        return ResponseEntity.ok(summary);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        feedbackService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
