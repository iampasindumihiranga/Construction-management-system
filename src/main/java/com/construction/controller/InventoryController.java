package com.construction.controller;

import com.construction.model.Material;
import com.construction.model.MaterialRequest;
import com.construction.model.MaterialTransaction;
import com.construction.model.PurchaseOrder;
import com.construction.model.StockAlert;
import com.construction.service.InventoryService;
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
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    // Step 1: Register Construction Materials
    @PostMapping("/materials")
    public ResponseEntity<Material> createMaterial(@Valid @RequestBody Material material) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.createMaterial(material));
    }

    @GetMapping("/materials/next-code")
    public ResponseEntity<String> nextMaterialCode() {
        return ResponseEntity.ok(inventoryService.previewNextMaterialCode());
    }

    // Step 2 & 4: Categorize, Search & Monitor Stock
    @GetMapping("/materials")
    public ResponseEntity<List<Material>> getMaterials(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(inventoryService.getAllMaterials(search, category, status));
    }

    @GetMapping("/materials/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(inventoryService.getCategories());
    }

    @GetMapping("/materials/low-stock")
    public ResponseEntity<List<Material>> getLowStockMaterials() {
        return ResponseEntity.ok(inventoryService.getLowStockMaterials());
    }

    @GetMapping("/materials/{id}")
    public ResponseEntity<Material> getMaterialById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getMaterialById(id));
    }

    // Step 3: Update Material Details
    @PutMapping("/materials/{id}")
    public ResponseEntity<Material> updateMaterial(@PathVariable Long id, @Valid @RequestBody Material material) {
        return ResponseEntity.ok(inventoryService.updateMaterial(id, material));
    }

    @DeleteMapping("/materials/{id}")
    public ResponseEntity<Void> deleteMaterial(@PathVariable Long id) {
        inventoryService.deleteMaterial(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getInventorySummary() {
        return ResponseEntity.ok(inventoryService.getInventorySummary());
    }

    // Step 5: Employee / Project Requests Materials
    @PostMapping("/requests")
    public ResponseEntity<MaterialRequest> createRequest(@Valid @RequestBody MaterialRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.createRequest(request));
    }

    @GetMapping("/requests")
    public ResponseEntity<List<MaterialRequest>> getRequests(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long materialId,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(inventoryService.getAllRequests(projectId, materialId, status));
    }

    // Step 6: Manager Approves / Rejects Request
    @PutMapping("/requests/{id}/approve")
    public ResponseEntity<MaterialRequest> approveRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> payload
    ) {
        String approvedBy = payload != null ? payload.get("approvedBy") : "Inventory Manager";
        String remarks = payload != null ? payload.get("remarks") : null;
        return ResponseEntity.ok(inventoryService.approveRequest(id, approvedBy, remarks));
    }

    @PutMapping("/requests/{id}/reject")
    public ResponseEntity<MaterialRequest> rejectRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> payload
    ) {
        String approvedBy = payload != null ? payload.get("approvedBy") : "Inventory Manager";
        String remarks = payload != null ? payload.get("remarks") : null;
        return ResponseEntity.ok(inventoryService.rejectRequest(id, approvedBy, remarks));
    }

    // Step 7: Record Material Transaction & Stock Issuance
    @PostMapping("/requests/{id}/issue")
    public ResponseEntity<MaterialTransaction> issueMaterial(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        Double quantity = null;
        if (payload != null && payload.get("quantity") != null) {
            quantity = Double.valueOf(payload.get("quantity").toString());
        }
        String performedBy = payload != null && payload.get("performedBy") != null ? payload.get("performedBy").toString() : "Inventory Manager";
        String notes = payload != null && payload.get("notes") != null ? payload.get("notes").toString() : null;

        return ResponseEntity.ok(inventoryService.issueMaterialFromRequest(id, quantity, performedBy, notes));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<MaterialTransaction>> getTransactions(
            @RequestParam(required = false) Long materialId,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String type
    ) {
        return ResponseEntity.ok(inventoryService.getAllTransactions(materialId, projectId, type));
    }

    // Step 8: Track Material Consumption by Project
    @GetMapping("/consumption/project/{projectId}")
    public ResponseEntity<Map<String, Object>> getProjectConsumption(@PathVariable Long projectId) {
        return ResponseEntity.ok(inventoryService.getProjectConsumption(projectId));
    }

    // Step 9: Purchase Orders & Stock Replenishment
    @PostMapping("/purchase-orders")
    public ResponseEntity<PurchaseOrder> createPurchaseOrder(@Valid @RequestBody PurchaseOrder order) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.createPurchaseOrder(order));
    }

    @GetMapping("/purchase-orders")
    public ResponseEntity<List<PurchaseOrder>> getPurchaseOrders(
            @RequestParam(required = false) Long materialId,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(inventoryService.getPurchaseOrders(materialId, status));
    }

    @PutMapping("/purchase-orders/{id}/receive")
    public ResponseEntity<PurchaseOrder> receivePurchaseOrder(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> payload
    ) {
        String receivedBy = payload != null && payload.get("receivedBy") != null ? payload.get("receivedBy") : "Inventory Manager";
        return ResponseEntity.ok(inventoryService.receivePurchaseOrder(id, receivedBy));
    }

    // Stock Alerts (Site Manager notifies Inventory Manager about Low Stock)
    @PostMapping("/stock-alerts")
    public ResponseEntity<StockAlert> createStockAlert(@Valid @RequestBody StockAlert alert) {
        return ResponseEntity.status(HttpStatus.CREATED).body(inventoryService.createStockAlert(alert));
    }

    @GetMapping("/stock-alerts")
    public ResponseEntity<List<StockAlert>> getStockAlerts(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(inventoryService.getAllStockAlerts(status));
    }

    @PutMapping("/stock-alerts/{id}/status")
    public ResponseEntity<StockAlert> updateStockAlertStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> payload
    ) {
        String status = payload != null ? payload.get("status") : "ACKNOWLEDGED";
        return ResponseEntity.ok(inventoryService.updateStockAlertStatus(id, status));
    }
}
