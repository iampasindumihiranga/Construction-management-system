package com.construction.repository;

import com.construction.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    Optional<Supplier> findBySupplierCodeIgnoreCase(String supplierCode);

    boolean existsBySupplierCodeIgnoreCase(String supplierCode);

    List<Supplier> findAllByOrderByCreatedAtDesc();

    List<Supplier> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT s FROM Supplier s WHERE " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(s.supplierCode, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(s.contactPerson, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(s.phone, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(s.suppliedItems, '')) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:category IS NULL OR :category = '' OR :category = 'ALL' OR LOWER(s.category) = LOWER(:category)) AND " +
           "(:status IS NULL OR :status = '' OR :status = 'ALL' OR UPPER(s.status) = UPPER(:status)) " +
           "ORDER BY s.createdAt DESC")
    List<Supplier> searchSuppliers(
            @Param("search") String search,
            @Param("category") String category,
            @Param("status") String status
    );
}
