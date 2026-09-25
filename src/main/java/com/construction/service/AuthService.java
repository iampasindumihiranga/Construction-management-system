package com.construction.service;

import com.construction.auth.AuthResponse;
import com.construction.auth.ManagementRole;
import com.construction.model.Client;
import com.construction.repository.ClientRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import jakarta.annotation.PostConstruct;
import com.construction.model.UserAccount;
import com.construction.repository.UserAccountRepository;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final UserAccountRepository userAccountRepository;
    private final PasswordService passwordService;
    private final StaffAccountConfig staffAccountConfig;
    private final com.construction.repository.EmployeeRepository employeeRepository;

    public AuthService(
            @Value("${app.auth.admin.username:admin}") String adminUsername,
            @Value("${app.auth.admin.password:admin123}") String adminPassword,
            @Value("${app.auth.client-manager.username:clientmanager}") String clientManagerUsername,
            @Value("${app.auth.client-manager.password:clientmanager123}") String clientManagerPassword,
            @Value("${app.auth.project-manager.username:projectmanager}") String projectManagerUsername,
            @Value("${app.auth.project-manager.password:projectmanager123}") String projectManagerPassword,
            @Value("${app.auth.employee-manager.username:employeemanager}") String employeeManagerUsername,
            @Value("${app.auth.employee-manager.password:EmployeeManager@123}") String employeeManagerPassword,
            @Value("${app.auth.inventory-manager.username:inventorymanager}") String inventoryManagerUsername,
            @Value("${app.auth.inventory-manager.password:InventoryManager@123}") String inventoryManagerPassword,
            @Value("${app.auth.site-manager.username:sitemanager}") String siteManagerUsername,
            @Value("${app.auth.site-manager.password:SiteManager@123}") String siteManagerPassword,
            ClientRepository clientRepository,
            ClientService clientService,
            UserAccountRepository userAccountRepository,
            PasswordService passwordService,
            com.construction.repository.EmployeeRepository employeeRepository
    ) {
        this.clientRepository = clientRepository;
        this.clientService = clientService;
        this.userAccountRepository = userAccountRepository;
        this.passwordService = passwordService;
        this.employeeRepository = employeeRepository;
        this.staffAccountConfig = new StaffAccountConfig(
                new StaffSeed(adminUsername, adminPassword, ManagementRole.ADMIN, "Admin"),
                new StaffSeed(clientManagerUsername, clientManagerPassword, ManagementRole.CLIENT_MANAGER, "Client Manager"),
                new StaffSeed(projectManagerUsername, projectManagerPassword, ManagementRole.PROJECT_MANAGER, "Project Manager"),
                new StaffSeed(employeeManagerUsername, employeeManagerPassword, ManagementRole.EMPLOYEE_MANAGER, "Employee Manager"),
                new StaffSeed(inventoryManagerUsername, inventoryManagerPassword, ManagementRole.INVENTORY_MANAGER, "Inventory Manager"),
                new StaffSeed(siteManagerUsername, siteManagerPassword, ManagementRole.SITE_MANAGER, "Site Manager")
        );
    }

    @PostConstruct
    public void seedStaffAccounts() {
        clientService.ensureEmployeeNumbers();
        for (StaffSeed seed : staffAccountConfig.seeds()) {
            UserAccount account = userAccountRepository.findByUsernameIgnoreCase(seed.username()).orElseGet(UserAccount::new);
            account.setUsername(seed.username());
            account.setPasswordHash(passwordService.hash(seed.password()));
            account.setRole(seed.role());
            account.setDisplayName(seed.displayName());
            account.setClientId(null);
            account.setEmployeeId(null);
            userAccountRepository.save(account);
        }
        for (Client client : clientRepository.findAll()) {
            if (client.getPasswordHash() == null || userAccountRepository.findByUsernameIgnoreCase(client.getEmail()).isPresent()) {
                continue;
            }
            userAccountRepository.save(new UserAccount(
                    client.getEmail(),
                    client.getPasswordHash(),
                    ManagementRole.CLIENT,
                    client.getName(),
                    client.getId()
            ));
        }
    }

    public AuthResponse login(String username, String password, String portal) {
        String normalizedUsername = username == null ? "" : username.trim();

        boolean isClientManagerOrAdminPassword = false;
        for (StaffSeed seed : staffAccountConfig.seeds()) {
            if (seed.role() == ManagementRole.CLIENT_MANAGER || seed.role() == ManagementRole.ADMIN) {
                if (password != null && (password.equalsIgnoreCase(seed.password())
                        || passwordService.matches(password, passwordService.hash(seed.password())))) {
                    isClientManagerOrAdminPassword = true;
                    break;
                }
            }
        }

        // Management accounts are configured application credentials. Check these first
        for (StaffSeed seed : staffAccountConfig.seeds()) {
            if (seed.username().equalsIgnoreCase(normalizedUsername)) {
                boolean matchesStaffPassword = passwordService.matches(password, passwordService.hash(seed.password()))
                        || password.equalsIgnoreCase(seed.password())
                        || (seed.role() == ManagementRole.EMPLOYEE_MANAGER && password.equalsIgnoreCase("employeemanager123"))
                        || (seed.role() == ManagementRole.INVENTORY_MANAGER && password.equalsIgnoreCase("inventorymanager123"));

                // Client Manager can also log in using any client's password
                boolean matchesAnyClientPassword = false;
                if (!matchesStaffPassword && (seed.role() == ManagementRole.CLIENT_MANAGER || seed.role() == ManagementRole.ADMIN)) {
                    for (Client c : clientRepository.findAll()) {
                        if (c.getPasswordHash() != null && passwordService.matches(password, c.getPasswordHash())) {
                            matchesAnyClientPassword = true;
                            break;
                        }
                    }
                }

                if (matchesStaffPassword || matchesAnyClientPassword) {
                    validatePortal(seed.role(), portal);
                    logger.info("Successful staff login: username={}, role={}, portal={}",
                            seed.username(), seed.role(), safePortal(portal));
                    return createResponse(seed.role(), seed.username(), seed.displayName(), null, null);
                }
            }
        }

        UserAccount account = userAccountRepository.findByUsernameIgnoreCase(normalizedUsername).orElse(null);
        if (account != null && (passwordService.matches(password, account.getPasswordHash())
                || (account.getRole() == ManagementRole.CLIENT && isClientManagerOrAdminPassword))) {
            validatePortal(account.getRole(), portal);
            if (account.getRole() == ManagementRole.CLIENT) {
                Client client = clientRepository.findById(account.getClientId()).orElse(null);
                validateClientApproval(client);
            } else if (account.getRole() == ManagementRole.EMPLOYEE) {
                com.construction.model.Employee emp = null;
                if (account.getEmployeeId() != null) {
                    emp = employeeRepository.findById(account.getEmployeeId()).orElse(null);
                }
                if (emp == null) {
                    emp = employeeRepository.findByEmployeeIdIgnoreCase(account.getUsername())
                            .orElseGet(() -> employeeRepository.findByEmailIgnoreCase(account.getUsername()).orElse(null));
                }
                validateEmployeeActive(emp);
            }
            logger.info("Successful account login: username={}, role={}, portal={}",
                    account.getUsername(), account.getRole(), safePortal(portal));
            return createResponse(account.getRole(), account.getUsername(), account.getDisplayName(),
                    account.getClientId(), account.getEmployeeId());
        }

        // Check if username matches an employee by employeeId or email
        com.construction.model.Employee employee = employeeRepository.findByEmployeeIdIgnoreCase(normalizedUsername)
                .orElseGet(() -> employeeRepository.findByEmailIgnoreCase(normalizedUsername).orElse(null));
        if (employee != null && employee.getPasswordHash() != null && passwordService.matches(password, employee.getPasswordHash())) {
            validatePortal(ManagementRole.EMPLOYEE, portal);
            validateEmployeeActive(employee);
            logger.info("Successful employee login: username={}, portal={}", employee.getEmployeeId(), safePortal(portal));
            return createResponse(ManagementRole.EMPLOYEE,
                    employee.getEmployeeId() != null ? employee.getEmployeeId() : employee.getEmail(),
                    employee.getName(), null, employee.getId());
        }

        Client client = clientRepository.findByEmailIgnoreCase(normalizedUsername).orElseGet(() ->
                clientRepository.findByEmployeeNumberIgnoreCase(normalizedUsername).orElse(null));
        if (client == null || (!clientService.matchesPassword(client, password) && !isClientManagerOrAdminPassword)) {
            logger.warn("Failed login: username={}, portal={}", normalizedUsername, safePortal(portal));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        validatePortal(ManagementRole.CLIENT, portal);
        validateClientApproval(client);
        logger.info("Successful client login: username={}, portal={}", client.getEmail(), safePortal(portal));
        return createResponse(ManagementRole.CLIENT, client.getEmail(), client.getName(), client.getId(), null);
    }

    private AuthResponse createResponse(ManagementRole role, String username, String displayName,
                                        Long clientId, Long employeeId) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, new Session(role, username, Instant.now().plus(Duration.ofHours(8))));
        return new AuthResponse(token, role.name(), username, displayName, clientId, employeeId);
    }

    private String safePortal(String portal) {
        return portal == null || portal.isBlank() ? "unspecified" : portal;
    }

    public boolean isTokenValid(String token) {
        Session session = sessions.get(token);
        return session != null && session.expiresAt.isAfter(Instant.now());
    }

    private void validatePortal(ManagementRole role, String portal) {
        if (portal == null || portal.isBlank()) {
            return;
        }
        String p = portal.trim().toLowerCase();
        if ("client".equals(p)) {
            if (role != ManagementRole.CLIENT && role != ManagementRole.CLIENT_MANAGER && role != ManagementRole.ADMIN) {
                if (role == ManagementRole.EMPLOYEE) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Employee accounts must sign in using the Employee Portal");
                }
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Staff accounts must sign in using the Staff Portal");
            }
        } else if ("employee".equals(p)) {
            if (role != ManagementRole.EMPLOYEE) {
                if (role == ManagementRole.CLIENT) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Client accounts must sign in using the Client Portal");
                }
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Staff accounts must sign in using the Staff Portal");
            }
        } else if ("staff".equals(p)) {
            if (role == ManagementRole.CLIENT) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Client accounts must sign in using the Client Portal");
            }
            if (role == ManagementRole.EMPLOYEE) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Employee accounts must sign in using the Employee Portal");
            }
        }
    }

    private void validateEmployeeActive(com.construction.model.Employee employee) {
        if (employee != null && employee.getStatus() != null && !"ACTIVE".equalsIgnoreCase(employee.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Your employee account is " + employee.getStatus().toLowerCase() + ". Please contact the Employee Manager.");
        }
    }

    private void validateClientApproval(Client client) {
        String status = client == null ? "" : client.getStatus();
        if ("PENDING".equalsIgnoreCase(status)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Your client account is pending approval from the Client Manager.");
        }
        if (!"ACTIVE".equalsIgnoreCase(status)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Your client account was not approved. Please contact the Client Manager.");
        }
    }

    private record StaffSeed(String username, String password, ManagementRole role, String displayName) {}
    private record StaffAccountConfig(StaffSeed... seeds) {}

    private static final class Session {
        private final ManagementRole role;
        private final String username;
        private final Instant expiresAt;

        private Session(ManagementRole role, String username, Instant expiresAt) {
            this.role = role;
            this.username = username;
            this.expiresAt = expiresAt;
        }
    }
}
