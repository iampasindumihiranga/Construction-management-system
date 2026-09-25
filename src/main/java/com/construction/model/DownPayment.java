package com.construction.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "down_payments")
public class DownPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Client is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnoreProperties({"projects", "contracts", "passwordHash"})
    private Client client;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id")
    @JsonIgnoreProperties({"client", "milestones"})
    private Project project;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @NotNull(message = "Payment date is required")
    @Column(nullable = false)
    private LocalDate paymentDate;

    // Automatically set to 60 days from paymentDate
    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(nullable = false)
    private String paymentMethod = "BANK_TRANSFER"; // BANK_TRANSFER, CASH, CHEQUE, ONLINE

    @Column(unique = true)
    private String referenceNumber;

    // Automatically displayed as Valid, Expiring Soon, or Expired
    private String status = "Valid";

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String receipt; // Base64 data URL, image, file link, or receipt number

    private String receiptFileName;

    private String receiptFileType;

    @Column(length = 2000)
    private String notes;

    // Payment summary fields (optional — set per payment record or per project)
    @Column(precision = 19, scale = 2)
    private BigDecimal totalProjectAmount;

    @Column(precision = 19, scale = 2)
    private BigDecimal requiredDownPayment;

    private LocalDateTime createdAt = LocalDateTime.now();

    public DownPayment() {
    }

    @PrePersist
    @PreUpdate
    public void onPersistOrUpdate() {
        if (this.paymentDate != null) {
            this.validUntil = this.paymentDate.plusDays(60);
        }
        this.status = calculateStatus();
    }

    /**
     * Automatically calculates status:
     * - Expired: if current date is after validUntil
     * - Expiring Soon: if current date is within 15 days of validUntil
     * - Valid: otherwise
     */
    public String calculateStatus() {
        if (this.paymentDate == null) {
            return "Valid";
        }
        LocalDate expiry = this.validUntil != null ? this.validUntil : this.paymentDate.plusDays(60);
        LocalDate today = LocalDate.now();
        if (today.isAfter(expiry)) {
            return "Expired";
        } else if (!today.isBefore(expiry.minusDays(15))) {
            return "Expiring Soon";
        } else {
            return "Valid";
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
        if (paymentDate != null) {
            this.validUntil = paymentDate.plusDays(60);
            this.status = calculateStatus();
        }
    }

    public LocalDate getValidUntil() {
        if (validUntil == null && paymentDate != null) {
            return paymentDate.plusDays(60);
        }
        return validUntil;
    }

    public void setValidUntil(LocalDate validUntil) {
        this.validUntil = validUntil;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public String getStatus() {
        // Automatically returns dynamic status based on 60-day validity
        if (this.paymentDate != null) {
            return calculateStatus();
        }
        return status != null ? status : "Valid";
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @JsonProperty("validityStatus")
    public String getValidityStatus() {
        return calculateStatus();
    }

    @JsonProperty("daysRemaining")
    public Long getDaysRemaining() {
        LocalDate expiry = getValidUntil();
        if (expiry == null) {
            return null;
        }
        return ChronoUnit.DAYS.between(LocalDate.now(), expiry);
    }

    public String getReceipt() {
        return receipt;
    }

    public void setReceipt(String receipt) {
        this.receipt = receipt;
    }

    // Alias for frontend compatibility
    public String getReceiptData() {
        return receipt;
    }

    public void setReceiptData(String receiptData) {
        if (receiptData != null && !receiptData.isBlank()) {
            this.receipt = receiptData;
        }
    }

    public String getReceiptFileName() {
        return receiptFileName;
    }

    public void setReceiptFileName(String receiptFileName) {
        this.receiptFileName = receiptFileName;
    }

    public String getReceiptFileType() {
        return receiptFileType;
    }

    public void setReceiptFileType(String receiptFileType) {
        this.receiptFileType = receiptFileType;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public BigDecimal getTotalProjectAmount() {
        return totalProjectAmount;
    }

    public void setTotalProjectAmount(BigDecimal totalProjectAmount) {
        this.totalProjectAmount = totalProjectAmount;
    }

    public BigDecimal getRequiredDownPayment() {
        return requiredDownPayment;
    }

    public void setRequiredDownPayment(BigDecimal requiredDownPayment) {
        this.requiredDownPayment = requiredDownPayment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
