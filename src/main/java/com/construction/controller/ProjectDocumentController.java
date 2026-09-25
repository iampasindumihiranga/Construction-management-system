package com.construction.controller;

import com.construction.model.ProjectDocument;
import com.construction.service.ProjectDocumentService;
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

import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class ProjectDocumentController {

    private final ProjectDocumentService documentService;

    public ProjectDocumentController(ProjectDocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<ProjectDocument> upload(@Valid @RequestBody ProjectDocument document) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.save(document));
    }

    @GetMapping
    public ResponseEntity<List<ProjectDocument>> findAll(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) Long projectId) {
        if (clientId != null) {
            return ResponseEntity.ok(documentService.findByClientId(clientId));
        }
        if (projectId != null) {
            return ResponseEntity.ok(documentService.findByProjectId(projectId));
        }
        return ResponseEntity.ok(documentService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDocument> findById(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.findById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
