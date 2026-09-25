package com.construction.repository;

import com.construction.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    List<Employee> findByProjectId(Long projectId);
    void deleteByProjectId(Long projectId);
    
    Optional<Employee> findByEmployeeIdIgnoreCase(String employeeId);
    Optional<Employee> findByEmailIgnoreCase(String email);
    
    boolean existsByEmployeeIdIgnoreCase(String employeeId);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
    boolean existsByEmployeeIdIgnoreCaseAndIdNot(String employeeId, Long id);
    
    List<Employee> findByAssignedProjects_Id(Long projectId);
    
    @Query("SELECT e FROM Employee e WHERE " +
            "LOWER(e.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(e.employeeId, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(e.email, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(e.role, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(e.position, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(e.department, '')) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Employee> searchEmployees(@Param("query") String query);
}
