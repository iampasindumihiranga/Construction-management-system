package com.construction.controller;

import com.construction.model.ClientInquiry;
import com.construction.service.ClientInquiryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/api/inquiries")
public class ClientInquiryController {

    private final ClientInquiryService inquiryService;

    public ClientInquiryController(ClientInquiryService inquiryService) {
        this.inquiryService = inquiryService;
    }

    @PostMapping
    public ResponseEntity<ClientInquiry> create(@Valid @RequestBody ClientInquiry inquiry) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inquiryService.create(inquiry));
    }

    @GetMapping
    public ResponseEntity<List<ClientInquiry>> findAll(@RequestParam(required = false) Long clientId) {
        if (clientId != null) {
            return ResponseEntity.ok(inquiryService.findByClientId(clientId));
        }
        return ResponseEntity.ok(inquiryService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientInquiry> findById(@PathVariable Long id) {
        return ResponseEntity.ok(inquiryService.findById(id));
    }

    @PutMapping("/{id}/respond")
    public ResponseEntity<ClientInquiry> respond(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String responseText = body.get("response");
        String respondedBy = body.get("respondedBy");
        return ResponseEntity.ok(inquiryService.respond(id, responseText, respondedBy));
    }

    @PutMapping("/{id}/decision")
    public ResponseEntity<ClientInquiry> submitDecision(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String decision = (String) body.get("decision");
        String decisionRemarks = (String) body.get("decisionRemarks");
        String duration = (String) body.get("estimatedDuration");
        String decidedBy = (String) body.get("decidedBy");

        java.math.BigDecimal budget = null;
        if (body.get("estimatedBudget") != null) {
            try {
                budget = new java.math.BigDecimal(body.get("estimatedBudget").toString());
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(inquiryService.submitDecision(id, decision, decisionRemarks, budget, duration, decidedBy));
    }

    @PutMapping("/{id}/contract-linked")
    public ResponseEntity<ClientInquiry> markContractLinked(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long contractId = body.get("contractId") != null ? Long.valueOf(body.get("contractId").toString()) : null;
        return ResponseEntity.ok(inquiryService.markContractGenerated(id, contractId));
    }

    /** Body: { "senderRole": "CLIENT" | "CLIENT_MANAGER" | "PROJECT_MANAGER", "senderName": "...", "message": "..." } */
    @PostMapping("/{id}/messages")
    public ResponseEntity<ClientInquiry> addMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(inquiryService.addMessage(
                id, body.get("senderRole"), body.get("senderName"), body.get("message")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inquiryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
