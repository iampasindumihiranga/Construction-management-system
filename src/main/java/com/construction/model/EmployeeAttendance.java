package com.construction.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

@Entity
@Table(name = "employee_attendance")
@JsonIgnoreProperties(ignoreUnknown = true)
public class EmployeeAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Employee is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"assignedProjects", "passwordHash"})
    private Employee employee;

    @Transient
    @JsonProperty("employeeId")
    private Long employeeId;

    @NotNull(message = "Attendance date is required")
    @Column(nullable = false)
    private LocalDate date;

    @NotNull(message = "Attendance status is required")
    @Column(nullable = false)
    private String status = "PRESENT"; // PRESENT, ABSENT, LATE, ON_LEAVE, HALF_DAY

    private String checkInTime;

    private String checkOutTime;

    @Column(length = 500)
    private String remarks;

    private String recordedBy;

    public EmployeeAttendance() {
    }

    public EmployeeAttendance(Employee employee, LocalDate date, String status, String remarks, String recordedBy) {
        this.employee = employee;
        this.date = date;
        this.status = status;
        this.remarks = remarks;
        this.recordedBy = recordedBy;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Employee getEmployee() {
        return employee;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
        if (employee != null) {
            this.employeeId = employee.getId();
        }
    }

    public Long getEmployeeId() {
        if (employeeId != null) {
            return employeeId;
        }
        return employee != null ? employee.getId() : null;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
        if (employeeId != null && (this.employee == null || this.employee.getId() == null)) {
            Employee linked = new Employee();
            linked.setId(employeeId);
            this.employee = linked;
        }
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCheckInTime() {
        return checkInTime;
    }

    public void setCheckInTime(String checkInTime) {
        this.checkInTime = checkInTime;
    }

    public String getCheckOutTime() {
        return checkOutTime;
    }

    public void setCheckOutTime(String checkOutTime) {
        this.checkOutTime = checkOutTime;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public String getRecordedBy() {
        return recordedBy;
    }

    public void setRecordedBy(String recordedBy) {
        this.recordedBy = recordedBy;
    }
}
