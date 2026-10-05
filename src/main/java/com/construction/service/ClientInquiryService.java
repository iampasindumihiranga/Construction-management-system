package com.construction.service;

import com.construction.exception.BadRequestException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.ClientInquiry;
import com.construction.model.ClientNotification;
import com.construction.model.InquiryMessage;
import com.construction.repository.ClientInquiryRepository;
import com.construction.repository.ClientNotificationRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.DesignRepository;
import com.construction.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ClientInquiryService {

    public static final String ROLE_CLIENT = "CLIENT";
    public static final String ROLE_CLIENT_MANAGER = "CLIENT_MANAGER";

    private final ClientInquiryRepository inquiryRepository;
    private final ClientRepository clientRepository;
    private final ClientNotificationRepository notificationRepository;
    private final ProjectRepository projectRepository;
    private final DesignRepository designRepository;

    public ClientInquiryService(ClientInquiryRepository inquiryRepository,
                                ClientRepository clientRepository,
                                ClientNotificationRepository notificationRepository,
                                ProjectRepository projectRepository,
                                DesignRepository designRepository) {
        this.inquiryRepository = inquiryRepository;
        this.clientRepository = clientRepository;
        this.notificationRepository = notificationRepository;
        this.projectRepository = projectRepository;
        this.designRepository = designRepository;
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
        } else {
            inquiry.setProject(null);
        }
        if (inquiry.getDesign() != null && inquiry.getDesign().getId() != null) {
            inquiry.setDesign(designRepository.findById(inquiry.getDesign().getId()).orElse(null));
        } else {
            inquiry.setDesign(null);
        }

        boolean fromManager = ROLE_CLIENT_MANAGER.equalsIgnoreCase(inquiry.getInitiatedBy());
        inquiry.setInitiatedBy(fromManager ? ROLE_CLIENT_MANAGER : ROLE_CLIENT);
        inquiry.setCreatedAt(LocalDateTime.now());
        // PENDING = waiting on the Client Manager, ANSWERED = waiting on the client
        inquiry.setStatus(fromManager ? "ANSWERED" : "PENDING");

        ClientInquiry saved = inquiryRepository.save(inquiry);

        if (fromManager && saved.getClient() != null) {
            notificationRepository.save(new ClientNotification(
                    saved.getClient(),
                    "New message from Client Manager: " + saved.getSubject(),
                    "The client management team has sent you an inquiry. Open Inquiries to reply.",
                    "INQUIRY_REPLY",
                    "#client-support"
            ));
        }
        return saved;
    }

    /**
     * Appends a message to an inquiry conversation thread.
     */
    public ClientInquiry addMessage(Long id, String senderRole, String senderName, String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new BadRequestException("Message is required");
        }
        ClientInquiry inquiry = findById(id);
        boolean fromManager = ROLE_CLIENT_MANAGER.equalsIgnoreCase(senderRole);
        String role = fromManager ? ROLE_CLIENT_MANAGER : ROLE_CLIENT;
        String name = senderName != null && !senderName.isBlank()
                ? senderName.trim()
                : (fromManager ? "Client Manager" : (inquiry.getClient() != null ? inquiry.getClient().getName() : "Client"));

        LocalDateTime now = LocalDateTime.now();
        inquiry.addMessage(new InquiryMessage(inquiry, role, name, text.trim(), now));

        if (fromManager) {
            // Keep legacy "response" fields in sync with the latest manager reply
            inquiry.setResponse(text.trim());
            inquiry.setRespondedAt(now);
            inquiry.setRespondedBy(name);
            inquiry.setStatus("ANSWERED");
        } else {
            inquiry.setStatus("PENDING");
        }

        ClientInquiry saved = inquiryRepository.save(inquiry);

        if (fromManager && saved.getClient() != null) {
            notificationRepository.save(new ClientNotification(
                    saved.getClient(),
                    "Inquiry Responded: " + saved.getSubject(),
                    "The client management team has replied to your inquiry.",
                    "INQUIRY_REPLY",
                    "#client-support"
            ));
        }
        return saved;
    }

    /** Legacy endpoint: a manager reply. Now appended to the conversation thread. */
    public ClientInquiry respond(Long id, String responseText, String respondedBy) {
        return addMessage(id, ROLE_CLIENT_MANAGER, respondedBy != null ? respondedBy : "Client Manager", responseText);
    }

    @Transactional(readOnly = true)
    public List<ClientInquiry> findByClientId(Long clientId) {
        return inquiryRepository.findByClientIdOrderByCreatedAtDesc(clientId);
    }

    @Transactional(readOnly = true)
    public List<ClientInquiry> findAll() {
        return inquiryRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public ClientInquiry findById(Long id) {
        return inquiryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found with id " + id));
    }

    public void delete(Long id) {
        inquiryRepository.deleteById(id);
    }
}
