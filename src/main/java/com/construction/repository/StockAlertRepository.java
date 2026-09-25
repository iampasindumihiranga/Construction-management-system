package com.construction.repository;

import com.construction.model.StockAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAlertRepository extends JpaRepository<StockAlert, Long> {
    List<StockAlert> findAllByOrderByCreatedAtDesc();
    List<StockAlert> findByStatusOrderByCreatedAtDesc(String status);
    List<StockAlert> findByMaterialIdOrderByCreatedAtDesc(Long materialId);
}
