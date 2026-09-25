package com.construction.controller;

import com.construction.model.DownPayment;
import com.construction.service.DownPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/down-payments")
public class DownPaymentController {

    private final DownPaymentService downPaymentService;

    public DownPaymentController(DownPaymentService downPaymentService) {
        this.downPaymentService = downPaymentService;
    }

    /**
     * Create a new down payment (Client starting a project or Client Manager recording it).
     */
    @PostMapping
    public ResponseEntity<DownPayment> create(@Valid @RequestBody DownPayment payment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(downPaymentService.create(payment));
    }

    /**
     * Get payments — optionally filter by clientId, projectId, search text, or status.
     * - Client portal: calls with clientId (and optionally projectId) to see only their own payments.
     * - Client Manager: can call without clientId to manage payments for all clients and projects.
     */
    @GetMapping
    public ResponseEntity<List<DownPayment>> findAll(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(downPaymentService.findAll(clientId, projectId, search, status));
    }

    /**
     * Get a single payment by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DownPayment> findById(@PathVariable Long id) {
        return ResponseEntity.ok(downPaymentService.findById(id));
    }

    /**
     * Full update of a down payment (Client Manager).
     */
    @PutMapping("/{id}")
    public ResponseEntity<DownPayment> update(@PathVariable Long id,
                                               @Valid @RequestBody DownPayment payment) {
        return ResponseEntity.ok(downPaymentService.update(id, payment));
    }

    /**
     * Quick status update.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<DownPayment> updateStatus(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(downPaymentService.updateStatus(id, status));
    }

    /**
     * Delete a down payment (Client Manager).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        downPaymentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Payment summary: totals, required, paid, remaining, progress, validity counts.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) Long projectId) {
        return ResponseEntity.ok(downPaymentService.getPaymentSummary(clientId, projectId));
    }
}
