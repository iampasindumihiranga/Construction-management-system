package com.construction.repository;

import com.construction.model.DownPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface DownPaymentRepository extends JpaRepository<DownPayment, Long> {

    List<DownPayment> findByClientIdOrderByPaymentDateDesc(Long clientId);

    List<DownPayment> findByProjectIdOrderByPaymentDateDesc(Long projectId);

    List<DownPayment> findByClientIdAndProjectIdOrderByPaymentDateDesc(Long clientId, Long projectId);

    List<DownPayment> findByStatusOrderByPaymentDateDesc(String status);

    List<DownPayment> findAllByOrderByCreatedAtDesc();

    List<DownPayment> findAllByOrderByPaymentDateDesc();

    Optional<DownPayment> findByReferenceNumber(String referenceNumber);

    void deleteByClientId(Long clientId);

    void deleteByProjectId(Long projectId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM DownPayment d WHERE d.client.id = :clientId AND " +
           "(d.status = 'CONFIRMED' OR d.status = 'Valid' OR d.status = 'VALID' OR d.status = 'Expiring Soon' OR d.status = 'EXPIRING_SOON')")
    BigDecimal sumConfirmedAmountByClientId(@Param("clientId") Long clientId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM DownPayment d WHERE d.project.id = :projectId AND " +
           "(d.status = 'CONFIRMED' OR d.status = 'Valid' OR d.status = 'VALID' OR d.status = 'Expiring Soon' OR d.status = 'EXPIRING_SOON')")
    BigDecimal sumConfirmedAmountByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM DownPayment d WHERE d.client.id = :clientId AND d.project.id = :projectId AND " +
           "(d.status = 'CONFIRMED' OR d.status = 'Valid' OR d.status = 'VALID' OR d.status = 'Expiring Soon' OR d.status = 'EXPIRING_SOON')")
    BigDecimal sumConfirmedAmountByClientAndProject(@Param("clientId") Long clientId, @Param("projectId") Long projectId);

    @Query("SELECT d FROM DownPayment d WHERE " +
           "(:clientId IS NULL OR d.client.id = :clientId) AND " +
           "(:projectId IS NULL OR (d.project IS NOT NULL AND d.project.id = :projectId)) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(d.client.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(d.referenceNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " (d.project IS NOT NULL AND LOWER(d.project.name) LIKE LOWER(CONCAT('%', :search, '%'))) OR " +
           " LOWER(d.client.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:status IS NULL OR :status = '' OR " +
           " LOWER(d.status) = LOWER(:status) OR " +
           " LOWER(REPLACE(d.status, ' ', '_')) = LOWER(REPLACE(:status, ' ', '_')) OR " +
           " LOWER(REPLACE(d.status, '_', ' ')) = LOWER(REPLACE(:status, '_', ' '))) " +
           "ORDER BY d.paymentDate DESC, d.createdAt DESC")
    List<DownPayment> searchPayments(
            @Param("clientId") Long clientId,
            @Param("projectId") Long projectId,
            @Param("search") String search,
            @Param("status") String status);
}
