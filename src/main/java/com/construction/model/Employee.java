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
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", unique = true)
    private String employeeId;

    @NotBlank(message = "Employee name is required")
    @Size(min = 2, max = 100, message = "Employee name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\s.\\-']+$", message = "Employee name must contain only letters, spaces, dots, or hyphens")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Employee email is required")
    @Email(message = "Employee email must be valid")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Employee phone number is required")
    @Pattern(regexp = "^\\+?[0-9\\s()\\-]{7,20}$", message = "Employee phone must be a valid phone number (7-20 digits)")
    @Column(nullable = false)
    private String phone;

    private String position;

    @NotBlank(message = "Employee role is required")
    @Column(nullable = false)
    private String role;

    @Size(max = 1000, message = "Qualifications cannot exceed 1000 characters")
    @Column(length = 1000)
    private String qualifications;

    @NotBlank(message = "Employee department is required")
    @Column(nullable = false)
    private String department;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    private LocalDate joinDate;

    private String status = "ACTIVE";

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String passwordHash;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "project_id")
    @JsonIgnoreProperties({"milestones", "client"})
    private Project project;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "employee_projects",
            joinColumns = @JoinColumn(name = "employee_id"),
            inverseJoinColumns = @JoinColumn(name = "project_id")
    )
    @JsonIgnoreProperties({"milestones", "client"})
    private Set<Project> assignedProjects = new HashSet<>();

    public Employee() {
    }

    public Employee(String employeeId, String name, String email, String phone, String position, String role, String qualifications, String department) {
        this.employeeId = employeeId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.position = position;
        this.role = role;
        this.qualifications = qualifications;
        this.department = department;
        this.status = "ACTIVE";
        this.joinDate = LocalDate.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getQualifications() {
        return qualifications;
    }

    public void setQualifications(String qualifications) {
        this.qualifications = qualifications;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public LocalDate getJoinDate() {
        return joinDate;
    }

    public void setJoinDate(LocalDate joinDate) {
        this.joinDate = joinDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
        if (project != null && !this.assignedProjects.contains(project)) {
            this.assignedProjects.add(project);
        }
    }

    public Set<Project> getAssignedProjects() {
        return assignedProjects;
    }

    public void setAssignedProjects(Set<Project> assignedProjects) {
        this.assignedProjects = assignedProjects != null ? new HashSet<>(assignedProjects) : new HashSet<>();
        if (this.project != null && !this.assignedProjects.contains(this.project)) {
            this.project = this.assignedProjects.isEmpty() ? null : this.assignedProjects.iterator().next();
        }
    }

    public void addAssignedProject(Project project) {
        if (project != null) {
            this.assignedProjects.add(project);
            if (this.project == null) {
                this.project = project;
            }
        }
    }

    public void removeAssignedProject(Project project) {
        if (project != null) {
            this.assignedProjects.remove(project);
            if (this.project != null && this.project.getId().equals(project.getId())) {
                this.project = this.assignedProjects.isEmpty() ? null : this.assignedProjects.iterator().next();
            }
        }
    }
}
