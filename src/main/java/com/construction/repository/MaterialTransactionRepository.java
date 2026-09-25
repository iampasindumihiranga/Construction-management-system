package com.construction.repository;

import com.construction.model.MaterialTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MaterialTransactionRepository extends JpaRepository<MaterialTransaction, Long> {

    List<MaterialTransaction> findByMaterialIdOrderByTransactionDateDesc(Long materialId);

    List<MaterialTransaction> findByProjectIdOrderByTransactionDateDesc(Long projectId);

    List<MaterialTransaction> findByTypeOrderByTransactionDateDesc(String type);

    @Query("SELECT t FROM MaterialTransaction t WHERE " +
            "(:materialId IS NULL OR t.material.id = :materialId) AND " +
            "(:projectId IS NULL OR t.project.id = :projectId) AND " +
            "(:type IS NULL OR LOWER(t.type) = LOWER(:type)) " +
            "ORDER BY t.transactionDate DESC, t.id DESC")
    List<MaterialTransaction> filterTransactions(
            @Param("materialId") Long materialId,
            @Param("projectId") Long projectId,
            @Param("type") String type
    );

    @Query("SELECT t FROM MaterialTransaction t WHERE t.project.id = :projectId AND t.type = 'ISSUE' ORDER BY t.transactionDate DESC")
    List<MaterialTransaction> findProjectConsumption(@Param("projectId") Long projectId);
}
