package com.construction.repository;

import com.construction.model.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    Optional<PurchaseOrder> findByPoNumberIgnoreCase(String poNumber);

    boolean existsByPoNumberIgnoreCase(String poNumber);

    List<PurchaseOrder> findByStatusOrderByOrderDateDesc(String status);

    List<PurchaseOrder> findByMaterialIdOrderByOrderDateDesc(Long materialId);

    @Query("SELECT p FROM PurchaseOrder p WHERE " +
            "(:materialId IS NULL OR p.material.id = :materialId) AND " +
            "(:status IS NULL OR LOWER(p.status) = LOWER(:status)) " +
            "ORDER BY p.orderDate DESC, p.id DESC")
    List<PurchaseOrder> filterOrders(
            @Param("materialId") Long materialId,
            @Param("status") String status
    );
}
