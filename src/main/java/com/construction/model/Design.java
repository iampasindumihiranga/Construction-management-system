package com.construction.model;

import com.construction.enums.PropertyCategory;
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
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Client-visible company design (catalog item) managed by the Client Manager.
 * Stored in its own `designs` table, with images in `design_images`.
 */
@Entity
@Table(name = "designs")
public class Design {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Design name is required")
    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PropertyCategory category = PropertyCategory.RESIDENCIES;

    /** Display price shown to clients, e.g. "From LKR 25,000,000". */
    @NotBlank(message = "Display price is required")
    @Column(nullable = false)
    private String priceRange;

    /** Numeric value parsed from the display price (used for sorting / defaults). */
    @Column(precision = 19, scale = 2)
    private BigDecimal budget;

    @Column(length = 4000)
    private String description;

    @Column(length = 4000)
    private String specifications;

    /** Optional remarks shown to clients. */
    @Column(length = 4000)
    private String remarks;

    @Column(columnDefinition = "LONGTEXT")
    private String imageUrl; // cover image

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "design_images", joinColumns = @JoinColumn(name = "design_id"))
    @Column(name = "image_url", columnDefinition = "LONGTEXT")
    @OrderColumn(name = "image_order")
    private List<String> imageUrls = new ArrayList<>();

    private String addedBy = "CLIENT_MANAGER";

    /** Id of the old `projects` row this design was migrated from (if any). */
    private Long legacyProjectId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Design() {
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /** Kept for frontend compatibility (catalog code checks this flag). */
    public boolean isMarketingDesign() {
        return true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public PropertyCategory getCategory() { return category; }
    public void setCategory(PropertyCategory category) { this.category = category; }

    public String getPriceRange() { return priceRange; }
    public void setPriceRange(String priceRange) { this.priceRange = priceRange; }

    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSpecifications() { return specifications; }
    public void setSpecifications(String specifications) { this.specifications = specifications; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getImageUrl() {
        if ((imageUrl == null || imageUrl.isBlank()) && imageUrls != null && !imageUrls.isEmpty()) {
            return imageUrls.get(0);
        }
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public List<String> getImageUrls() {
        if (imageUrls == null) {
            imageUrls = new ArrayList<>();
        }
        return imageUrls;
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls == null
                ? new ArrayList<>()
                : new ArrayList<>(imageUrls.stream()
                        .filter(img -> img != null && !img.isBlank())
                        .limit(5)
                        .toList());
        this.imageUrl = this.imageUrls.isEmpty() ? null : this.imageUrls.get(0);
    }

    public String getAddedBy() { return addedBy; }
    public void setAddedBy(String addedBy) { this.addedBy = addedBy; }

    public Long getLegacyProjectId() { return legacyProjectId; }
    public void setLegacyProjectId(Long legacyProjectId) { this.legacyProjectId = legacyProjectId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
