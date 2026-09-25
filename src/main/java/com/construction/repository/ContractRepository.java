package com.construction.repository;

import com.construction.model.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {
    List<Contract> findByClientId(Long clientId);

    @Query("SELECT c FROM Contract c WHERE c.endDate IS NOT NULL AND c.endDate BETWEEN :start AND :end ORDER BY c.endDate ASC")
    List<Contract> findExpiringBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT c FROM Contract c WHERE c.endDate IS NOT NULL AND c.endDate <= :end AND (c.status IS NULL OR c.status NOT IN ('TERMINATED', 'COMPLETED')) ORDER BY c.endDate ASC")
    List<Contract> findExpiringOrExpired(@Param("end") LocalDate end);

    @Query("SELECT c FROM Contract c WHERE c.endDate IS NOT NULL AND c.endDate <= :now ORDER BY c.endDate ASC")
    List<Contract> findExpired(@Param("now") LocalDate now);
}
