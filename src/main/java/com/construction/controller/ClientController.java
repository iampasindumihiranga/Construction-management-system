package com.construction.controller;

import com.construction.auth.ClientRegistrationRequest;
import com.construction.model.Client;
import com.construction.service.ClientService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @PostMapping
    public ResponseEntity<Client> create(@Valid @RequestBody Client client) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.create(client));
    }

    @PostMapping("/register")
    public ResponseEntity<Client> register(@Valid @RequestBody ClientRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.register(request));
    }

    @GetMapping("/next-employee-number")
    public ResponseEntity<String> nextEmployeeNumber() {
        return ResponseEntity.ok(clientService.previewEmployeeNumber());
    }

    @GetMapping
    public ResponseEntity<List<Client>> findAll(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(clientService.search(search));
        }
        return ResponseEntity.ok(clientService.findAll());
    }

    @GetMapping("/dashboard-summary")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        return ResponseEntity.ok(clientService.getDashboardSummary());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> findById(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Client> update(@PathVariable Long id, @Valid @RequestBody Client client) {
        return ResponseEntity.ok(clientService.update(id, client));
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<Client> updatePermittedProfile(@PathVariable Long id, @RequestBody Client client) {
        return ResponseEntity.ok(clientService.updatePermittedProfile(id, client));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        clientService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
