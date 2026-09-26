package com.construction.service;

import com.construction.enums.ProjectStatus;
import com.construction.exception.BadRequestException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.ClientNotification;
import com.construction.model.Project;
import com.construction.model.ProjectRequest;
import com.construction.repository.ClientNotificationRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.ProjectRepository;
import com.construction.repository.ProjectRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class ProjectRequestService {

    private final ProjectRequestRepository projectRequestRepository;
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;
    private final ClientNotificationRepository notificationRepository;

    public ProjectRequestService(ProjectRequestRepository projectRequestRepository,
                                 ClientRepository clientRepository,
                                 ProjectRepository projectRepository,
                                 ClientNotificationRepository notificationRepository) {
        this.projectRequestRepository = projectRequestRepository;
        this.clientRepository = clientRepository;
        this.projectRepository = projectRepository;
        this.notificationRepository = notificationRepository;
    }

    public ProjectRequest create(ProjectRequest request) {
        if (request.getClient() != null) {
            if (request.getClient().getId() != null) {
                Client client = clientRepository.findById(request.getClient().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
                request.setClient(client);
            } else if (request.getClient().getEmail() != null && !request.getClient().getEmail().trim().isEmpty()) {
                String email = request.getClient().getEmail().trim();
                Client client = clientRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
                    Client newClient = new Client();
                    String clientName = request.getClient().getName() != null && !request.getClient().getName().trim().isEmpty()
                            ? request.getClient().getName().trim()
                            : "Valued Client";
                    newClient.setName(clientName);
                    newClient.setEmail(email);
                    newClient.setPhone(request.getClient().getPhone());
                    newClient.setStatus("ACTIVE");
                    newClient.setPreferredCategory(request.getCategory() != null ? request.getCategory().name() : "RESIDENCIES");
                    return clientRepository.save(newClient);
                });
                request.setClient(client);
            }
        }
        if (request.getClient() == null || request.getClient().getId() == null) {
            throw new BadRequestException("Client information is required to submit a project request.");
        }

        if (request.getSelectedDesign() != null && request.getSelectedDesign().getId() != null) {
            request.setSelectedDesign(projectRepository.findById(request.getSelectedDesign().getId()).orElse(null));
        }

        if (request.getImageUrls() != null && request.getImageUrls().size() > 5) {
            throw new BadRequestException("Maximum 5 photos/documents allowed per project request.");
        }

        request.setStatus("PENDING_CM_REVIEW");
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());

        return projectRequestRepository.save(request);
    }

    public List<ProjectRequest> findAll() {
        return projectRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<ProjectRequest> findByClientId(Long clientId) {
        return projectRequestRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    public List<ProjectRequest> findForwardedToPm() {
        return projectRequestRepository.findByStatusInOrderByCreatedAtDesc(
                List.of("FORWARDED_TO_PM", "PM_REVIEWED", "CLIENT_NOTIFIED", "APPROVED", "REJECTED", "PROJECT_STARTED")
        );
    }

    public ProjectRequest findById(Long id) {
        return projectRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project request not found with id " + id));
    }

    public ProjectRequest forwardToPm(Long id, String cmNotes, String forwardedByCm) {
        ProjectRequest request = findById(id);
        request.setCmNotes(cmNotes);
        request.setForwardedByCm(forwardedByCm != null && !forwardedByCm.trim().isEmpty() ? forwardedByCm.trim() : "Client Manager");
        request.setForwardedToPmAt(LocalDateTime.now());
        request.setStatus("FORWARDED_TO_PM");
        request.setUpdatedAt(LocalDateTime.now());
        return projectRequestRepository.save(request);
    }

    public ProjectRequest pmReply(Long id, String pmReply, BigDecimal pmEstimatedBudget, String pmEstimatedDuration, String pmRespondedBy) {
        ProjectRequest request = findById(id);
        request.setPmReply(pmReply);
        request.setPmEstimatedBudget(pmEstimatedBudget);
        request.setPmEstimatedDuration(pmEstimatedDuration);
        request.setPmRespondedBy(pmRespondedBy != null && !pmRespondedBy.trim().isEmpty() ? pmRespondedBy.trim() : "Project Manager");
        request.setPmRespondedAt(LocalDateTime.now());
        request.setStatus("PM_REVIEWED");
        request.setUpdatedAt(LocalDateTime.now());
        return projectRequestRepository.save(request);
    }

    public ProjectRequest sendResponseToClient(Long id, String clientMessage, String clientNotifiedBy) {
        ProjectRequest request = findById(id);
        request.setClientMessage(clientMessage);
        request.setClientNotifiedBy(clientNotifiedBy != null && !clientNotifiedBy.trim().isEmpty() ? clientNotifiedBy.trim() : "Client Manager");
        request.setClientNotifiedAt(LocalDateTime.now());
        request.setStatus("CLIENT_NOTIFIED");
        request.setUpdatedAt(LocalDateTime.now());

        ProjectRequest saved = projectRequestRepository.save(request);

        // Notify client
        if (saved.getClient() != null) {
            notificationRepository.save(new ClientNotification(
                    saved.getClient(),
                    "Project Proposal Ready: " + saved.getTitle(),
                    "Client Manager has prepared an official response regarding your custom project request. Please check the Request Project section.",
                    "PROJECT_REQUEST_UPDATE",
                    "#request-project"
            ));
        }

        return saved;
    }

    public ProjectRequest approve(Long id, String cmNotes, String clientMessage, String approvedBy) {
        ProjectRequest request = findById(id);
        if (cmNotes != null && !cmNotes.trim().isEmpty()) {
            request.setCmNotes(cmNotes.trim());
        }
        if (clientMessage != null && !clientMessage.trim().isEmpty()) {
            request.setClientMessage(clientMessage.trim());
        }
        request.setStatus("APPROVED");
        request.setApprovedBy(approvedBy != null && !approvedBy.trim().isEmpty() ? approvedBy.trim() : "Client Manager");
        request.setApprovedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        ProjectRequest saved = projectRequestRepository.save(request);

        if (saved.getClient() != null) {
            String msg = (clientMessage != null && !clientMessage.trim().isEmpty())
                    ? clientMessage.trim()
                    : "Your project request for '" + saved.getTitle() + "' has been approved! The Project Manager will now initialize your project.";
            notificationRepository.save(new ClientNotification(
                    saved.getClient(),
                    "Project Request Approved: " + saved.getTitle(),
                    msg,
                    "PROJECT_REQUEST_UPDATE",
                    "#request-project"
            ));
        }
        return saved;
    }

    public ProjectRequest reject(Long id, String reason, String rejectedBy) {
        ProjectRequest request = findById(id);
        request.setStatus("REJECTED");
        request.setRejectionReason(reason);
        request.setRejectedBy(rejectedBy != null && !rejectedBy.trim().isEmpty() ? rejectedBy.trim() : "Client Manager");
        request.setRejectedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        ProjectRequest saved = projectRequestRepository.save(request);

        if (saved.getClient() != null) {
            String msg = "Your project request for '" + saved.getTitle() + "' was not approved. " +
                    (reason != null && !reason.trim().isEmpty() ? "Reason: " + reason.trim() : "");
            notificationRepository.save(new ClientNotification(
                    saved.getClient(),
                    "Project Request Status: " + saved.getTitle(),
                    msg,
                    "PROJECT_REQUEST_UPDATE",
                    "#request-project"
            ));
        }
        return saved;
    }

    public Project startProject(Long id, Project projectData, String startedBy) {
        ProjectRequest request = findById(id);
        if (request.getClient() == null) {
            throw new BadRequestException("Request does not have an associated client.");
        }

        Project project = new Project();
        String projName = (projectData != null && projectData.getName() != null && !projectData.getName().trim().isEmpty())
                ? projectData.getName().trim()
                : request.getTitle();
        project.setName(projName);

        String projDesc = (projectData != null && projectData.getDescription() != null && !projectData.getDescription().trim().isEmpty())
                ? projectData.getDescription().trim()
                : request.getDescription();
        project.setDescription(projDesc);

        project.setCategory(request.getCategory());

        String projLoc = (projectData != null && projectData.getLocation() != null && !projectData.getLocation().trim().isEmpty())
                ? projectData.getLocation().trim()
                : request.getLocation();
        project.setLocation(projLoc);

        BigDecimal budget = projectData != null ? projectData.getBudget() : null;
        if (budget == null || budget.compareTo(BigDecimal.ZERO) <= 0) {
            budget = request.getPmEstimatedBudget() != null ? request.getPmEstimatedBudget() : request.getExpectedBudget();
        }
        if (budget == null || budget.compareTo(BigDecimal.ZERO) <= 0) {
            budget = new BigDecimal("1000000.00");
        }
        project.setBudget(budget);

        LocalDate startDate = (projectData != null && projectData.getStartDate() != null)
                ? projectData.getStartDate()
                : (request.getTargetStartDate() != null ? request.getTargetStartDate() : LocalDate.now());
        project.setStartDate(startDate);

        if (projectData != null && projectData.getEndDate() != null) {
            project.setEndDate(projectData.getEndDate());
        }

        project.setStatus(projectData != null && projectData.getStatus() != null ? projectData.getStatus() : ProjectStatus.PLANNING);
        project.setProgressPercentage(0);
        project.setMarketingDesign(false);
        project.setAddedBy("PROJECT_MANAGER");
        project.setClient(request.getClient());
        project.setSpecifications(request.getSpecifications());

        if (projectData != null && projectData.getImageUrls() != null && !projectData.getImageUrls().isEmpty()) {
            project.setImageUrls(new ArrayList<>(projectData.getImageUrls()));
            project.setImageUrl(projectData.getImageUrls().get(0));
        } else if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            project.setImageUrls(new ArrayList<>(request.getImageUrls()));
            project.setImageUrl(request.getImageUrls().get(0));
        }

        Project savedProject = projectRepository.save(project);

        // Update request status
        request.setStatus("PROJECT_STARTED");
        request.setStartedProjectId(savedProject.getId());
        request.setUpdatedAt(LocalDateTime.now());
        projectRequestRepository.save(request);

        // Notify client
        notificationRepository.save(new ClientNotification(
                request.getClient(),
                "Project Started: " + savedProject.getName(),
                "Your project has been officially started and assigned to you by the Project Manager! You can track its progress in My Projects.",
                "PROJECT_UPDATE",
                "#my-projects"
        ));

        return savedProject;
    }

    public void delete(Long id) {
        projectRequestRepository.deleteById(id);
    }
}
