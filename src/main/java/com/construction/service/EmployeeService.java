package com.construction.service;

import com.construction.auth.ManagementRole;
import com.construction.config.UserAccountRoleSchemaMigration;
import com.construction.exception.BadRequestException;
import com.construction.exception.ConflictException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Employee;
import com.construction.model.EmployeeAttendance;
import com.construction.model.Project;
import com.construction.model.UserAccount;
import com.construction.repository.EmployeeAttendanceRepository;
import com.construction.repository.EmployeeRepository;
import com.construction.repository.ProjectRepository;
import com.construction.repository.UserAccountRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeAttendanceRepository attendanceRepository;
    private final ProjectRepository projectRepository;
    private final UserAccountRepository userAccountRepository;
    private final PasswordService passwordService;
    private final UserAccountRoleSchemaMigration userAccountRoleSchemaMigration;

    public EmployeeService(
            EmployeeRepository employeeRepository,
            EmployeeAttendanceRepository attendanceRepository,
            ProjectRepository projectRepository,
            UserAccountRepository userAccountRepository,
            PasswordService passwordService,
            UserAccountRoleSchemaMigration userAccountRoleSchemaMigration
    ) {
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.projectRepository = projectRepository;
        this.userAccountRepository = userAccountRepository;
        this.passwordService = passwordService;
        this.userAccountRoleSchemaMigration = userAccountRoleSchemaMigration;
    }

    @PostConstruct
    public void seedInitialEmployeesAndAttendance() {
        if (employeeRepository.count() == 0) {
            // Step 1 - Register Sample Employees from user requirement
            // Kasun Perera -> Site Engineer -> EMP001
            Employee kasun = new Employee(
                    "EMP001",
                    "Kasun Perera",
                    "kasun@odiliya.com",
                    "+94 77 123 4567",
                    "Site Engineer",
                    "Site Engineer",
                    "B.Sc. in Civil Engineering (Hons), Chartered Civil Engineer",
                    "Engineering"
            );
            kasun.setAddress("No. 45, Galle Road, Colombo 03");
            kasun.setPasswordHash(passwordService.hash("Employee@123"));

            // Nimal -> Electrician -> EMP002
            Employee nimal = new Employee(
                    "EMP002",
                    "Nimal Fernando",
                    "nimal@odiliya.com",
                    "+94 71 987 6543",
                    "Electrician",
                    "Electrician",
                    "NVQ Level 4 Certified Master Electrician",
                    "Electrical & Utilities"
            );
            nimal.setAddress("No. 12, Kandy Road, Kiribathgoda");
            nimal.setPasswordHash(passwordService.hash("Employee@123"));

            // Amal -> Plumber -> EMP003
            Employee amal = new Employee(
                    "EMP003",
                    "Amal Silva",
                    "amal@odiliya.com",
                    "+94 76 555 4321",
                    "Plumber",
                    "Plumber",
                    "Advanced Certificate in Commercial Plumbing & Piping Systems",
                    "Plumbing & Sanitation"
            );
            amal.setAddress("No. 88, Negombo Road, Ja-Ela");
            amal.setPasswordHash(passwordService.hash("Employee@123"));

            // Assign employees to projects (e.g. ABC Apartment Project and XYZ Building Construction)
            List<Project> allProjects = projectRepository.findAll();
            if (!allProjects.isEmpty()) {
                Project primaryProject = allProjects.get(0);
                kasun.setProject(primaryProject);
                nimal.setProject(primaryProject);
                amal.setProject(primaryProject);
                
                Set<Project> assignedSet = new HashSet<>(allProjects);
                kasun.setAssignedProjects(assignedSet);
                nimal.setAssignedProjects(new HashSet<>(List.of(primaryProject)));
                amal.setAssignedProjects(new HashSet<>(List.of(primaryProject)));
            }

            Employee savedKasun = employeeRepository.save(kasun);
            Employee savedNimal = employeeRepository.save(nimal);
            Employee savedAmal = employeeRepository.save(amal);

            // Create User Accounts for employee login
            createUserAccountForEmployee(savedKasun);
            createUserAccountForEmployee(savedNimal);
            createUserAccountForEmployee(savedAmal);

            // Step 5 - Seed Sample Attendance for Kasun as requested:
            // 09/09/2026 -> Present
            // 10/09/2026 -> Present
            // 11/09/2026 -> Absent
            LocalDate d1 = LocalDate.of(2026, 9, 9);
            LocalDate d2 = LocalDate.of(2026, 9, 10);
            LocalDate d3 = LocalDate.of(2026, 9, 11);

            EmployeeAttendance att1 = new EmployeeAttendance(savedKasun, d1, "PRESENT", "On site - Morning foundation inspection", "Employee Manager");
            att1.setCheckInTime("08:00");
            att1.setCheckOutTime("17:00");

            EmployeeAttendance att2 = new EmployeeAttendance(savedKasun, d2, "PRESENT", "On site - Structural beam verification", "Employee Manager");
            att2.setCheckInTime("08:15");
            att2.setCheckOutTime("17:30");

            EmployeeAttendance att3 = new EmployeeAttendance(savedKasun, d3, "ABSENT", "Sick leave approved", "Employee Manager");

            EmployeeAttendance attNimal = new EmployeeAttendance(savedNimal, d1, "PRESENT", "Wiring installation phase 1", "Employee Manager");
            attNimal.setCheckInTime("08:30");
            attNimal.setCheckOutTime("17:00");

            EmployeeAttendance attAmal = new EmployeeAttendance(savedAmal, d1, "PRESENT", "Plumbing rough-in inspection", "Employee Manager");
            attAmal.setCheckInTime("08:00");
            attAmal.setCheckOutTime("16:30");

            attendanceRepository.saveAll(List.of(att1, att2, att3, attNimal, attAmal));
        } else {
            // Ensure employee IDs and UserAccounts exist for any existing employees
            for (Employee emp : employeeRepository.findAll()) {
                if (emp.getEmployeeId() == null || emp.getEmployeeId().isBlank()) {
                    emp.setEmployeeId(generateEmployeeId());
                    employeeRepository.save(emp);
                }
                if (emp.getEmail() != null && userAccountRepository.findByUsernameIgnoreCase(emp.getEmail()).isEmpty()
                        && userAccountRepository.findByUsernameIgnoreCase(emp.getEmployeeId()).isEmpty()) {
                    createUserAccountForEmployee(emp);
                }
            }
        }
    }

    public Employee create(Employee employee) {
        validateEmployeeData(employee, true);

        // Employee IDs are system-owned values so they remain unique and sequential.
        employee.setEmployeeId(generateEmployeeId());

        if (employee.getStatus() == null || employee.getStatus().isBlank()) {
            employee.setStatus("ACTIVE");
        }
        if (employee.getJoinDate() == null) {
            employee.setJoinDate(LocalDate.now());
        }
        if (employee.getPosition() == null || employee.getPosition().isBlank()) {
            employee.setPosition(employee.getRole() != null ? employee.getRole() : "General Staff");
        }
        if (employee.getRole() == null || employee.getRole().isBlank()) {
            employee.setRole(employee.getPosition());
        }

        if (employee.getPasswordHash() == null || employee.getPasswordHash().isBlank()) {
            throw new BadRequestException("Password is required when registering an employee");
        } else if (!employee.getPasswordHash().startsWith("$2a$")) {
            validatePassword(employee.getPasswordHash());
            employee.setPasswordHash(passwordService.hash(employee.getPasswordHash()));
        }

        Employee saved = employeeRepository.save(employee);
        createUserAccountForEmployee(saved);
        return saved;
    }

    private void validateEmployeeData(Employee employee, boolean isNew) {
        if (employee.getName() == null || employee.getName().trim().length() < 2) {
            throw new BadRequestException("Full name is required and must be at least 2 characters long");
        }
        if (!employee.getName().trim().matches("^[a-zA-Z\\s.\\-']+$")) {
            throw new BadRequestException("Employee name must contain only letters, spaces, dots, or hyphens");
        }
        if (employee.getEmail() == null || employee.getEmail().isBlank()) {
            throw new BadRequestException("Email address is required for employee registration and login");
        }
        String emailPattern = "^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$";
        if (!employee.getEmail().trim().matches(emailPattern)) {
            throw new BadRequestException("A valid email address is required (e.g. employee@odiliya.com)");
        }
        if (isNew) {
            if (employeeRepository.existsByEmailIgnoreCase(employee.getEmail().trim())) {
                throw new ConflictException("Employee with email '" + employee.getEmail().trim() + "' already exists");
            }
        } else if (employee.getId() != null) {
            if (employeeRepository.existsByEmailIgnoreCaseAndIdNot(employee.getEmail().trim(), employee.getId())) {
                throw new ConflictException("Employee with email '" + employee.getEmail().trim() + "' already exists");
            }
        }
        if (employee.getPhone() == null || employee.getPhone().isBlank()) {
            throw new BadRequestException("Contact phone number is required");
        }
        if (!employee.getPhone().trim().matches("^\\+?[0-9\\s()\\-]{7,20}$")) {
            throw new BadRequestException("Phone number must be a valid format with 7 to 20 digits");
        }
        if (employee.getRole() == null || employee.getRole().isBlank()) {
            throw new BadRequestException("Role / Trade assignment is required");
        }
        if (employee.getDepartment() == null || employee.getDepartment().isBlank()) {
            throw new BadRequestException("Department assignment is required");
        }
        if (employee.getAddress() != null && employee.getAddress().length() > 255) {
            throw new BadRequestException("Address cannot exceed 255 characters");
        }
        if (employee.getQualifications() != null && employee.getQualifications().length() > 1000) {
            throw new BadRequestException("Qualifications cannot exceed 1000 characters");
        }
    }

    private void createUserAccountForEmployee(Employee employee) {
        String empId = employee.getEmployeeId();
        String email = employee.getEmail();
        String passwordHash = employee.getPasswordHash() != null ? employee.getPasswordHash() : passwordService.hash("Employee@123");

        // Create or update UserAccount for employeeId if present
        if (empId != null && !empId.isBlank()) {
            UserAccount account = userAccountRepository.findByUsernameIgnoreCase(empId)
                    .orElseGet(UserAccount::new);
            account.setUsername(empId);
            account.setPasswordHash(passwordHash);
            account.setRole(ManagementRole.EMPLOYEE);
            account.setDisplayName(employee.getName());
            account.setClientId(null);
            account.setEmployeeId(employee.getId());
            userAccountRepository.save(account);
        }

        // Create or update UserAccount for email if present
        if (email != null && !email.isBlank()) {
            UserAccount account = userAccountRepository.findByUsernameIgnoreCase(email)
                    .orElseGet(UserAccount::new);
            account.setUsername(email);
            account.setPasswordHash(passwordHash);
            account.setRole(ManagementRole.EMPLOYEE);
            account.setDisplayName(employee.getName());
            account.setClientId(null);
            account.setEmployeeId(employee.getId());
            userAccountRepository.save(account);
        }
    }

    public String previewNextEmployeeId() {
        return generateEmployeeId();
    }

    private String generateEmployeeId() {
        long next = 1;
        for (Employee emp : employeeRepository.findAll()) {
            String current = emp.getEmployeeId();
            if (current == null || !current.toUpperCase().startsWith("EMP")) continue;
            try {
                String numPart = current.substring(3).replaceAll("\\D", "");
                if (!numPart.isBlank()) {
                    next = Math.max(next, Long.parseLong(numPart) + 1);
                }
            } catch (NumberFormatException ignored) {
            }
        }
        String id;
        do {
            id = String.format("EMP%03d", next++);
        } while (employeeRepository.existsByEmployeeIdIgnoreCase(id));
        return id;
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new BadRequestException("Password must contain at least 8 characters");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new BadRequestException("Password must contain both letters and numbers");
        }
    }

    public List<Employee> findAll(String search, Long projectId) {
        if (search != null && !search.isBlank()) {
            return employeeRepository.searchEmployees(search.trim());
        }
        if (projectId != null) {
            List<Employee> direct = employeeRepository.findByProjectId(projectId);
            List<Employee> many = employeeRepository.findByAssignedProjects_Id(projectId);
            Set<Employee> combined = new HashSet<>(direct);
            combined.addAll(many);
            return new ArrayList<>(combined);
        }
        return employeeRepository.findAll();
    }

    public Employee findById(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id " + id));
    }

    public Employee findByEmployeeId(String employeeId) {
        return employeeRepository.findByEmployeeIdIgnoreCase(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with Employee ID: " + employeeId));
    }

    public Employee updateProfile(Long id, Employee update) {
        Employee existing = findById(id);
        validateEmployeeData(update, false);

        String oldEmail = existing.getEmail();
        existing.setName(update.getName().trim());
        existing.setPhone(update.getPhone().trim());
        existing.setEmail(update.getEmail().trim());
        existing.setPosition(update.getPosition() != null && !update.getPosition().isBlank() ? update.getPosition().trim() : update.getRole().trim());
        existing.setRole(update.getRole().trim());
        existing.setQualifications(update.getQualifications());
        existing.setDepartment(update.getDepartment().trim());
        existing.setAddress(update.getAddress());
        if (update.getStatus() != null && !update.getStatus().isBlank()) {
            existing.setStatus(update.getStatus().trim().toUpperCase());
        }
        if (update.getJoinDate() != null) {
            existing.setJoinDate(update.getJoinDate());
        }
        if (update.getPasswordHash() != null && !update.getPasswordHash().isBlank()) {
            validatePassword(update.getPasswordHash());
            existing.setPasswordHash(update.getPasswordHash().startsWith("$2a$")
                    ? update.getPasswordHash()
                    : passwordService.hash(update.getPasswordHash()));
        }

        // If email changed, cleanup old email account
        if (oldEmail != null && !oldEmail.equalsIgnoreCase(existing.getEmail())) {
            userAccountRepository.findByUsernameIgnoreCase(oldEmail).ifPresent(userAccountRepository::delete);
        }

        Employee saved = employeeRepository.save(existing);
        createUserAccountForEmployee(saved);
        return saved;
    }

    public Employee assignRole(Long id, String role, String position) {
        if (role == null || role.isBlank()) {
            throw new BadRequestException("Role is required when assigning role");
        }
        Employee existing = findById(id);
        existing.setRole(role.trim());
        if (position != null && !position.isBlank()) {
            existing.setPosition(position.trim());
        } else {
            existing.setPosition(role.trim());
        }
        return employeeRepository.save(existing);
    }

    public Employee assignProjects(Long id, List<Long> projectIds) {
        Employee existing = findById(id);
        Set<Project> projectSet = new HashSet<>();
        if (projectIds != null && !projectIds.isEmpty()) {
            for (Long pid : projectIds) {
                projectRepository.findById(pid).ifPresent(projectSet::add);
            }
        }
        existing.setAssignedProjects(projectSet);
        if (!projectSet.isEmpty()) {
            existing.setProject(projectSet.iterator().next());
        } else {
            existing.setProject(null);
        }
        return employeeRepository.save(existing);
    }

    public void assignEmployeesToProject(Long projectId, List<Long> employeeIds) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id " + projectId));

        if (employeeIds == null) return;
        for (Long empId : employeeIds) {
            Employee emp = findById(empId);
            emp.addAssignedProject(project);
            employeeRepository.save(emp);
        }
    }

    public void delete(Long id) {
        Employee existing = findById(id);
        // remove attendance records
        List<EmployeeAttendance> attendanceList = attendanceRepository.findByEmployeeIdOrderByDateDesc(id);
        attendanceRepository.deleteAll(attendanceList);

        // remove user accounts
        userAccountRepository.findByUsernameIgnoreCase(existing.getEmail())
                .ifPresent(userAccountRepository::delete);
        if (existing.getEmployeeId() != null) {
            userAccountRepository.findByUsernameIgnoreCase(existing.getEmployeeId())
                    .ifPresent(userAccountRepository::delete);
        }

        employeeRepository.delete(existing);
    }

    // Step 5: Attendance recording & monitoring
    public EmployeeAttendance recordAttendance(EmployeeAttendance input) {
        Long employeeId = input.getEmployeeId();
        if (employeeId == null && input.getEmployee() != null) {
            employeeId = input.getEmployee().getId();
        }
        if (employeeId == null) {
            throw new BadRequestException("Employee is required for recording attendance");
        }
        Employee employee = findById(employeeId);
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        LocalDate date = input.getDate() != null ? input.getDate() : today;

        if (!date.equals(today)) {
            throw new BadRequestException("Attendance can only be marked for today. Previous and upcoming days attendance cannot be marked.");
        }

        String rawStatus = input.getStatus() != null ? input.getStatus().trim().toUpperCase() : "PRESENT";
        if (!List.of("PRESENT", "ABSENT", "LATE", "ON_LEAVE", "HALF_DAY").contains(rawStatus)) {
            throw new BadRequestException("Invalid attendance status: " + rawStatus + ". Valid statuses are PRESENT, ABSENT, LATE, ON_LEAVE, HALF_DAY.");
        }

        String checkIn = input.getCheckInTime() != null ? input.getCheckInTime().trim() : null;
        String checkOut = input.getCheckOutTime() != null ? input.getCheckOutTime().trim() : null;

        if ("PRESENT".equalsIgnoreCase(rawStatus)) {
            if (checkIn == null || checkIn.isBlank()) {
                checkIn = "08:00";
            }
        } else if ("LATE".equalsIgnoreCase(rawStatus)) {
            if (checkIn == null || checkIn.isBlank()) {
                checkIn = "09:30";
            }
        } else if ("HALF_DAY".equalsIgnoreCase(rawStatus)) {
            if (checkIn == null || checkIn.isBlank()) {
                checkIn = "08:00";
            }
        }

        if (checkIn != null && !checkIn.isBlank()) {
            if (!checkIn.matches("^([01]?[0-9]|2[0-3]):[0-5][0-9]$")) {
                throw new BadRequestException("Check-in time must be a valid 24-hour time in HH:mm format (e.g. 08:30)");
            }
        }

        if (checkOut != null && !checkOut.isBlank()) {
            if (!checkOut.matches("^([01]?[0-9]|2[0-3]):[0-5][0-9]$")) {
                throw new BadRequestException("Check-out time must be a valid 24-hour time in HH:mm format (e.g. 17:00)");
            }
        }

        if (checkIn != null && !checkIn.isBlank() && checkOut != null && !checkOut.isBlank()) {
            java.time.LocalTime inTime = java.time.LocalTime.parse(checkIn.length() == 4 ? "0" + checkIn : checkIn);
            java.time.LocalTime outTime = java.time.LocalTime.parse(checkOut.length() == 4 ? "0" + checkOut : checkOut);
            if (!outTime.isAfter(inTime)) {
                throw new BadRequestException("Check-out time (" + checkOut + ") must be after check-in time (" + checkIn + ")");
            }
        }

        Optional<EmployeeAttendance> existing = attendanceRepository.findByEmployeeIdAndDate(employee.getId(), date);
        if (existing.isPresent()) {
            EmployeeAttendance existingRecord = existing.get();
            if (existingRecord.getCheckOutTime() != null && !existingRecord.getCheckOutTime().isBlank()) {
                throw new BadRequestException("Attendance for " + employee.getName() + " on " + date + " is already marked and completed. Time In & Time Out are locked.");
            }
            if (checkOut != null && !checkOut.isBlank()) {
                if (existingRecord.getCheckInTime() != null) {
                    java.time.LocalTime inTime = java.time.LocalTime.parse(existingRecord.getCheckInTime().length() == 4 ? "0" + existingRecord.getCheckInTime() : existingRecord.getCheckInTime());
                    java.time.LocalTime outTime = java.time.LocalTime.parse(checkOut.length() == 4 ? "0" + checkOut : checkOut);
                    if (!outTime.isAfter(inTime)) {
                        throw new BadRequestException("Check-out time (" + checkOut + ") must be after check-in time (" + existingRecord.getCheckInTime() + ")");
                    }
                }
                existingRecord.setCheckOutTime(checkOut);
                if (input.getRemarks() != null && !input.getRemarks().isBlank() && !"Unavailable".equalsIgnoreCase(input.getRemarks())) {
                    existingRecord.setRemarks(input.getRemarks().trim());
                }
                return attendanceRepository.save(existingRecord);
            }
            throw new BadRequestException("Time In for " + employee.getName() + " on " + date + " is already recorded. Please record Time Out to complete the day's attendance.");
        }

        EmployeeAttendance attendance = new EmployeeAttendance();
        attendance.setEmployee(employee);
        attendance.setDate(date);
        attendance.setStatus(rawStatus);
        String finalRemarks = input.getRemarks() != null ? input.getRemarks().trim() : "";
        if ("PRESENT".equalsIgnoreCase(rawStatus)) {
            finalRemarks = "Unavailable";
        }
        attendance.setRemarks(finalRemarks);
        if ("ABSENT".equalsIgnoreCase(rawStatus) || "ON_LEAVE".equalsIgnoreCase(rawStatus)) {
            attendance.setCheckInTime(null);
            attendance.setCheckOutTime(null);
        } else {
            attendance.setCheckInTime(checkIn);
            attendance.setCheckOutTime(checkOut);
        }
        attendance.setRecordedBy(input.getRecordedBy() != null ? input.getRecordedBy() : "Employee Manager");

        return attendanceRepository.save(attendance);
    }

    public EmployeeAttendance recordCheckOut(Long attendanceId, String checkOutTime, String remarks) {
        EmployeeAttendance record = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id " + attendanceId));

        if (record.getCheckOutTime() != null && !record.getCheckOutTime().isBlank()) {
            throw new BadRequestException("Check-out has already been recorded for this employee today (" + record.getCheckOutTime() + ").");
        }

        if ("ABSENT".equalsIgnoreCase(record.getStatus()) || "ON_LEAVE".equalsIgnoreCase(record.getStatus())) {
            throw new BadRequestException("Cannot record check-out for employee marked as " + record.getStatus());
        }

        String finalCheckOut = checkOutTime != null && !checkOutTime.isBlank() ? checkOutTime.trim() : "17:00";
        if (!finalCheckOut.matches("^([01]?[0-9]|2[0-3]):[0-5][0-9]$")) {
            throw new BadRequestException("Check-out time must be a valid 24-hour time in HH:mm format (e.g. 17:00)");
        }

        if (record.getCheckInTime() != null && !record.getCheckInTime().isBlank()) {
            java.time.LocalTime inTime = java.time.LocalTime.parse(record.getCheckInTime().length() == 4 ? "0" + record.getCheckInTime() : record.getCheckInTime());
            java.time.LocalTime outTime = java.time.LocalTime.parse(finalCheckOut.length() == 4 ? "0" + finalCheckOut : finalCheckOut);
            if (!outTime.isAfter(inTime)) {
                throw new BadRequestException("Check-out time (" + finalCheckOut + ") must be after check-in time (" + record.getCheckInTime() + ")");
            }
        }

        record.setCheckOutTime(finalCheckOut);
        if (remarks != null && !remarks.isBlank() && !"Unavailable".equalsIgnoreCase(remarks)) {
            record.setRemarks(remarks.trim());
        }
        return attendanceRepository.save(record);
    }

    public List<EmployeeAttendance> getAttendanceRecords(Long employeeId, LocalDate date, String status) {
        return attendanceRepository.filterAttendance(employeeId, date, status);
    }

    public List<EmployeeAttendance> getAttendanceForEmployee(Long employeeId) {
        return attendanceRepository.findByEmployeeIdOrderByDateDesc(employeeId);
    }

    public void deleteAttendance(Long id) {
        attendanceRepository.deleteById(id);
    }

    public void deleteAttendanceByEmployeeAndDate(Long employeeId, LocalDate date) {
        attendanceRepository.findByEmployeeIdAndDate(employeeId, date)
                .ifPresent(attendanceRepository::delete);
    }

    public Map<String, Object> getAttendanceSummary(LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        Map<String, Object> summary = new HashMap<>();

        long totalStaff = employeeRepository.count();
        long presentCount = attendanceRepository.countByDateAndStatusIgnoreCase(queryDate, "PRESENT");
        long absentCount = attendanceRepository.countByDateAndStatusIgnoreCase(queryDate, "ABSENT");
        long lateCount = attendanceRepository.countByDateAndStatusIgnoreCase(queryDate, "LATE");
        long onLeaveCount = attendanceRepository.countByDateAndStatusIgnoreCase(queryDate, "ON_LEAVE");
        long totalRecorded = attendanceRepository.countByDate(queryDate);
        long unmarkedCount = Math.max(0, totalStaff - totalRecorded);

        summary.put("date", queryDate);
        summary.put("totalStaff", totalStaff);
        summary.put("presentCount", presentCount);
        summary.put("absentCount", absentCount);
        summary.put("lateCount", lateCount);
        summary.put("onLeaveCount", onLeaveCount);
        summary.put("unmarkedCount", unmarkedCount);
        summary.put("attendanceRate", totalStaff > 0 ? Math.round(((double) presentCount / totalStaff) * 100.0) : 0);

        return summary;
    }

    // Step 6: Employee views assigned projects
    public List<Project> getAssignedProjects(Long employeeId) {
        Employee employee = findById(employeeId);
        Set<Project> projects = new HashSet<>(employee.getAssignedProjects());
        if (employee.getProject() != null) {
            projects.add(employee.getProject());
        }
        return new ArrayList<>(projects);
    }

    public List<Project> getAssignedProjectsByUsername(String username) {
        Employee employee = employeeRepository.findByEmployeeIdIgnoreCase(username)
                .orElseGet(() -> employeeRepository.findByEmailIgnoreCase(username)
                        .orElse(null));
        if (employee == null) {
            return List.of();
        }
        return getAssignedProjects(employee.getId());
    }

    public Employee getEmployeeByUsername(String username) {
        return employeeRepository.findByEmployeeIdIgnoreCase(username)
                .orElseGet(() -> employeeRepository.findByEmailIgnoreCase(username)
                        .orElseThrow(() -> new ResourceNotFoundException("Employee not found for username: " + username)));
    }

    public Map<String, Object> getDashboardSummary() {
        Map<String, Object> summary = new HashMap<>();
        List<Employee> all = employeeRepository.findAll();
        long total = all.size();
        long active = all.stream().filter(e -> "ACTIVE".equalsIgnoreCase(e.getStatus())).count();

        Map<String, Long> roleCounts = all.stream()
                .collect(Collectors.groupingBy(
                        e -> (e.getRole() != null && !e.getRole().isBlank()) ? e.getRole() : "Unassigned",
                        Collectors.counting()
                ));

        Map<String, Object> todayAttendance = getAttendanceSummary(LocalDate.now());

        summary.put("totalEmployees", total);
        summary.put("activeEmployees", active);
        summary.put("roleCounts", roleCounts);
        summary.put("todayAttendance", todayAttendance);

        return summary;
    }
}
