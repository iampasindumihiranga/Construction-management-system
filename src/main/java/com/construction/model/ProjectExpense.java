package com.construction.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "project_expenses")
public class ProjectExpense {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank(message = "Expense description is required")
    private String description;
    @NotNull @PositiveOrZero(message = "Expense amount cannot be negative")
    private BigDecimal amount;
    @NotNull(message = "Expense date is required")
    private LocalDate date;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "project_id", nullable = false)
    @JsonIgnoreProperties({"milestones", "client"})
    private Project project;

    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getDescription() { return description; } public void setDescription(String description) { this.description = description; }
    public BigDecimal getAmount() { return amount; } public void setAmount(BigDecimal amount) { this.amount = amount; }
    public LocalDate getDate() { return date; } public void setDate(LocalDate date) { this.date = date; }
    public Project getProject() { return project; } public void setProject(Project project) { this.project = project; }
}
