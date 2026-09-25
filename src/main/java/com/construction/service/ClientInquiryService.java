package com.construction.service;

import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.ClientInquiry;
import com.construction.model.ClientNotification;
import com.construction.model.Project;
import com.construction.repository.ClientInquiryRepository;
import com.construction.repository.ClientNotificationRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ClientInquiryService {

    private final ClientInquiryRepository inquiryRepository;
    private final ClientRepository clientRepository;
    private final ClientNotificationRepository notificationRepository;
    private final ProjectRepository projectRepository;

    public ClientInquiryService(ClientInquiryRepository inquiryRepository,
                                ClientRepository clientRepository,
                                ClientNotificationRepository notificationRepository,
                                ProjectRepository projectRepository) {
        this.inquiryRepository = inquiryRepository;
        this.clientRepository = clientRepository;
        this.notificationRepository = notificationRepository;
        this.projectRepository = projectRepository;
    }

    public ClientInquiry create(ClientInquiry inquiry) {
        if (inquiry.getClient() != null) {
            if (inquiry.getClient().getId() != null) {
                Client client = clientRepository.findById(inquiry.getClient().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
                inquiry.setClient(client);
            } else if (inquiry.getClient().getEmail() != null && !inquiry.getClient().getEmail().trim().isEmpty()) {
                String email = inquiry.getClient().getEmail().trim();
                Client client = clientRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
                    Client newClient = new Client();
                    String clientName = inquiry.getClient().getName() != null && !inquiry.getClient().getName().trim().isEmpty()
                            ? inquiry.getClient().getName().trim()
                            : "Website Inquirer";
                    newClient.setName(clientName);
                    newClient.setEmail(email);
                    newClient.setPhone(inquiry.getClient().getPhone());
                    newClient.setStatus("ACTIVE");
                    newClient.setPreferredCategory("RESIDENCIES");
                    return clientRepository.save(newClient);
                });
                inquiry.setClient(client);
            }
        }
        if (inquiry.getProject() != null && inquiry.getProject().getId() != null) {
            inquiry.setProject(projectRepository.findById(inquiry.getProject().getId()).orElse(null));
        }
        inquiry.setCreatedAt(LocalDateTime.now());
        inquiry.setStatus("PENDING");
        return inquiryRepository.save(inquiry);
    }

    public ClientInquiry respond(Long id, String responseText, String respondedBy) {
        ClientInquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found with id " + id));
        inquiry.setResponse(responseText);
        inquiry.setRespondedAt(LocalDateTime.now());
        inquiry.setRespondedBy(respondedBy != null ? respondedBy : "Client Manager");
        inquiry.setStatus("ANSWERED");

        ClientInquiry saved = inquiryRepository.save(inquiry);

        // Notify client
        if (saved.getClient() != null) {
            notificationRepository.save(new ClientNotification(
                    saved.getClient(),
                    "Inquiry Responded: " + saved.getSubject(),
                    "The client management team has responded to your inquiry.",
                    "INQUIRY_REPLY",
                    "#client-support"
            ));
        }

        return saved;
    }

    public List<ClientInquiry> findByClientId(Long clientId) {
        return inquiryRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    public List<ClientInquiry> findAll() {
        return inquiryRepository.findAllByOrderByCreatedAtDesc();
    }

    public ClientInquiry findById(Long id) {
        return inquiryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found with id " + id));
    }

    public void delete(Long id) {
        inquiryRepository.deleteById(id);
    }
}
