package com.construction.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "materials")
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_code", unique = true, nullable = false)
    private String materialCode;

    @NotBlank(message = "Material name is required")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Category is required")
    @Column(nullable = false)
    private String category; // e.g. Building Materials, Electrical Materials, Plumbing Materials, Finishing & Paint

    @NotNull(message = "Quantity is required")
    @PositiveOrZero(message = "Quantity cannot be negative")
    @Column(nullable = false)
    private Double quantity = 0.0;

    @NotBlank(message = "Unit of measurement is required")
    @Column(nullable = false)
    private String unit; // bags, kg, tons, meters, liters, units, sq.ft

    @NotNull(message = "Unit price is required")
    @PositiveOrZero(message = "Unit price cannot be negative")
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    private String supplier;

    @NotNull(message = "Minimum stock level is required")
    @PositiveOrZero(message = "Minimum stock level cannot be negative")
    @Column(nullable = false)
    private Double minStockLevel = 10.0;

    private String location;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String status = "IN_STOCK"; // IN_STOCK, LOW_STOCK, OUT_OF_STOCK

    private LocalDateTime lastUpdated = LocalDateTime.now();

    public Material() {
    }

    public Material(String materialCode, String name, String category, Double quantity, String unit, BigDecimal unitPrice, String supplier, Double minStockLevel) {
        this.materialCode = materialCode;
        this.name = name;
        this.category = category;
        this.quantity = quantity;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.supplier = supplier;
        this.minStockLevel = minStockLevel;
        updateCalculatedStatus();
    }

    public void updateCalculatedStatus() {
        if (this.quantity == null || this.quantity <= 0) {
            this.status = "OUT_OF_STOCK";
        } else if (this.minStockLevel != null && this.quantity <= this.minStockLevel) {
            this.status = "LOW_STOCK";
        } else {
            this.status = "IN_STOCK";
        }
        this.lastUpdated = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMaterialCode() {
        return materialCode;
    }

    public void setMaterialCode(String materialCode) {
        this.materialCode = materialCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Double getQuantity() {
        return quantity;
    }

    public void setQuantity(Double quantity) {
        this.quantity = quantity;
        updateCalculatedStatus();
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public String getSupplier() {
        return supplier;
    }

    public void setSupplier(String supplier) {
        this.supplier = supplier;
    }

    public Double getMinStockLevel() {
        return minStockLevel;
    }

    public void setMinStockLevel(Double minStockLevel) {
        this.minStockLevel = minStockLevel;
        updateCalculatedStatus();
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
