package com.construction.service;

import com.construction.enums.PropertyCategory;
import com.construction.exception.BadRequestException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Design;
import com.construction.repository.ClientInquiryRepository;
import com.construction.repository.DesignRepository;
import com.construction.repository.ProjectRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional
public class DesignService {

    private final DesignRepository designRepository;
    private final ClientInquiryRepository inquiryRepository;
    private final ProjectRequestRepository projectRequestRepository;

    public DesignService(DesignRepository designRepository,
                         ClientInquiryRepository inquiryRepository,
                         ProjectRequestRepository projectRequestRepository) {
        this.designRepository = designRepository;
        this.inquiryRepository = inquiryRepository;
        this.projectRequestRepository = projectRequestRepository;
    }

    @Transactional(readOnly = true)
    public List<Design> findAll(PropertyCategory category) {
        if (category != null) {
            return designRepository.findByCategoryOrderByIdDesc(category);
        }
        return designRepository.findAllByOrderByIdDesc();
    }

    @Transactional(readOnly = true)
    public Design findById(Long id) {
        return designRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Design not found with id " + id));
    }

    public Design create(Design design) {
        design.setId(null);
        normalize(design, design);
        if (design.getAddedBy() == null || design.getAddedBy().isBlank()) {
            design.setAddedBy("CLIENT_MANAGER");
        }
        return designRepository.save(design);
    }

    public Design update(Long id, Design changes) {
        Design existing = findById(id);
        existing.setName(changes.getName());
        existing.setCategory(changes.getCategory());
        existing.setPriceRange(changes.getPriceRange());
        existing.setDescription(changes.getDescription());
        existing.setSpecifications(changes.getSpecifications());
        existing.setRemarks(changes.getRemarks());
        existing.setImageUrls(changes.getImageUrls());
        normalize(existing, changes);
        return designRepository.save(existing);
    }

    public void delete(Long id) {
        Design existing = findById(id);
        // Detach references so the design can be removed without losing inquiry / request history.
        inquiryRepository.findByDesignId(id).forEach(inq -> inq.setDesign(null));
        projectRequestRepository.findBySelectedDesignId(id).forEach(req -> req.setSelectedDesign(null));
        designRepository.delete(existing);
    }

    private void normalize(Design target, Design source) {
        if (target.getName() == null || target.getName().isBlank()) {
            throw new BadRequestException("Design name is required");
        }
        target.setName(target.getName().trim());
        if (target.getCategory() == null) {
            target.setCategory(PropertyCategory.RESIDENCIES);
        }
        if (source.getImageUrls() != null && source.getImageUrls().size() > 5) {
            throw new BadRequestException("Maximum 5 images allowed per design");
        }
        if (target.getImageUrls().isEmpty() && source.getImageUrl() != null && !source.getImageUrl().isBlank()) {
            target.setImageUrls(List.of(source.getImageUrl()));
        }
        String price = target.getPriceRange() == null ? "" : target.getPriceRange().trim();
        if (price.isEmpty()) {
            throw new BadRequestException("Display price is required");
        }
        target.setPriceRange(price);
        target.setBudget(source.getBudget() != null ? source.getBudget() : parsePrice(price));
    }

    static BigDecimal parsePrice(String price) {
        if (price == null) return null;
        String digits = price.replaceAll("[^0-9.]", "");
        if (digits.isEmpty()) return null;
        try {
            return new BigDecimal(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
