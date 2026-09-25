package com.construction.repository;

import com.construction.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
    boolean existsByEmployeeNumberIgnoreCase(String employeeNumber);
    Optional<Client> findByEmailIgnoreCase(String email);
    Optional<Client> findByEmployeeNumberIgnoreCase(String employeeNumber);

    @Query("SELECT c FROM Client c WHERE " +
            "LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(c.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(c.phone) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(c.companyName, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(c.employeeNumber, '')) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Client> searchClients(@Param("query") String query);

    List<Client> findByStatus(String status);
}
