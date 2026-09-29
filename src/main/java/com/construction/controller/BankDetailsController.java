package com.construction.controller;

import com.construction.model.BankDetails;
import com.construction.service.BankDetailsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bank-details")
public class BankDetailsController {

    private final BankDetailsService bankDetailsService;

    public BankDetailsController(BankDetailsService bankDetailsService) {
        this.bankDetailsService = bankDetailsService;
    }

    /** GET /api/bank-details — returns the company's bank account details */
    @GetMapping
    public ResponseEntity<BankDetails> getBankDetails() {
        return ResponseEntity.ok(bankDetailsService.getBankDetails());
    }

    /** PUT /api/bank-details — Client Manager updates the bank account details */
    @PutMapping
    public ResponseEntity<BankDetails> updateBankDetails(@RequestBody BankDetails bankDetails) {
        return ResponseEntity.ok(bankDetailsService.updateBankDetails(bankDetails));
    }
}
