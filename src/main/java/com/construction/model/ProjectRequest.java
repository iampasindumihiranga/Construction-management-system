package com.construction.model;

import com.construction.enums.PropertyCategory;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "project_requests")
public class ProjectRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Client is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnoreProperties({"projects", "contracts", "passwordHash"})
    private Client client;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "selected_design_id")
    @JsonIgnoreProperties({"client", "milestones"})
    private Project selectedDesign; // Optional reference if based on existing company design

    @NotBlank(message = "Project title is required")
    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PropertyCategory category = PropertyCategory.RESIDENCIES;

    private String location;

    @PositiveOrZero(message = "Expected budget cannot be negative")
    @Column(precision = 19, scale = 2)
    private BigDecimal expectedBudget;

    private LocalDate targetStartDate;

    @Column(columnDefinition = "TEXT")
    private String specifications; // e.g. "3000 sq ft, 4 bedrooms, 3 bathrooms"

    @Column(columnDefinition = "TEXT")
    private String description; // Client's detailed requirements

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_request_images", joinColumns = @JoinColumn(name = "project_request_id"))
    @Column(name = "image_url", columnDefinition = "LONGTEXT")
    @OrderColumn(name = "image_order")
    private List<String> imageUrls = new ArrayList<>();

    // Status: PENDING_CM_REVIEW, FORWARDED_TO_PM, PM_REVIEWED, CLIENT_NOTIFIED, APPROVED, REJECTED, PROJECT_STARTED
    @Column(nullable = false)
    private String status = "PENDING_CM_REVIEW";

    // Client Manager notes when forwarding to PM
    @Column(columnDefinition = "TEXT")
    private String cmNotes;

    private LocalDateTime forwardedToPmAt;

    private String forwardedByCm;

    // Project Manager's review / reply
    @Column(columnDefinition = "TEXT")
    private String pmReply;

    @Column(precision = 19, scale = 2)
    private BigDecimal pmEstimatedBudget;

    private String pmEstimatedDuration;

    private LocalDateTime pmRespondedAt;

    private String pmRespondedBy;

    // Final official response sent to the client by Client Manager
    @Column(columnDefinition = "TEXT")
    private String clientMessage;

    private LocalDateTime clientNotifiedAt;

    private String clientNotifiedBy;

    private LocalDateTime approvedAt;

    private String approvedBy;

    private LocalDateTime rejectedAt;

    private String rejectedBy;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    private Long startedProjectId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public ProjectRequest() {
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

    public Project getSelectedDesign() {
        return selectedDesign;
    }

    public void setSelectedDesign(Project selectedDesign) {
        this.selectedDesign = selectedDesign;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public PropertyCategory getCategory() {
        return category;
    }

    public void setCategory(PropertyCategory category) {
        this.category = category;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public BigDecimal getExpectedBudget() {
        return expectedBudget;
    }

    public void setExpectedBudget(BigDecimal expectedBudget) {
        this.expectedBudget = expectedBudget;
    }

    public LocalDate getTargetStartDate() {
        return targetStartDate;
    }

    public void setTargetStartDate(LocalDate targetStartDate) {
        this.targetStartDate = targetStartDate;
    }

    public String getSpecifications() {
        return specifications;
    }

    public void setSpecifications(String specifications) {
        this.specifications = specifications;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getImageUrls() {
        return imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCmNotes() {
        return cmNotes;
    }

    public void setCmNotes(String cmNotes) {
        this.cmNotes = cmNotes;
    }

    public LocalDateTime getForwardedToPmAt() {
        return forwardedToPmAt;
    }

    public void setForwardedToPmAt(LocalDateTime forwardedToPmAt) {
        this.forwardedToPmAt = forwardedToPmAt;
    }

    public String getForwardedByCm() {
        return forwardedByCm;
    }

    public void setForwardedByCm(String forwardedByCm) {
        this.forwardedByCm = forwardedByCm;
    }

    public String getPmReply() {
        return pmReply;
    }

    public void setPmReply(String pmReply) {
        this.pmReply = pmReply;
    }

    public BigDecimal getPmEstimatedBudget() {
        return pmEstimatedBudget;
    }

    public void setPmEstimatedBudget(BigDecimal pmEstimatedBudget) {
        this.pmEstimatedBudget = pmEstimatedBudget;
    }

    public String getPmEstimatedDuration() {
        return pmEstimatedDuration;
    }

    public void setPmEstimatedDuration(String pmEstimatedDuration) {
        this.pmEstimatedDuration = pmEstimatedDuration;
    }

    public LocalDateTime getPmRespondedAt() {
        return pmRespondedAt;
    }

    public void setPmRespondedAt(LocalDateTime pmRespondedAt) {
        this.pmRespondedAt = pmRespondedAt;
    }

    public String getPmRespondedBy() {
        return pmRespondedBy;
    }

    public void setPmRespondedBy(String pmRespondedBy) {
        this.pmRespondedBy = pmRespondedBy;
    }

    public String getClientMessage() {
        return clientMessage;
    }

    public void setClientMessage(String clientMessage) {
        this.clientMessage = clientMessage;
    }

    public LocalDateTime getClientNotifiedAt() {
        return clientNotifiedAt;
    }

    public void setClientNotifiedAt(LocalDateTime clientNotifiedAt) {
        this.clientNotifiedAt = clientNotifiedAt;
    }

    public String getClientNotifiedBy() {
        return clientNotifiedBy;
    }

    public void setClientNotifiedBy(String clientNotifiedBy) {
        this.clientNotifiedBy = clientNotifiedBy;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }

    public String getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }

    public LocalDateTime getRejectedAt() {
        return rejectedAt;
    }

    public void setRejectedAt(LocalDateTime rejectedAt) {
        this.rejectedAt = rejectedAt;
    }

    public String getRejectedBy() {
        return rejectedBy;
    }

    public void setRejectedBy(String rejectedBy) {
        this.rejectedBy = rejectedBy;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Long getStartedProjectId() {
        return startedProjectId;
    }

    public void setStartedProjectId(Long startedProjectId) {
        this.startedProjectId = startedProjectId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
