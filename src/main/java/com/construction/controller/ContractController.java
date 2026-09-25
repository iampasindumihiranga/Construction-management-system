package com.construction.controller;

import com.construction.model.Contract;
import com.construction.service.ContractService;
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

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @PostMapping
    public ResponseEntity<Contract> create(@Valid @RequestBody Contract contract) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractService.create(contract));
    }

    @GetMapping
    public ResponseEntity<List<Contract>> findAll(@RequestParam(required = false) Long clientId) {
        if (clientId != null) {
            return ResponseEntity.ok(contractService.findByClientId(clientId));
        }
        return ResponseEntity.ok(contractService.findAll());
    }

    @GetMapping("/expiring")
    public ResponseEntity<List<Contract>> findExpiringSoon(@RequestParam(defaultValue = "60") int days) {
        return ResponseEntity.ok(contractService.findExpiringSoon(days));
    }

    @GetMapping("/expired")
    public ResponseEntity<List<Contract>> findExpired() {
        return ResponseEntity.ok(contractService.findExpired());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Contract> findById(@PathVariable Long id) {
        return ResponseEntity.ok(contractService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Contract> update(@PathVariable Long id, @Valid @RequestBody Contract contract) {
        return ResponseEntity.ok(contractService.update(id, contract));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        contractService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
