package com.construction.repository;
import com.construction.model.ProjectTask;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProjectTaskRepository extends JpaRepository<ProjectTask, Long> {
    List<ProjectTask> findByProjectId(Long projectId);
    List<ProjectTask> findByAssignedEmployeeId(Long employeeId);
    void deleteByProjectId(Long projectId);
}
