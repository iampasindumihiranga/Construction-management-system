package com.construction.repository;
import com.construction.model.ProjectExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProjectExpenseRepository extends JpaRepository<ProjectExpense, Long> {
    List<ProjectExpense> findByProjectId(Long projectId);
    void deleteByProjectId(Long projectId);
}
