package com.construction.repository;

import com.construction.enums.PropertyCategory;
import com.construction.model.Design;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DesignRepository extends JpaRepository<Design, Long> {
    List<Design> findAllByOrderByIdDesc();
    List<Design> findByCategoryOrderByIdDesc(PropertyCategory category);
    Optional<Design> findByLegacyProjectId(Long legacyProjectId);
}
