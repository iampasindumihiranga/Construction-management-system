package com.construction.controller;

import com.construction.model.Project;
import com.construction.model.ProjectRequest;
import com.construction.service.ProjectRequestService;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/project-requests")
public class ProjectRequestController {

    private final ProjectRequestService projectRequestService;

    public ProjectRequestController(ProjectRequestService projectRequestService) {
        this.projectRequestService = projectRequestService;
    }

    @PostMapping
    public ResponseEntity<ProjectRequest> create(@Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectRequestService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<ProjectRequest>> findAll(@RequestParam(required = false) Long clientId) {
        if (clientId != null) {
            return ResponseEntity.ok(projectRequestService.findByClientId(clientId));
        }
        return ResponseEntity.ok(projectRequestService.findAll());
    }

    @GetMapping("/forwarded-to-pm")
    public ResponseEntity<List<ProjectRequest>> findForwardedToPm() {
        return ResponseEntity.ok(projectRequestService.findForwardedToPm());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectRequest> findById(@PathVariable Long id) {
        return ResponseEntity.ok(projectRequestService.findById(id));
    }

    @PutMapping("/{id}/forward-to-pm")
    public ResponseEntity<ProjectRequest> forwardToPm(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String cmNotes = body.get("cmNotes");
        String forwardedByCm = body.get("forwardedByCm");
        return ResponseEntity.ok(projectRequestService.forwardToPm(id, cmNotes, forwardedByCm));
    }

    @PutMapping("/{id}/pm-reply")
    public ResponseEntity<ProjectRequest> pmReply(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String pmReply = (String) body.get("pmReply");
        BigDecimal pmEstimatedBudget = null;
        if (body.get("pmEstimatedBudget") != null) {
            try {
                pmEstimatedBudget = new BigDecimal(body.get("pmEstimatedBudget").toString());
            } catch (Exception ignored) {
            }
        }
        String pmEstimatedDuration = (String) body.get("pmEstimatedDuration");
        String pmRespondedBy = (String) body.get("pmRespondedBy");
        return ResponseEntity.ok(projectRequestService.pmReply(id, pmReply, pmEstimatedBudget, pmEstimatedDuration, pmRespondedBy));
    }

    @PutMapping("/{id}/send-to-client")
    public ResponseEntity<ProjectRequest> sendResponseToClient(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String clientMessage = body.get("clientMessage");
        String clientNotifiedBy = body.get("clientNotifiedBy");
        return ResponseEntity.ok(projectRequestService.sendResponseToClient(id, clientMessage, clientNotifiedBy));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ProjectRequest> approve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String cmNotes = body != null ? body.get("cmNotes") : null;
        String clientMessage = body != null ? body.get("clientMessage") : null;
        String approvedBy = body != null ? body.get("approvedBy") : null;
        return ResponseEntity.ok(projectRequestService.approve(id, cmNotes, clientMessage, approvedBy));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ProjectRequest> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        String rejectedBy = body != null ? body.get("rejectedBy") : null;
        return ResponseEntity.ok(projectRequestService.reject(id, reason, rejectedBy));
    }

    @PostMapping("/{id}/start-project")
    public ResponseEntity<Project> startProject(
            @PathVariable Long id,
            @RequestBody(required = false) Project projectData,
            @RequestParam(required = false) String startedBy) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectRequestService.startProject(id, projectData != null ? projectData : new Project(), startedBy));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectRequestService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
