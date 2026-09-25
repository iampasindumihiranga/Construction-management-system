package com.construction.auth;

public class AuthResponse {
    private String token;
    private String role;
    private String username;
    private String displayName;
    private Long clientId;
    private Long employeeId;

    public AuthResponse() {
    }

    public AuthResponse(String token, String role, String username, String displayName, Long clientId) {
        this.token = token;
        this.role = role;
        this.username = username;
        this.displayName = displayName;
        this.clientId = clientId;
    }

    public AuthResponse(String token, String role, String username, String displayName, Long clientId, Long employeeId) {
        this.token = token;
        this.role = role;
        this.username = username;
        this.displayName = displayName;
        this.clientId = clientId;
        this.employeeId = employeeId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }
    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }
}
