package com.construction.controller;

import com.construction.enums.PropertyCategory;
import com.construction.model.Design;
import com.construction.service.DesignService;
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
@RequestMapping("/api/designs")
public class DesignController {

    private final DesignService designService;

    public DesignController(DesignService designService) {
        this.designService = designService;
    }

    @GetMapping
    public ResponseEntity<List<Design>> findAll(@RequestParam(required = false) PropertyCategory category) {
        return ResponseEntity.ok(designService.findAll(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Design> findById(@PathVariable Long id) {
        return ResponseEntity.ok(designService.findById(id));
    }

    @PostMapping
    public ResponseEntity<Design> create(@Valid @RequestBody Design design) {
        return ResponseEntity.status(HttpStatus.CREATED).body(designService.create(design));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Design> update(@PathVariable Long id, @Valid @RequestBody Design design) {
        return ResponseEntity.ok(designService.update(id, design));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        designService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
