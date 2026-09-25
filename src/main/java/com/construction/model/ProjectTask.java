package com.construction.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "project_tasks")
public class ProjectTask {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank(message = "Task name is required")
    private String taskName;
    private String description;
    @NotNull(message = "Task start date is required")
    private LocalDate startDate;
    @NotNull(message = "Task deadline is required")
    private LocalDate deadline;
    @NotBlank(message = "Task status is required")
    private String status = "TODO";
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnoreProperties({"milestones", "client"})
    private Project project;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "assigned_employee_id")
    private Employee assignedEmployee;

    private int progressPercentage = 0;
    private String progressRemarks;

    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getTaskName() { return taskName; } public void setTaskName(String taskName) { this.taskName = taskName; }
    public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
    public LocalDate getStartDate() { return startDate; } public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getDeadline() { return deadline; } public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
    public String getStatus() { return status; } public void setStatus(String status) { this.status = status; }
    public Project getProject() { return project; } public void setProject(Project project) { this.project = project; }
    public Employee getAssignedEmployee() { return assignedEmployee; } public void setAssignedEmployee(Employee assignedEmployee) { this.assignedEmployee = assignedEmployee; }
    public int getProgressPercentage() { return progressPercentage; } public void setProgressPercentage(int progressPercentage) { this.progressPercentage = progressPercentage; }
    public String getProgressRemarks() { return progressRemarks; } public void setProgressRemarks(String progressRemarks) { this.progressRemarks = progressRemarks; }
}
