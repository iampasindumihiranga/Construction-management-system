package com.construction.service;

import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.ClientFeedback;
import com.construction.model.Project;
import com.construction.repository.ClientFeedbackRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ClientFeedbackService {

    private final ClientFeedbackRepository feedbackRepository;
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;

    public ClientFeedbackService(ClientFeedbackRepository feedbackRepository,
                                 ClientRepository clientRepository,
                                 ProjectRepository projectRepository) {
        this.feedbackRepository = feedbackRepository;
        this.clientRepository = clientRepository;
        this.projectRepository = projectRepository;
    }

    public ClientFeedback submit(ClientFeedback feedback) {
        if (feedback.getClient() == null || feedback.getClient().getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client account is required to submit feedback");
        }
        Client client = clientRepository.findById(feedback.getClient().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        if (client.getStatus() == null || !"ACTIVE".equalsIgnoreCase(client.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only clients with valid active accounts can submit feedback");
        }
        feedback.setClient(client);

        if (feedback.getProject() != null && feedback.getProject().getId() != null) {
            Project project = projectRepository.findById(feedback.getProject().getId())
                    .orElse(null);
            feedback.setProject(project);
        }
        feedback.setSubmittedAt(LocalDateTime.now());
        return feedbackRepository.save(feedback);
    }

    public List<ClientFeedback> findByClientId(Long clientId) {
        return feedbackRepository.findByClientIdOrderBySubmittedAtDesc(clientId);
    }

    public List<ClientFeedback> findAll() {
        return feedbackRepository.findAllByOrderBySubmittedAtDesc();
    }

    public Double getAverageRating() {
        Double avg = feedbackRepository.getAverageRating();
        return avg != null ? Math.round(avg * 10.0) / 10.0 : 5.0;
    }

    public void delete(Long id) {
        feedbackRepository.deleteById(id);
    }
}
