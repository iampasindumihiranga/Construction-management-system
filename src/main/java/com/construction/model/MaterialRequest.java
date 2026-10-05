package com.construction.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

@Entity
@Table(name = "material_requests")
public class MaterialRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", unique = true, nullable = false)
    private String requestCode;

    @NotNull(message = "Project is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnoreProperties({"milestones", "client", "assignedEmployees"})
    private Project project;

    @NotNull(message = "Material is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @NotNull(message = "Requested quantity is required")
    @Positive(message = "Requested quantity must be positive")
    @Column(name = "quantity", nullable = false)
    private Double quantity;

    @Column(name = "requested_quantity")
    private Double requestedQuantity;

    private String requestedBy;

    private LocalDate requestDate = LocalDate.now();

    private LocalDate requiredDate;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, ISSUED

    @Column(length = 500)
    private String remarks;

    @Column(name = "reason")
    private String reason;

    private String approvedBy;

    private LocalDate approvalDate;

    private Double issuedQuantity = 0.0;

    public MaterialRequest() {
    }

    public MaterialRequest(String requestCode, Project project, Material material, Double requestedQuantity, String requestedBy, String remarks) {
        this.requestCode = requestCode;
        this.project = project;
        this.material = material;
        this.requestedQuantity = requestedQuantity;
        this.quantity = requestedQuantity;
        this.requestedBy = requestedBy;
        this.remarks = remarks;
        this.reason = remarks != null ? remarks : "Site Material Requisition";
        this.requestDate = LocalDate.now();
        this.status = "PENDING";
        this.issuedQuantity = 0.0;
    }

    @jakarta.persistence.PrePersist
    @jakarta.persistence.PreUpdate
    public void syncQuantities() {
        if (this.requestedQuantity == null && this.quantity != null) {
            this.requestedQuantity = this.quantity;
        }
        if (this.quantity == null && this.requestedQuantity != null) {
            this.quantity = this.requestedQuantity;
        }
        if (this.reason == null || this.reason.isBlank()) {
            this.reason = (this.remarks != null && !this.remarks.isBlank()) ? this.remarks : "Site Material Requisition";
        }
        if (this.remarks == null || this.remarks.isBlank()) {
            this.remarks = this.reason;
        }
        if (this.requestDate == null) {
            this.requestDate = LocalDate.now();
        }
        if (this.status == null) {
            this.status = "PENDING";
        }
        if (this.issuedQuantity == null) {
            this.issuedQuantity = 0.0;
        }
    }

    public String getReason() {
        return reason != null ? reason : remarks;
    }

    public void setReason(String reason) {
        this.reason = reason;
        if (this.remarks == null || this.remarks.isBlank()) {
            this.remarks = reason;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRequestCode() {
        return requestCode;
    }

    public void setRequestCode(String requestCode) {
        this.requestCode = requestCode;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public Material getMaterial() {
        return material;
    }

    public void setMaterial(Material material) {
        this.material = material;
    }

    public Double getRequestedQuantity() {
        return requestedQuantity != null ? requestedQuantity : quantity;
    }

    public void setRequestedQuantity(Double requestedQuantity) {
        this.requestedQuantity = requestedQuantity;
        this.quantity = requestedQuantity;
    }

    public Double getQuantity() {
        return quantity != null ? quantity : requestedQuantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
        this.requestedQuantity = quantity;
    }

    public String getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(String requestedBy) {
        this.requestedBy = requestedBy;
    }

    public LocalDate getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(LocalDate requestDate) {
        this.requestDate = requestDate;
    }

    public LocalDate getRequiredDate() {
        return requiredDate;
    }

    public void setRequiredDate(LocalDate requiredDate) {
        this.requiredDate = requiredDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }

    public LocalDate getApprovalDate() {
        return approvalDate;
    }

    public void setApprovalDate(LocalDate approvalDate) {
        this.approvalDate = approvalDate;
    }

    public Double getIssuedQuantity() {
        return issuedQuantity;
    }

    public void setIssuedQuantity(Double issuedQuantity) {
        this.issuedQuantity = issuedQuantity;
    }
}
