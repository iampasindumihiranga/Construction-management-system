package com.construction.controller;

import com.construction.model.Employee;
import com.construction.model.EmployeeAttendance;
import com.construction.model.Project;
import com.construction.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    // Step 1: Employee Registration
    @PostMapping
    public ResponseEntity<Employee> register(@Valid @RequestBody Employee employee) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.create(employee));
    }

    @GetMapping("/next-id")
    public ResponseEntity<String> nextEmployeeId() {
        return ResponseEntity.ok(employeeService.previewNextEmployeeId());
    }

    // Step 2 & 3: Manage Profile & Employee List
    @GetMapping
    public ResponseEntity<List<Employee>> findAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long projectId
    ) {
        return ResponseEntity.ok(employeeService.findAll(search, projectId));
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        return ResponseEntity.ok(employeeService.getDashboardSummary());
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<Employee> findById(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.findById(id));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<Employee> updateProfile(@PathVariable Long id, @Valid @RequestBody Employee employee) {
        return ResponseEntity.ok(employeeService.updateProfile(id, employee));
    }

    // Step 3: Assign Employee Role
    @PutMapping("/{id:\\d+}/role")
    public ResponseEntity<Employee> assignRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String role = payload.get("role");
        String position = payload.get("position");
        return ResponseEntity.ok(employeeService.assignRole(id, role, position));
    }

    // Step 4: Assign Employee to Project
    @PutMapping("/{id:\\d+}/projects")
    public ResponseEntity<Employee> assignProjects(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> payload
    ) {
        List<Long> projectIds = payload.get("projectIds");
        return ResponseEntity.ok(employeeService.assignProjects(id, projectIds));
    }

    @PostMapping("/project/{projectId}/assign")
    public ResponseEntity<Void> assignEmployeesToProject(
            @PathVariable Long projectId,
            @RequestBody Map<String, List<Long>> payload
    ) {
        List<Long> employeeIds = payload.get("employeeIds");
        employeeService.assignEmployeesToProject(projectId, employeeIds);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        employeeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Step 5: Monitor Employee Attendance
    @PostMapping("/attendance")
    public ResponseEntity<EmployeeAttendance> recordAttendance(@Valid @RequestBody EmployeeAttendance attendance) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.recordAttendance(attendance));
    }

    @GetMapping("/attendance")
    public ResponseEntity<List<EmployeeAttendance>> getAttendance(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(employeeService.getAttendanceRecords(employeeId, date, status));
    }

    @GetMapping("/{id:\\d+}/attendance")
    public ResponseEntity<List<EmployeeAttendance>> getEmployeeAttendance(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getAttendanceForEmployee(id));
    }

    @GetMapping("/attendance/summary")
    public ResponseEntity<Map<String, Object>> getAttendanceSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(employeeService.getAttendanceSummary(date));
    }

    @DeleteMapping("/attendance/{id}")
    public ResponseEntity<Void> deleteAttendance(@PathVariable Long id) {
        employeeService.deleteAttendance(id);
        return ResponseEntity.noContent().build();
    }

    // Step 6: Employee Views Assigned Projects
    @GetMapping("/{id:\\d+}/projects")
    public ResponseEntity<List<Project>> getAssignedProjects(@PathVariable Long id) {
        return ResponseEntity.ok(employeeService.getAssignedProjects(id));
    }

    @GetMapping("/my-projects")
    public ResponseEntity<List<Project>> getMyProjects(@RequestParam(required = false) String username) {
        if (username != null && !username.isBlank()) {
            return ResponseEntity.ok(employeeService.getAssignedProjectsByUsername(username));
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/me")
    public ResponseEntity<Employee> getMyProfile(@RequestParam String username) {
        return ResponseEntity.ok(employeeService.getEmployeeByUsername(username));
    }
}
