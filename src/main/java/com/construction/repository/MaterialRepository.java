package com.construction.repository;

import com.construction.model.Material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    Optional<Material> findByMaterialCodeIgnoreCase(String materialCode);

    boolean existsByMaterialCodeIgnoreCase(String materialCode);

    boolean existsByMaterialCodeIgnoreCaseAndIdNot(String materialCode, Long id);

    List<Material> findByCategoryIgnoreCase(String category);

    List<Material> findByStatusIgnoreCase(String status);

    @Query("SELECT DISTINCT m.category FROM Material m ORDER BY m.category ASC")
    List<String> findDistinctCategories();

    @Query("SELECT m FROM Material m WHERE " +
            "(:category IS NULL OR LOWER(m.category) = LOWER(:category)) AND " +
            "(:status IS NULL OR LOWER(m.status) = LOWER(:status)) AND " +
            "(:query IS NULL OR (" +
            "LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(m.materialCode) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(m.supplier, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(m.location, '')) LIKE LOWER(CONCAT('%', :query, '%')))) " +
            "ORDER BY m.name ASC")
    List<Material> searchMaterials(
            @Param("query") String query,
            @Param("category") String category,
            @Param("status") String status
    );

    @Query("SELECT m FROM Material m WHERE m.quantity <= m.minStockLevel ORDER BY m.quantity ASC")
    List<Material> findLowStockMaterials();
}
