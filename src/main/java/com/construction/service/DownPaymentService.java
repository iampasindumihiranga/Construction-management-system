package com.construction.service;

import com.construction.exception.BadRequestException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.ClientNotification;
import com.construction.model.DownPayment;
import com.construction.model.Project;
import com.construction.repository.ClientNotificationRepository;
import com.construction.repository.ClientRepository;
import com.construction.repository.DownPaymentRepository;
import com.construction.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class DownPaymentService {

    private final DownPaymentRepository downPaymentRepository;
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;
    private final ClientNotificationRepository notificationRepository;

    public DownPaymentService(DownPaymentRepository downPaymentRepository,
                              ClientRepository clientRepository,
                              ProjectRepository projectRepository,
                              ClientNotificationRepository notificationRepository) {
        this.downPaymentRepository = downPaymentRepository;
        this.clientRepository = clientRepository;
        this.projectRepository = projectRepository;
        this.notificationRepository = notificationRepository;
    }

    public DownPayment create(DownPayment payment) {
        // Resolve client
        if (payment.getClient() == null || payment.getClient().getId() == null) {
            throw new BadRequestException("Client is required for down payment");
        }
        Client client = clientRepository.findById(payment.getClient().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id " + payment.getClient().getId()));
        payment.setClient(client);

        // Resolve project (optional / recommended when starting a project)
        if (payment.getProject() != null && payment.getProject().getId() != null) {
            Project project = projectRepository.findById(payment.getProject().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found with id " + payment.getProject().getId()));
            payment.setProject(project);

            if (payment.getTotalProjectAmount() == null && project.getBudget() != null) {
                payment.setTotalProjectAmount(project.getBudget());
            }
        } else {
            payment.setProject(null);
        }

        // Set payment date if not specified
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDate.now());
        }

        // Automatically set downpayment validity to 60 days from payment date
        payment.setValidUntil(payment.getPaymentDate().plusDays(60));

        // Automatically calculate status: Valid, Expiring Soon, or Expired
        payment.setStatus(payment.calculateStatus());

        // Auto-generate reference number if blank
        if (payment.getReferenceNumber() == null || payment.getReferenceNumber().isBlank()) {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            payment.setReferenceNumber("DP-" + String.format("%04d", client.getId()) + "-" + timestamp);
        }

        if (payment.getCreatedAt() == null) {
            payment.setCreatedAt(LocalDateTime.now());
        }

        DownPayment saved = downPaymentRepository.save(payment);

        // Notify client
        String projectName = saved.getProject() != null ? " for " + saved.getProject().getName() : "";
        notificationRepository.save(new ClientNotification(
                client,
                "Down Payment Recorded",
                "A down payment of LKR " + saved.getAmount() + projectName + " has been recorded. " +
                "Validity: 60 days (Until " + saved.getValidUntil() + "). Status: " + saved.getStatus() +
                ". Ref: " + saved.getReferenceNumber(),
                "PAYMENT_UPDATE",
                "#client-payments"
        ));

        return saved;
    }

    public List<DownPayment> findAll(Long clientId, Long projectId, String search, String status) {
        List<DownPayment> payments = downPaymentRepository.searchPayments(
                clientId,
                projectId,
                (search != null && !search.isBlank()) ? search.trim() : null,
                (status != null && !status.isBlank()) ? status.trim() : null
        );

        // Ensure dynamic status is accurately reflected on date-based records
        for (DownPayment payment : payments) {
            if (payment.getStatus() == null ||
                payment.getStatus().equalsIgnoreCase("Valid") ||
                payment.getStatus().equalsIgnoreCase("Expiring Soon") ||
                payment.getStatus().equalsIgnoreCase("Expired")) {
                String currentStatus = payment.calculateStatus();
                if (currentStatus != null) {
                    payment.setStatus(currentStatus);
                }
            }
        }
        return payments;
    }

    public List<DownPayment> findAll(String search, String status) {
        return findAll(null, null, search, status);
    }

    public List<DownPayment> findByClientId(Long clientId) {
        return findAll(clientId, null, null, null);
    }

    public List<DownPayment> findByClientId(Long clientId, Long projectId) {
        return findAll(clientId, projectId, null, null);
    }

    public DownPayment findById(Long id) {
        DownPayment payment = downPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Down payment not found with id " + id));
        if (payment.getStatus() == null ||
            payment.getStatus().equalsIgnoreCase("Valid") ||
            payment.getStatus().equalsIgnoreCase("Expiring Soon") ||
            payment.getStatus().equalsIgnoreCase("Expired")) {
            payment.setStatus(payment.calculateStatus());
        }
        return payment;
    }

    public DownPayment update(Long id, DownPayment payment) {
        DownPayment existing = findById(id);

        // Resolve client if changed
        if (payment.getClient() != null && payment.getClient().getId() != null) {
            Client client = clientRepository.findById(payment.getClient().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
            existing.setClient(client);
        }

        // Resolve project if changed
        if (payment.getProject() != null && payment.getProject().getId() != null) {
            Project project = projectRepository.findById(payment.getProject().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            existing.setProject(project);
        } else if (payment.getProject() == null) {
            existing.setProject(null);
        }

        existing.setAmount(payment.getAmount());
        if (payment.getPaymentDate() != null) {
            existing.setPaymentDate(payment.getPaymentDate());
            // Automatically set validity to 60 days from payment date
            existing.setValidUntil(payment.getPaymentDate().plusDays(60));
        }

        existing.setPaymentMethod(payment.getPaymentMethod());
        existing.setNotes(payment.getNotes());
        existing.setTotalProjectAmount(payment.getTotalProjectAmount());
        existing.setRequiredDownPayment(payment.getRequiredDownPayment());

        // Update receipt details if provided
        if (payment.getReceipt() != null) {
            existing.setReceipt(payment.getReceipt());
        }
        if (payment.getReceiptFileName() != null) {
            existing.setReceiptFileName(payment.getReceiptFileName());
        }
        if (payment.getReceiptFileType() != null) {
            existing.setReceiptFileType(payment.getReceiptFileType());
        }

        // Allow reference number update only if not empty
        if (payment.getReferenceNumber() != null && !payment.getReferenceNumber().isBlank()) {
            existing.setReferenceNumber(payment.getReferenceNumber());
        }

        if (payment.getStatus() != null && !payment.getStatus().isBlank()) {
            existing.setStatus(payment.getStatus().trim());
        } else {
            existing.setStatus(existing.calculateStatus());
        }

        DownPayment saved = downPaymentRepository.save(existing);

        // Notify client on update
        notificationRepository.save(new ClientNotification(
                existing.getClient(),
                "Down Payment Updated",
                "Your down payment details (Ref: " + existing.getReferenceNumber() + ") have been updated. Status: " + existing.getStatus(),
                "PAYMENT_UPDATE",
                "#client-payments"
        ));

        return saved;
    }

    public DownPayment updateStatus(Long id, String status) {
        DownPayment existing = downPaymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Down payment not found with id " + id));
        String oldStatus = existing.getStatus();
        existing.setStatus(status != null ? status.trim() : "Valid");
        DownPayment saved = downPaymentRepository.save(existing);

        if (!status.equalsIgnoreCase(oldStatus)) {
            notificationRepository.save(new ClientNotification(
                    existing.getClient(),
                    "Payment Status Update",
                    "Your down payment (Ref: " + existing.getReferenceNumber() + ") status is now: " + status + ".",
                    "PAYMENT_UPDATE",
                    "#client-payments"
            ));
        }
        return saved;
    }

    public void delete(Long id) {
        downPaymentRepository.deleteById(id);
    }

    /**
     * Compute payment summary for a client (optionally scoped to a project).
     */
    public Map<String, Object> getPaymentSummary(Long clientId, Long projectId) {
        Map<String, Object> summary = new HashMap<>();

        List<DownPayment> payments = findAll(clientId, projectId, null, null);
        BigDecimal totalPaid;

        if (projectId != null && clientId != null) {
            totalPaid = downPaymentRepository.sumConfirmedAmountByClientAndProject(clientId, projectId);
        } else if (clientId != null) {
            totalPaid = downPaymentRepository.sumConfirmedAmountByClientId(clientId);
        } else if (projectId != null) {
            totalPaid = downPaymentRepository.sumConfirmedAmountByProjectId(projectId);
        } else {
            totalPaid = payments.stream()
                    .filter(p -> !"Expired".equalsIgnoreCase(p.getStatus()))
                    .map(DownPayment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // Project amount & required down payment
        BigDecimal totalProjectAmount = payments.stream()
                .filter(p -> p.getTotalProjectAmount() != null)
                .map(DownPayment::getTotalProjectAmount)
                .findFirst()
                .orElse(BigDecimal.ZERO);

        BigDecimal requiredDownPayment = payments.stream()
                .filter(p -> p.getRequiredDownPayment() != null)
                .map(DownPayment::getRequiredDownPayment)
                .findFirst()
                .orElse(BigDecimal.ZERO);

        BigDecimal remaining = requiredDownPayment.subtract(totalPaid).max(BigDecimal.ZERO);
        double progressPercent = requiredDownPayment.compareTo(BigDecimal.ZERO) > 0
                ? totalPaid.multiply(BigDecimal.valueOf(100))
                        .divide(requiredDownPayment, 1, RoundingMode.HALF_UP)
                        .doubleValue()
                : (payments.isEmpty() ? 0.0 : 100.0);

        long validCount = payments.stream().filter(p -> "Valid".equalsIgnoreCase(p.getStatus())).count();
        long expiringSoonCount = payments.stream().filter(p -> "Expiring Soon".equalsIgnoreCase(p.getStatus())).count();
        long expiredCount = payments.stream().filter(p -> "Expired".equalsIgnoreCase(p.getStatus())).count();

        summary.put("totalProjectAmount", totalProjectAmount);
        summary.put("requiredDownPayment", requiredDownPayment);
        summary.put("totalPaid", totalPaid);
        summary.put("remainingAmount", remaining);
        summary.put("progressPercent", Math.min(progressPercent, 100.0));
        summary.put("paymentCount", payments.size());
        summary.put("validCount", validCount);
        summary.put("expiringSoonCount", expiringSoonCount);
        summary.put("expiredCount", expiredCount);
        return summary;
    }
}
