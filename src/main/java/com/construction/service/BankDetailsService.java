package com.construction.service;

import com.construction.model.BankDetails;
import com.construction.repository.BankDetailsRepository;
import org.springframework.stereotype.Service;

@Service
public class BankDetailsService {

    private final BankDetailsRepository bankDetailsRepository;

    public BankDetailsService(BankDetailsRepository bankDetailsRepository) {
        this.bankDetailsRepository = bankDetailsRepository;
    }

    /** Returns the singleton bank details row, or an empty object if none exists yet. */
    public BankDetails getBankDetails() {
        return bankDetailsRepository.findById(1L).orElse(new BankDetails());
    }

    /** Creates or fully replaces the singleton bank details row (id=1). */
    public BankDetails updateBankDetails(BankDetails incoming) {
        incoming.setId(1L); // Always use singleton id
        return bankDetailsRepository.save(incoming);
    }
}
