package com.construction.repository;

import com.construction.enums.PropertyCategory;
import com.construction.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByClientId(Long clientId);
    List<Project> findByCategory(PropertyCategory category);
    List<Project> findByMarketingDesign(boolean marketingDesign);
    List<Project> findByClientIdAndMarketingDesign(Long clientId, boolean marketingDesign);
    List<Project> findByCategoryAndMarketingDesign(PropertyCategory category, boolean marketingDesign);
}
