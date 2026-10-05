package com.construction.config;

import com.construction.model.ClientInquiry;
import com.construction.model.Design;
import com.construction.model.InquiryMessage;
import com.construction.model.Project;
import com.construction.repository.ClientInquiryRepository;
import com.construction.repository.DesignRepository;
import com.construction.repository.InquiryMessageRepository;
import com.construction.repository.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * One-time, idempotent data migration executed on startup:
 * 1. Moves Client-Visible Designs that were stored in `projects` (marketing_design = true)
 *    into the dedicated `designs` table, re-pointing inquiries and project requests.
 * 2. Converts legacy single inquiry responses into conversation-thread messages.
 */
@Component
public class DesignMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DesignMigrationRunner.class);

    private final ProjectRepository projectRepository;
    private final DesignRepository designRepository;
    private final ClientInquiryRepository inquiryRepository;
    private final InquiryMessageRepository messageRepository;
    private final JdbcTemplate jdbcTemplate;

    public DesignMigrationRunner(ProjectRepository projectRepository,
                                 DesignRepository designRepository,
                                 ClientInquiryRepository inquiryRepository,
                                 InquiryMessageRepository messageRepository,
                                 JdbcTemplate jdbcTemplate) {
        this.projectRepository = projectRepository;
        this.designRepository = designRepository;
        this.inquiryRepository = inquiryRepository;
        this.messageRepository = messageRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            migrateDesigns();
        } catch (Exception ex) {
            log.warn("Design migration skipped: {}", ex.getMessage());
        }
        try {
            migrateInquiryResponses();
        } catch (Exception ex) {
            log.warn("Inquiry response migration skipped: {}", ex.getMessage());
        }
    }

    private void migrateDesigns() {
        List<Project> legacyDesigns = projectRepository.findByMarketingDesign(true);
        for (Project p : legacyDesigns) {
            Design design = designRepository.findByLegacyProjectId(p.getId()).orElseGet(() -> {
                Design d = new Design();
                d.setName(p.getName());
                d.setCategory(p.getCategory());
                d.setDescription(p.getDescription());
                d.setSpecifications(p.getSpecifications());
                d.setRemarks(p.getConstructionStatus());
                d.setBudget(p.getBudget());
                d.setPriceRange(resolvePrice(p.getPriceRange(), p.getBudget()));
                d.setImageUrls(new ArrayList<>(p.getImageUrls()));
                d.setAddedBy(p.getAddedBy() != null ? p.getAddedBy() : "CLIENT_MANAGER");
                d.setLegacyProjectId(p.getId());
                return designRepository.save(d);
            });

            Long oldId = p.getId();
            Long newId = design.getId();
            safeUpdate("UPDATE client_inquiries SET design_id = ?, project_id = NULL WHERE project_id = ?", newId, oldId);
            safeUpdate("UPDATE project_requests SET design_id = ?, selected_design_id = NULL WHERE selected_design_id = ?", newId, oldId);

            try {
                projectRepository.deleteById(oldId);
                log.info("Migrated design '{}' (project #{} -> design #{})", p.getName(), oldId, newId);
            } catch (Exception ex) {
                // Still referenced elsewhere (e.g. payments). Keep the old row; it is no longer shown in the catalog.
                log.info("Migrated design '{}' to design #{}; legacy project #{} kept because it is still referenced.",
                        p.getName(), newId, oldId);
            }
        }
    }

    private void migrateInquiryResponses() {
        for (ClientInquiry inquiry : inquiryRepository.findAll()) {
            if (inquiry.getResponse() != null && !inquiry.getResponse().isBlank()
                    && messageRepository.countByInquiryId(inquiry.getId()) == 0) {
                messageRepository.save(new InquiryMessage(
                        inquiry,
                        "CLIENT_MANAGER",
                        inquiry.getRespondedBy() != null ? inquiry.getRespondedBy() : "Client Manager",
                        inquiry.getResponse(),
                        inquiry.getRespondedAt()
                ));
            }
        }
    }

    private void safeUpdate(String sql, Object... params) {
        try {
            jdbcTemplate.update(sql, params);
        } catch (Exception ex) {
            log.debug("Skipped migration statement [{}]: {}", sql, ex.getMessage());
        }
    }

    private static String resolvePrice(String priceRange, BigDecimal budget) {
        if (priceRange != null && !priceRange.isBlank()) {
            return priceRange.trim();
        }
        if (budget != null && budget.signum() > 0) {
            return "LKR " + NumberFormat.getNumberInstance(Locale.US).format(budget);
        }
        return "Price on request";
    }
}
