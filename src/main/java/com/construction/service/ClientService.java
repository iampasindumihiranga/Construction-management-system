package com.construction.service;

import com.construction.auth.ClientRegistrationRequest;
import com.construction.auth.ManagementRole;
import com.construction.exception.ConflictException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.Contract;
import com.construction.model.UserAccount;
import com.construction.repository.ClientFeedbackRepository;
import com.construction.repository.ClientInquiryRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.ContractRepository;
import com.construction.repository.ProjectDocumentRepository;
import com.construction.repository.ProjectRepository;
import com.construction.repository.UserAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final UserAccountRepository userAccountRepository;
    private final PasswordService passwordService;
    private final ContractRepository contractRepository;
    private final ProjectRepository projectRepository;
    private final ClientInquiryRepository inquiryRepository;
    private final ProjectDocumentRepository documentRepository;
    private final ClientFeedbackRepository feedbackRepository;

    public ClientService(ClientRepository clientRepository,
                         UserAccountRepository userAccountRepository,
                         PasswordService passwordService,
                         ContractRepository contractRepository,
                         ProjectRepository projectRepository,
                         ClientInquiryRepository inquiryRepository,
                         ProjectDocumentRepository documentRepository,
                         ClientFeedbackRepository feedbackRepository) {
        this.clientRepository = clientRepository;
        this.userAccountRepository = userAccountRepository;
        this.passwordService = passwordService;
        this.contractRepository = contractRepository;
        this.projectRepository = projectRepository;
        this.inquiryRepository = inquiryRepository;
        this.documentRepository = documentRepository;
        this.feedbackRepository = feedbackRepository;
    }

    public Client create(Client client) {
        if (clientRepository.existsByEmailIgnoreCase(client.getEmail())) {
            throw new ConflictException("Client email already exists");
        }
        if (client.getEmployeeNumber() == null || client.getEmployeeNumber().isBlank()) {
            client.setEmployeeNumber(generateEmployeeNumber());
        }
        if (client.getStatus() == null) {
            client.setStatus("ACTIVE");
        }
        if (client.getPasswordHash() != null && !client.getPasswordHash().isBlank()) {
            client.setPasswordHash(passwordService.hash(client.getPasswordHash()));
        } else {
            client.setPasswordHash(passwordService.hash("Client@123"));
        }
        Client saved = clientRepository.save(client);

        userAccountRepository.findByUsernameIgnoreCase(saved.getEmail())
                .ifPresentOrElse(
                        account -> {
                            account.setPasswordHash(saved.getPasswordHash());
                            account.setDisplayName(saved.getName());
                            account.setClientId(saved.getId());
                            userAccountRepository.save(account);
                        },
                        () -> userAccountRepository.save(new UserAccount(
                                saved.getEmail(),
                                saved.getPasswordHash(),
                                ManagementRole.CLIENT,
                                saved.getName(),
                                saved.getId()
                        ))
                );

        return saved;
    }

    public Client register(ClientRegistrationRequest request) {
        if (clientRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new ConflictException("Client email already exists");
        }
        Client client = new Client();
        client.setName(request.getName().trim());
        client.setEmail(request.getEmail().trim().toLowerCase());
        client.setPhone(request.getPhone() != null ? request.getPhone().trim() : "");
        client.setEmployeeNumber(generateEmployeeNumber());
        client.setPasswordHash(passwordService.hash(request.getPassword()));
        // Self-registered clients are immediately active — no approval required.
        client.setStatus("ACTIVE");
        client.setPreferredCategory("RESIDENCIES");
        Client savedClient = clientRepository.save(client);

        userAccountRepository.save(new UserAccount(
                savedClient.getEmail(),
                savedClient.getPasswordHash(),
                ManagementRole.CLIENT,
                savedClient.getName(),
                savedClient.getId()
        ));
        return savedClient;
    }

    public void ensureEmployeeNumbers() {
        for (Client client : clientRepository.findAll()) {
            if (client.getEmployeeNumber() == null || client.getEmployeeNumber().isBlank()) {
                client.setEmployeeNumber(generateEmployeeNumber());
                clientRepository.save(client);
            }
        }
    }

    public String previewEmployeeNumber() {
        return generateEmployeeNumber();
    }

    private String generateEmployeeNumber() {
        long next = 1;
        for (Client client : clientRepository.findAll()) {
            String current = client.getEmployeeNumber();
            if (current == null || !current.startsWith("OD-")) continue;
            try {
                next = Math.max(next, Long.parseLong(current.substring(3)) + 1);
            } catch (NumberFormatException ignored) {
            }
        }
        String employeeNumber;
        do {
            employeeNumber = String.format("OD-%06d", next++);
        } while (clientRepository.existsByEmployeeNumberIgnoreCase(employeeNumber));
        return employeeNumber;
    }

    public boolean matchesPassword(Client client, String password) {
        return passwordService.matches(password, client.getPasswordHash());
    }

    public List<Client> findAll() {
        return clientRepository.findAll();
    }

    public List<Client> search(String query) {
        if (query == null || query.isBlank()) {
            return clientRepository.findAll();
        }
        return clientRepository.searchClients(query.trim());
    }

    public Client findById(Long id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id " + id));
    }

    public Client findByEmail(String email) {
        return clientRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with email " + email));
    }

    public Client update(Long id, Client client) {
        Client existing = findById(id);
        if (clientRepository.existsByEmailIgnoreCaseAndIdNot(client.getEmail(), id)) {
            throw new ConflictException("Client email already exists");
        }
        existing.setName(client.getName());
        existing.setEmail(client.getEmail());
        existing.setPhone(client.getPhone());
        existing.setAddress(client.getAddress());
        existing.setCompanyName(client.getCompanyName());
        existing.setStatus(client.getStatus() != null ? client.getStatus() : existing.getStatus());
        existing.setPreferredCategory(client.getPreferredCategory() != null ? client.getPreferredCategory() : existing.getPreferredCategory());
        existing.setEmergencyContact(client.getEmergencyContact() != null ? client.getEmergencyContact() : existing.getEmergencyContact());
        if (client.getEmployeeNumber() != null && !client.getEmployeeNumber().isBlank()) {
            existing.setEmployeeNumber(client.getEmployeeNumber());
        }
        if (client.getPasswordHash() != null && !client.getPasswordHash().isBlank()) {
            String newHashed = passwordService.hash(client.getPasswordHash());
            existing.setPasswordHash(newHashed);
            userAccountRepository.findByUsernameIgnoreCase(existing.getEmail())
                    .ifPresent(acc -> {
                        acc.setPasswordHash(newHashed);
                        acc.setDisplayName(existing.getName());
                        userAccountRepository.save(acc);
                    });
        }
        return clientRepository.save(existing);
    }

    // US-CM-07: Permitted profile updates by client
    public Client updatePermittedProfile(Long id, Client update) {
        Client existing = findById(id);
        existing.setName(update.getName());
        existing.setPhone(update.getPhone());
        existing.setAddress(update.getAddress());
        existing.setEmergencyContact(update.getEmergencyContact());
        existing.setPreferredCategory(update.getPreferredCategory());
        return clientRepository.save(existing);
    }

    public void delete(Long id) {
        Client existing = findById(id);
        // Also remove user account if present
        userAccountRepository.findByUsernameIgnoreCase(existing.getEmail())
                .ifPresent(userAccountRepository::delete);
        clientRepository.delete(existing);
    }

    // US-CM-25: Dashboard overview metrics for Client Manager
    public Map<String, Object> getDashboardSummary() {
        Map<String, Object> summary = new HashMap<>();
        long totalClients = clientRepository.count();
        long totalProjects = projectRepository.count();
        long totalContracts = contractRepository.count();

        LocalDate today = LocalDate.now();
        LocalDate in60Days = today.plusDays(60);
        List<Contract> expiring = contractRepository.findExpiringBetween(today, in60Days);
        List<Contract> expired = contractRepository.findExpired(today);

        long pendingInquiries = inquiryRepository.findByStatusOrderByCreatedAtDesc("PENDING").size();
        long totalDocuments = documentRepository.count();
        Double avgRating = feedbackRepository.getAverageRating();

        summary.put("totalClients", totalClients);
        summary.put("totalProjects", totalProjects);
        summary.put("totalContracts", totalContracts);
        summary.put("expiringContractsCount", expiring.size());
        summary.put("expiredContractsCount", expired.size());
        summary.put("pendingInquiriesCount", pendingInquiries);
        summary.put("totalDocumentsCount", totalDocuments);
        summary.put("averageClientRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 5.0);

        return summary;
    }
}
