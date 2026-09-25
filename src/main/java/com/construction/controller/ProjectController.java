package com.construction.controller;

import com.construction.enums.PropertyCategory;
import com.construction.model.Project;
import com.construction.model.ProjectMilestone;
import com.construction.service.ProjectService;
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

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<Project> create(@Valid @RequestBody Project project) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.create(project));
    }

    @GetMapping
    public ResponseEntity<List<Project>> findAll(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) PropertyCategory category,
            @RequestParam(required = false) Boolean marketingOnly,
            @RequestParam(required = false) Boolean realOnly) {
        if (clientId != null) {
            return ResponseEntity.ok(projectService.findByClientId(clientId, marketingOnly, realOnly));
        }
        if (category != null) {
            return ResponseEntity.ok(projectService.findByCategory(category, marketingOnly, realOnly));
        }
        return ResponseEntity.ok(projectService.findAll(marketingOnly, realOnly));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> findById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> update(@PathVariable Long id, @Valid @RequestBody Project project) {
        return ResponseEntity.ok(projectService.update(id, project));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/milestones")
    public ResponseEntity<ProjectMilestone> addMilestone(@PathVariable Long id, @Valid @RequestBody ProjectMilestone milestone) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.addMilestone(id, milestone));
    }

    @PutMapping("/{id}/milestones/{milestoneId}")
    public ResponseEntity<ProjectMilestone> updateMilestone(
            @PathVariable Long id,
            @PathVariable Long milestoneId,
            @Valid @RequestBody ProjectMilestone milestone) {
        return ResponseEntity.ok(projectService.updateMilestone(milestoneId, milestone));
    }

    @DeleteMapping("/{id}/milestones/{milestoneId}")
    public ResponseEntity<Void> deleteMilestone(
            @PathVariable Long id,
            @PathVariable Long milestoneId) {
        projectService.deleteMilestone(milestoneId);
        return ResponseEntity.noContent().build();
    }
}
