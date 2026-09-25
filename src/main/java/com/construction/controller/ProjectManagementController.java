package com.construction.controller;

import com.construction.model.Employee;
import com.construction.model.ProjectExpense;
import com.construction.model.ProjectTask;
import com.construction.service.ProjectManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/project-management")
public class ProjectManagementController {
    private final ProjectManagementService service;
    public ProjectManagementController(ProjectManagementService service) { this.service = service; }

    @GetMapping("/summary") public Map<String, Object> summary() { return service.summary(); }
    @GetMapping("/employees") public List<Employee> employees(@RequestParam(required = false) Long projectId) { return service.employees(projectId); }
    @PostMapping("/employees") public ResponseEntity<Employee> createEmployee(@Valid @RequestBody Employee employee) { return ResponseEntity.status(HttpStatus.CREATED).body(service.createEmployee(employee)); }
    @GetMapping("/tasks") public List<ProjectTask> tasks(@RequestParam(required = false) Long projectId, @RequestParam(required = false) Long employeeId) { return service.tasks(projectId, employeeId); }
    @PostMapping("/tasks") public ResponseEntity<ProjectTask> createTask(@Valid @RequestBody ProjectTask task) { return ResponseEntity.status(HttpStatus.CREATED).body(service.createTask(task)); }
    @PutMapping("/tasks/{id}") public ProjectTask updateTask(@PathVariable Long id, @Valid @RequestBody ProjectTask task) { return service.updateTask(id, task); }
    @PatchMapping("/tasks/{id}/progress")
    public ProjectTask updateTaskProgress(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        int progress = payload.get("progressPercentage") != null ? ((Number) payload.get("progressPercentage")).intValue() : 0;
        String status = payload.get("status") != null ? payload.get("status").toString() : null;
        String remarks = payload.get("progressRemarks") != null ? payload.get("progressRemarks").toString() : null;
        return service.updateTaskProgress(id, progress, status, remarks);
    }
    @GetMapping("/expenses") public List<ProjectExpense> expenses(@RequestParam(required = false) Long projectId) { return service.expenses(projectId); }
    @PostMapping("/expenses") public ResponseEntity<ProjectExpense> createExpense(@Valid @RequestBody ProjectExpense expense) { return ResponseEntity.status(HttpStatus.CREATED).body(service.createExpense(expense)); }
    @DeleteMapping("/expenses/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteExpense(@PathVariable Long id) { service.deleteExpense(id); }
}
