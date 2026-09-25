package com.construction.service;

import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Employee;
import com.construction.model.Project;
import com.construction.model.ProjectExpense;
import com.construction.model.ProjectTask;
import com.construction.repository.EmployeeRepository;
import com.construction.repository.ProjectExpenseRepository;
import com.construction.repository.ProjectRepository;
import com.construction.repository.ProjectTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ProjectManagementService {
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final ProjectTaskRepository taskRepository;
    private final ProjectExpenseRepository expenseRepository;

    public ProjectManagementService(EmployeeRepository employeeRepository, ProjectRepository projectRepository,
                                    ProjectTaskRepository taskRepository, ProjectExpenseRepository expenseRepository) {
        this.employeeRepository = employeeRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.expenseRepository = expenseRepository;
    }

    public List<Employee> employees(Long projectId) { return projectId == null ? employeeRepository.findAll() : employeeRepository.findByProjectId(projectId); }
    public Employee createEmployee(Employee employee) {
        employee.setProject(project(employee.getProject()));
        return employeeRepository.save(employee);
    }

    public List<ProjectTask> tasks(Long projectId, Long employeeId) {
        if (employeeId != null) {
            return taskRepository.findByAssignedEmployeeId(employeeId);
        }
        return projectId == null ? taskRepository.findAll() : taskRepository.findByProjectId(projectId);
    }
    public ProjectTask createTask(ProjectTask task) {
        task.setProject(project(task.getProject()));
        task.setAssignedEmployee(employee(task.getAssignedEmployee()));
        return taskRepository.save(task);
    }
    public ProjectTask updateTask(Long id, ProjectTask update) {
        ProjectTask task = taskRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setTaskName(update.getTaskName());
        task.setDescription(update.getDescription());
        task.setStartDate(update.getStartDate());
        task.setDeadline(update.getDeadline());
        task.setStatus(update.getStatus());
        task.setProgressPercentage(update.getProgressPercentage());
        task.setProgressRemarks(update.getProgressRemarks());
        if (update.getProject() != null && update.getProject().getId() != null) {
            task.setProject(project(update.getProject()));
        }
        if (update.getAssignedEmployee() != null) {
            task.setAssignedEmployee(employee(update.getAssignedEmployee()));
        }
        return taskRepository.save(task);
    }
    public ProjectTask updateTaskProgress(Long id, int progressPercentage, String status, String progressRemarks) {
        ProjectTask task = taskRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        task.setProgressPercentage(Math.max(0, Math.min(100, progressPercentage)));
        if (status != null && !status.isBlank()) {
            task.setStatus(status);
        }
        if (progressRemarks != null) {
            task.setProgressRemarks(progressRemarks);
        }
        if (task.getProgressPercentage() == 100 && !"COMPLETED".equalsIgnoreCase(task.getStatus())) {
            task.setStatus("COMPLETED");
        }
        return taskRepository.save(task);
    }

    public List<ProjectExpense> expenses(Long projectId) {
        return projectId == null ? expenseRepository.findAll() : expenseRepository.findByProjectId(projectId);
    }
    public ProjectExpense createExpense(ProjectExpense expense) {
        expense.setProject(project(expense.getProject()));
        return expenseRepository.save(expense);
    }
    public void deleteExpense(Long id) { expenseRepository.deleteById(id); }

    public Map<String, Object> summary() {
        List<Project> projects = projectRepository.findAll();
        List<ProjectTask> tasks = taskRepository.findAll();
        BigDecimal budget = projects.stream().map(Project::getBudget).filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal spent = expenseRepository.findAll().stream().map(ProjectExpense::getAmount).filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long completed = tasks.stream().filter(task -> "COMPLETED".equalsIgnoreCase(task.getStatus())).count();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectCount", projects.size()); result.put("taskCount", tasks.size());
        result.put("completedTaskCount", completed); result.put("employeeCount", employeeRepository.count());
        result.put("totalBudget", budget); result.put("totalExpenses", spent); result.put("remainingBudget", budget.subtract(spent));
        return result;
    }

    private Project project(Project input) {
        if (input == null || input.getId() == null) throw new ResourceNotFoundException("Project is required");
        return projectRepository.findById(input.getId()).orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }
    private Employee employee(Employee input) {
        if (input == null || input.getId() == null) return null;
        return employeeRepository.findById(input.getId()).orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }
}
