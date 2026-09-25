package com.construction.service;

import com.construction.enums.ProjectStatus;
import com.construction.enums.PropertyCategory;
import com.construction.exception.BadRequestException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.ClientNotification;
import com.construction.model.Project;
import com.construction.model.ProjectMilestone;
import com.construction.repository.ClientNotificationRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.DownPaymentRepository;
import com.construction.repository.ProjectMilestoneRepository;
import com.construction.repository.ProjectRepository;
import com.construction.repository.ProjectExpenseRepository;
import com.construction.repository.ProjectTaskRepository;
import com.construction.repository.ProjectDocumentRepository;
import com.construction.repository.ClientInquiryRepository;
import com.construction.repository.ClientFeedbackRepository;
import com.construction.repository.EmployeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ClientRepository clientRepository;
    private final ProjectMilestoneRepository milestoneRepository;
    private final ClientNotificationRepository notificationRepository;
    private final ProjectTaskRepository taskRepository;
    private final ProjectExpenseRepository expenseRepository;
    private final ProjectDocumentRepository documentRepository;
    private final ClientInquiryRepository inquiryRepository;
    private final ClientFeedbackRepository feedbackRepository;
    private final EmployeeRepository employeeRepository;
    private final DownPaymentRepository downPaymentRepository;

    public ProjectService(ProjectRepository projectRepository,
                          ClientRepository clientRepository,
                          ProjectMilestoneRepository milestoneRepository,
                          ClientNotificationRepository notificationRepository,
                          ProjectTaskRepository taskRepository,
                          ProjectExpenseRepository expenseRepository,
                          ProjectDocumentRepository documentRepository,
                          ClientInquiryRepository inquiryRepository,
                          ClientFeedbackRepository feedbackRepository,
                          EmployeeRepository employeeRepository,
                          DownPaymentRepository downPaymentRepository) {
        this.projectRepository = projectRepository;
        this.clientRepository = clientRepository;
        this.milestoneRepository = milestoneRepository;
        this.notificationRepository = notificationRepository;
        this.taskRepository = taskRepository;
        this.expenseRepository = expenseRepository;
        this.documentRepository = documentRepository;
        this.inquiryRepository = inquiryRepository;
        this.feedbackRepository = feedbackRepository;
        this.employeeRepository = employeeRepository;
        this.downPaymentRepository = downPaymentRepository;
    }

    public Project create(Project project) {
        if (project.getClient() != null && project.getClient().getId() != null) {
            project.setClient(resolveClient(project.getClient()));
        } else {
            project.setClient(null);
        }
        if (project.getImageUrls() != null && project.getImageUrls().size() > 5) {
            throw new BadRequestException("Maximum 5 images allowed per design");
        }
        if (project.getStatus() == null) {
            project.setStatus(ProjectStatus.PLANNING);
        }
        if (project.getCategory() == null) {
            project.setCategory(PropertyCategory.RESIDENCIES);
        }
        return projectRepository.save(project);
    }

    public List<Project> findAll(Boolean marketingOnly, Boolean realOnly) {
        if (Boolean.TRUE.equals(marketingOnly)) {
            return projectRepository.findByMarketingDesign(true);
        }
        if (Boolean.TRUE.equals(realOnly)) {
            return projectRepository.findByMarketingDesign(false);
        }
        return projectRepository.findAll();
    }

    public List<Project> findAll() {
        return findAll(null, null);
    }

    public List<Project> findByCategory(PropertyCategory category, Boolean marketingOnly, Boolean realOnly) {
        if (Boolean.TRUE.equals(marketingOnly)) {
            return projectRepository.findByCategoryAndMarketingDesign(category, true);
        }
        if (Boolean.TRUE.equals(realOnly)) {
            return projectRepository.findByCategoryAndMarketingDesign(category, false);
        }
        return projectRepository.findByCategory(category);
    }

    public List<Project> findByCategory(PropertyCategory category) {
        return findByCategory(category, null, null);
    }

    public List<Project> findByClientId(Long clientId, Boolean marketingOnly, Boolean realOnly) {
        if (Boolean.TRUE.equals(marketingOnly)) {
            return projectRepository.findByClientIdAndMarketingDesign(clientId, true);
        }
        if (Boolean.TRUE.equals(realOnly)) {
            return projectRepository.findByClientIdAndMarketingDesign(clientId, false);
        }
        return projectRepository.findByClientId(clientId);
    }

    public List<Project> findByClientId(Long clientId) {
        return findByClientId(clientId, null, null);
    }

    public Project findById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id " + id));
    }

    public Project update(Long id, Project project) {
        Project existing = findById(id);
        existing.setName(project.getName());
        existing.setDescription(project.getDescription());
        existing.setCategory(project.getCategory() != null ? project.getCategory() : existing.getCategory());
        existing.setLocation(project.getLocation());
        existing.setStartDate(project.getStartDate());
        existing.setEndDate(project.getEndDate());
        existing.setBudget(project.getBudget());
        existing.setStatus(project.getStatus() != null ? project.getStatus() : existing.getStatus());
        existing.setProgressPercentage(project.getProgressPercentage());
        existing.setConstructionStatus(project.getConstructionStatus());
        if (project.getImageUrls() != null) {
            if (project.getImageUrls().size() > 5) {
                throw new BadRequestException("Maximum 5 images allowed per design");
            }
            existing.setImageUrls(project.getImageUrls());
        } else if (project.getImageUrl() != null) {
            existing.setImageUrl(project.getImageUrl());
        }
        existing.setPriceRange(project.getPriceRange());
        existing.setSpecifications(project.getSpecifications());
        existing.setMarketingDesign(project.isMarketingDesign());
        // Preserve the original creator tag; don't allow overwriting addedBy
        if (existing.getAddedBy() == null && project.getAddedBy() != null) {
            existing.setAddedBy(project.getAddedBy());
        }
        if (project.getClient() != null && project.getClient().getId() != null) {
            existing.setClient(resolveClient(project.getClient()));
        } else {
            existing.setClient(null);
        }

        Project saved = projectRepository.save(existing);

        // US-CM-18: Notify client of status update
        if (saved.getClient() != null) {
            notificationRepository.save(new ClientNotification(
                    saved.getClient(),
                    "Project Status Update: " + saved.getName(),
                    "Progress is now at " + saved.getProgressPercentage() + "%. Status: " + (saved.getConstructionStatus() != null ? saved.getConstructionStatus() : saved.getStatus().name()),
                    "PROJECT_UPDATE",
                    "#client-projects"
            ));
        }

        return saved;
    }

    public void delete(Long id) {
        Project existing = findById(id);
        taskRepository.deleteByProjectId(id);
        expenseRepository.deleteByProjectId(id);
        documentRepository.deleteByProjectId(id);
        inquiryRepository.deleteByProjectId(id);
        feedbackRepository.deleteByProjectId(id);
        employeeRepository.deleteByProjectId(id);
        downPaymentRepository.deleteByProjectId(id);
        projectRepository.delete(existing);
    }

    public ProjectMilestone addMilestone(Long projectId, ProjectMilestone milestone) {
        Project project = findById(projectId);
        milestone.setProject(project);
        if (milestone.getStatus() == null) {
            milestone.setStatus("PENDING");
        }
        ProjectMilestone saved = milestoneRepository.save(milestone);

        // Notify client
        if (project.getClient() != null) {
            notificationRepository.save(new ClientNotification(
                    project.getClient(),
                    "New Milestone: " + milestone.getTitle(),
                    "A new project milestone has been scheduled for " + project.getName(),
                    "PROJECT_UPDATE",
                    "#client-projects"
            ));
        }

        return saved;
    }

    public ProjectMilestone updateMilestone(Long milestoneId, ProjectMilestone update) {
        ProjectMilestone existing = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone not found with id " + milestoneId));
        existing.setTitle(update.getTitle());
        existing.setDescription(update.getDescription());
        existing.setTargetDate(update.getTargetDate());
        existing.setCompletionDate(update.getCompletionDate());
        existing.setStatus(update.getStatus());
        existing.setProgressPercentage(update.getProgressPercentage());
        if ("COMPLETED".equalsIgnoreCase(update.getStatus()) && existing.getCompletionDate() == null) {
            existing.setCompletionDate(LocalDate.now());
        }
        return milestoneRepository.save(existing);
    }

    public void deleteMilestone(Long milestoneId) {
        milestoneRepository.deleteById(milestoneId);
    }

    private Client resolveClient(Client client) {
        if (client == null || client.getId() == null) {
            throw new BadRequestException("Client id is required");
        }
        return clientRepository.findById(client.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id " + client.getId()));
    }
}
