package com.construction.service;

import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.ClientNotification;
import com.construction.model.Project;
import com.construction.model.ProjectDocument;
import com.construction.repository.ClientNotificationRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.ProjectDocumentRepository;
import com.construction.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ProjectDocumentService {

    private final ProjectDocumentRepository documentRepository;
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;
    private final ClientNotificationRepository notificationRepository;

    public ProjectDocumentService(ProjectDocumentRepository documentRepository,
                                  ClientRepository clientRepository,
                                  ProjectRepository projectRepository,
                                  ClientNotificationRepository notificationRepository) {
        this.documentRepository = documentRepository;
        this.clientRepository = clientRepository;
        this.projectRepository = projectRepository;
        this.notificationRepository = notificationRepository;
    }

    public ProjectDocument save(ProjectDocument document) {
        if (document.getClient() != null && document.getClient().getId() != null) {
            Client client = clientRepository.findById(document.getClient().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
            document.setClient(client);
        }
        if (document.getProject() != null && document.getProject().getId() != null) {
            Project project = projectRepository.findById(document.getProject().getId())
                    .orElse(null);
            document.setProject(project);
        }
        if (document.getUploadedAt() == null) {
            document.setUploadedAt(LocalDateTime.now());
        }

        ProjectDocument saved = documentRepository.save(document);

        // Notify client if document was uploaded by manager
        if ("CLIENT_MANAGER".equalsIgnoreCase(saved.getUploadedByRole()) || "ADMIN".equalsIgnoreCase(saved.getUploadedByRole())) {
            if (saved.getClient() != null) {
                notificationRepository.save(new ClientNotification(
                        saved.getClient(),
                        "New Document Shared: " + saved.getTitle(),
                        "A new project document (" + saved.getDocumentType() + ") has been uploaded to your portal.",
                        "DOCUMENT_SHARED",
                        "#client-documents"
                ));
            }
        }

        return saved;
    }

    public List<ProjectDocument> findByClientId(Long clientId) {
        return documentRepository.findByClientIdOrderByUploadedAtDesc(clientId);
    }

    public List<ProjectDocument> findByProjectId(Long projectId) {
        return documentRepository.findByProjectIdOrderByUploadedAtDesc(projectId);
    }

    public List<ProjectDocument> findAll() {
        return documentRepository.findAllByOrderByUploadedAtDesc();
    }

    public ProjectDocument findById(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id " + id));
    }

    public void delete(Long id) {
        documentRepository.deleteById(id);
    }
}
