package com.construction.service;

import com.construction.exception.BadRequestException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.model.Client;
import com.construction.model.Contract;
import com.construction.repository.ClientRepository;
import com.construction.repository.ContractRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class ContractService {

    private final ContractRepository contractRepository;
    private final ClientRepository clientRepository;

    public ContractService(ContractRepository contractRepository, ClientRepository clientRepository) {
        this.contractRepository = contractRepository;
        this.clientRepository = clientRepository;
    }

    public Contract create(Contract contract) {
        contract.setClient(resolveClient(contract.getClient()));
        if (contract.getStatus() == null) {
            contract.setStatus("ACTIVE");
        }
        validateContractDates(contract);
        return contractRepository.save(contract);
    }

    public List<Contract> findAll() {
        return contractRepository.findAll();
    }

    public List<Contract> findByClientId(Long clientId) {
        return contractRepository.findByClientId(clientId);
    }

    public List<Contract> findExpiringSoon(int days) {
        LocalDate future = LocalDate.now().plusDays(days > 0 ? days : 60);
        return contractRepository.findExpiringOrExpired(future);
    }

    public List<Contract> findExpired() {
        return contractRepository.findExpired(LocalDate.now());
    }

    public Contract findById(Long id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found with id " + id));
    }

    public Contract update(Long id, Contract contract) {
        validateContractDates(contract);
        Contract existing = findById(id);
        existing.setContractNumber(contract.getContractNumber());
        existing.setTitle(contract.getTitle());
        existing.setAmount(contract.getAmount());
        existing.setSignedDate(contract.getSignedDate());
        existing.setEndDate(contract.getEndDate());
        existing.setStatus(contract.getStatus());
        existing.setTerms(contract.getTerms());
        if (contract.getClient() != null && contract.getClient().getId() != null) {
            existing.setClient(resolveClient(contract.getClient()));
        }
        return contractRepository.save(existing);
    }

    private void validateContractDates(Contract contract) {
        if (contract.getSignedDate() == null) {
            throw new BadRequestException("Contract signed date is required");
        }
        if (contract.getEndDate() != null && contract.getEndDate().isBefore(contract.getSignedDate())) {
            throw new BadRequestException("Contract end date cannot be earlier than signed date");
        }
    }

    public void delete(Long id) {
        Contract existing = findById(id);
        contractRepository.delete(existing);
    }

    private Client resolveClient(Client client) {
        if (client == null || client.getId() == null) {
            throw new BadRequestException("Client id is required");
        }
        return clientRepository.findById(client.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Client not found with id " + client.getId()));
    }
}
