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

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "material_transactions")
public class MaterialTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_code", unique = true, nullable = false)
    private String transactionCode;

    @NotNull(message = "Transaction type is required")
    @Column(nullable = false)
    private String type; // ISSUE, RECEIPT, ADJUSTMENT

    @NotNull(message = "Material is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id")
    @JsonIgnoreProperties({"milestones", "client", "assignedEmployees"})
    private Project project;

    @NotNull(message = "Quantity is required")
    @Column(nullable = false)
    private Double quantity;

    @Column(nullable = false)
    private Double previousStock;

    @Column(nullable = false)
    private Double newStock;

    @Column(precision = 19, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(precision = 19, scale = 2)
    private BigDecimal totalCost = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDateTime transactionDate = LocalDateTime.now();

    private String referenceNo; // e.g. REQ-001 or PO-001

    @Column(length = 500)
    private String notes;

    private String performedBy;

    public MaterialTransaction() {
    }

    public MaterialTransaction(String transactionCode, String type, Material material, Project project, Double quantity, Double previousStock, Double newStock, BigDecimal unitPrice, String referenceNo, String notes, String performedBy) {
        this.transactionCode = transactionCode;
        this.type = type;
        this.material = material;
        this.project = project;
        this.quantity = quantity;
        this.previousStock = previousStock;
        this.newStock = newStock;
        this.unitPrice = unitPrice;
        this.totalCost = unitPrice != null ? unitPrice.multiply(BigDecimal.valueOf(quantity)) : BigDecimal.ZERO;
        this.referenceNo = referenceNo;
        this.notes = notes;
        this.performedBy = performedBy;
        this.transactionDate = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTransactionCode() {
        return transactionCode;
    }

    public void setTransactionCode(String transactionCode) {
        this.transactionCode = transactionCode;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Material getMaterial() {
        return material;
    }

    public void setMaterial(Material material) {
        this.material = material;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
    }

    public Double getPreviousStock() {
        return previousStock;
    }

    public void setPreviousStock(Double previousStock) {
        this.previousStock = previousStock;
    }

    public Double getNewStock() {
        return newStock;
    }

    public void setNewStock(Double newStock) {
        this.newStock = newStock;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getTotalCost() {
        return totalCost;
    }

    public void setTotalCost(BigDecimal totalCost) {
        this.totalCost = totalCost;
    }

    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getReferenceNo() {
        return referenceNo;
    }

    public void setReferenceNo(String referenceNo) {
        this.referenceNo = referenceNo;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }
}
