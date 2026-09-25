package com.construction.model;

import com.construction.enums.ProjectStatus;
import com.construction.enums.PropertyCategory;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Project name is required")
    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PropertyCategory category = PropertyCategory.RESIDENCIES;

    private String location;

    @NotNull(message = "Project start date is required")
    @Column(nullable = false)
    private LocalDate startDate;

    private LocalDate endDate;

    @NotNull(message = "Project budget is required")
    @PositiveOrZero(message = "Project budget cannot be negative")
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal budget;

    @NotNull(message = "Project status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status = ProjectStatus.PLANNING;

    private int progressPercentage = 0;

    private String constructionStatus;

    @Column(length = 2000000)
    private String imageUrl; // Primary/cover image URL or data URL

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_images", joinColumns = @JoinColumn(name = "project_id"))
    @Column(name = "image_url", columnDefinition = "LONGTEXT")
    @OrderColumn(name = "image_order")
    private List<String> imageUrls = new ArrayList<>();

    private String priceRange;

    private String specifications;

    @Column(nullable = false)
    private boolean marketingDesign = false;

    // Tracks who created this design: "CLIENT_MANAGER" or "PROJECT_MANAGER"
    private String addedBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id")
    @JsonIgnoreProperties({"projects", "contracts", "passwordHash"})
    private Client client;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ProjectMilestone> milestones = new ArrayList<>();

    public Project() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public BigDecimal getBudget() {
        return budget;
    }

    public void setBudget(BigDecimal budget) {
        this.budget = budget;
    }

    public ProjectStatus getStatus() {
        return status;
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public int getProgressPercentage() {
        return progressPercentage;
    }

    public void setProgressPercentage(int progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public String getConstructionStatus() {
        return constructionStatus;
    }

    public void setConstructionStatus(String constructionStatus) {
        this.constructionStatus = constructionStatus;
    }

    public String getImageUrl() {
        if ((imageUrl == null || imageUrl.trim().isEmpty()) && imageUrls != null && !imageUrls.isEmpty()) {
            return imageUrls.get(0);
        }
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
        if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            if (this.imageUrls == null) {
                this.imageUrls = new ArrayList<>();
            }
            if (this.imageUrls.isEmpty()) {
                this.imageUrls.add(imageUrl);
            } else if (!this.imageUrls.contains(imageUrl)) {
                this.imageUrls.set(0, imageUrl);
            }
        }
    }

    public List<String> getImageUrls() {
        if (imageUrls == null) {
            imageUrls = new ArrayList<>();
        }
        if (imageUrls.isEmpty() && imageUrl != null && !imageUrl.trim().isEmpty()) {
            imageUrls.add(imageUrl);
        }
        return imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        if (imageUrls == null) {
            this.imageUrls = new ArrayList<>();
        } else {
            // Enforce maximum 5 images per design
            this.imageUrls = new ArrayList<>(imageUrls.stream()
                    .filter(img -> img != null && !img.trim().isEmpty())
                    .limit(5)
                    .toList());
        }
        if (!this.imageUrls.isEmpty()) {
            this.imageUrl = this.imageUrls.get(0);
        } else {
            this.imageUrl = null;
        }
    }

    public String getPriceRange() {
        return priceRange;
    }

    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }

    public String getSpecifications() {
        return specifications;
    }

    public void setSpecifications(String specifications) {
        this.specifications = specifications;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }

    public List<ProjectMilestone> getMilestones() {
        return milestones;
    }

    public void setMilestones(List<ProjectMilestone> milestones) {
        this.milestones = milestones;
    }

    public void addMilestone(ProjectMilestone milestone) {
        milestones.add(milestone);
        milestone.setProject(this);
    }

    public boolean isMarketingDesign() {
        return marketingDesign;
    }

    public void setMarketingDesign(boolean marketingDesign) {
        this.marketingDesign = marketingDesign;
    }

    public String getAddedBy() {
        return addedBy;
    }

    public void setAddedBy(String addedBy) {
        this.addedBy = addedBy;
    }
}
