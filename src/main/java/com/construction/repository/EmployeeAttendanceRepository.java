package com.construction.repository;

import com.construction.model.EmployeeAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeAttendanceRepository extends JpaRepository<EmployeeAttendance, Long> {

    @Query("SELECT a FROM EmployeeAttendance a WHERE a.employee.id = :employeeId ORDER BY a.date DESC")
    List<EmployeeAttendance> findByEmployeeIdOrderByDateDesc(@Param("employeeId") Long employeeId);

    @Query("SELECT a FROM EmployeeAttendance a WHERE a.date = :date ORDER BY a.employee.name ASC")
    List<EmployeeAttendance> findByDateOrderByEmployeeNameAsc(@Param("date") LocalDate date);

    List<EmployeeAttendance> findByDateBetweenOrderByDateDesc(LocalDate startDate, LocalDate endDate);

    @Query("SELECT a FROM EmployeeAttendance a WHERE a.employee.id = :employeeId AND a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<EmployeeAttendance> findByEmployeeIdAndDateBetweenOrderByDateDesc(
            @Param("employeeId") Long employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT a FROM EmployeeAttendance a WHERE a.employee.id = :employeeId AND a.date = :date")
    Optional<EmployeeAttendance> findByEmployeeIdAndDate(@Param("employeeId") Long employeeId, @Param("date") LocalDate date);

    long countByDateAndStatusIgnoreCase(LocalDate date, String status);

    long countByDate(LocalDate date);

    @Query("SELECT a FROM EmployeeAttendance a WHERE " +
            "(:employeeId IS NULL OR a.employee.id = :employeeId) AND " +
            "(:date IS NULL OR a.date = :date) AND " +
            "(:status IS NULL OR LOWER(a.status) = LOWER(:status)) " +
            "ORDER BY a.date DESC, a.employee.name ASC")
    List<EmployeeAttendance> filterAttendance(
            @Param("employeeId") Long employeeId,
            @Param("date") LocalDate date,
            @Param("status") String status
    );
}

