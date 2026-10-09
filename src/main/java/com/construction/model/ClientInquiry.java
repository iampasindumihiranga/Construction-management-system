package com.construction.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "client_inquiries")
public class ClientInquiry {

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

    @NotBlank(message = "Subject is required")
    @Column(nullable = false)
    private String subject;

    @NotBlank(message = "Message is required")
    @Column(nullable = false, length = 4000)
    private String message;

    @Column(length = 500)
    private String attachmentName;

    @Column(length = 100)
    private String attachmentType;

    @Column(length = 2000000)
    private String attachmentData;

    @Column(length = 4000)
    private String response;

    private String status = "PENDING"; // PENDING, ANSWERED, CLOSED

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime respondedAt;

    private String respondedBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "design_id")
    private Design design;

    /** Who started the conversation: "CLIENT" (default) or "CLIENT_MANAGER". */
    @Column(length = 30)
    private String initiatedBy = "CLIENT";

    @Column(length = 30)
    private String pmDecision = "PENDING"; // PENDING, APPROVED, REJECTED

    private LocalDateTime pmDecisionDate;

    @Column(length = 2000)
    private String pmDecisionRemarks;

    @Column(precision = 19, scale = 2)
    private java.math.BigDecimal pmEstimatedBudget;

    @Column(length = 100)
    private String pmEstimatedDuration;

    private Boolean contractGenerated = false;

    private Long contractId;

    @OneToMany(mappedBy = "inquiry", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @OrderBy("createdAt ASC, id ASC")
    @JsonIgnoreProperties({"inquiry"})
    private List<InquiryMessage> messages = new ArrayList<>();

    public ClientInquiry() {
    }

    public Design getDesign() { return design; }
    public void setDesign(Design design) { this.design = design; }

    public String getInitiatedBy() { return initiatedBy == null ? "CLIENT" : initiatedBy; }
    public void setInitiatedBy(String initiatedBy) { this.initiatedBy = initiatedBy; }

    public List<InquiryMessage> getMessages() {
        if (messages == null) {
            messages = new ArrayList<>();
        }
        return messages;
    }

    public void setMessages(List<InquiryMessage> messages) {
        // Messages are managed through addMessage(); ignore client-supplied lists.
    }

    public void addMessage(InquiryMessage message) {
        message.setInquiry(this);
        getMessages().add(message);
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

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public String getAttachmentType() { return attachmentType; }
    public void setAttachmentType(String attachmentType) { this.attachmentType = attachmentType; }
    public String getAttachmentData() { return attachmentData; }
    public void setAttachmentData(String attachmentData) { this.attachmentData = attachmentData; }

    public String getResponse() {
        return response;
    }

    public void setResponse(String response) {
        this.response = response;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(LocalDateTime respondedAt) {
        this.respondedAt = respondedAt;
    }

    public String getRespondedBy() {
        return respondedBy;
    }

    public void setRespondedBy(String respondedBy) {
        this.respondedBy = respondedBy;
    }

    public String getPmDecision() {
        return pmDecision == null ? "PENDING" : pmDecision;
    }

    public void setPmDecision(String pmDecision) {
        this.pmDecision = pmDecision;
    }

    public LocalDateTime getPmDecisionDate() {
        return pmDecisionDate;
    }

    public void setPmDecisionDate(LocalDateTime pmDecisionDate) {
        this.pmDecisionDate = pmDecisionDate;
    }

    public String getPmDecisionRemarks() {
        return pmDecisionRemarks;
    }

    public void setPmDecisionRemarks(String pmDecisionRemarks) {
        this.pmDecisionRemarks = pmDecisionRemarks;
    }

    public java.math.BigDecimal getPmEstimatedBudget() {
        return pmEstimatedBudget;
    }

    public void setPmEstimatedBudget(java.math.BigDecimal pmEstimatedBudget) {
        this.pmEstimatedBudget = pmEstimatedBudget;
    }

    public String getPmEstimatedDuration() {
        return pmEstimatedDuration;
    }

    public void setPmEstimatedDuration(String pmEstimatedDuration) {
        this.pmEstimatedDuration = pmEstimatedDuration;
    }

    public Boolean getContractGenerated() {
        return contractGenerated != null && contractGenerated;
    }

    public void setContractGenerated(Boolean contractGenerated) {
        this.contractGenerated = contractGenerated;
    }

    public Long getContractId() {
        return contractId;
    }

    public void setContractId(Long contractId) {
        this.contractId = contractId;
    }
}
