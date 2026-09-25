package com.construction.service;

import com.construction.exception.BadRequestException;
import com.construction.exception.ConflictException;
import com.construction.exception.ResourceNotFoundException;
import com.construction.config.MaterialSchemaMigration;
import com.construction.model.Material;
import com.construction.model.MaterialRequest;
import com.construction.model.MaterialTransaction;
import com.construction.model.Project;
import com.construction.model.PurchaseOrder;
import com.construction.repository.MaterialRepository;
import com.construction.repository.MaterialRequestRepository;
import com.construction.repository.MaterialTransactionRepository;
import com.construction.repository.ProjectRepository;
import com.construction.repository.PurchaseOrderRepository;
import com.construction.model.StockAlert;
import com.construction.repository.StockAlertRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class InventoryService {

    private final MaterialRepository materialRepository;
    private final MaterialRequestRepository requestRepository;
    private final MaterialTransactionRepository transactionRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProjectRepository projectRepository;
    private final StockAlertRepository stockAlertRepository;
    private final MaterialSchemaMigration materialSchemaMigration;

    public InventoryService(
            MaterialRepository materialRepository,
            MaterialRequestRepository requestRepository,
            MaterialTransactionRepository transactionRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            ProjectRepository projectRepository,
            StockAlertRepository stockAlertRepository,
            MaterialSchemaMigration materialSchemaMigration
    ) {
        this.materialRepository = materialRepository;
        this.requestRepository = requestRepository;
        this.transactionRepository = transactionRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.projectRepository = projectRepository;
        this.stockAlertRepository = stockAlertRepository;
        this.materialSchemaMigration = materialSchemaMigration;
    }

    @PostConstruct
    public void seedInitialInventoryData() {
        if (materialRepository.count() == 0) {
            // Step 1 & 2: Register & Categorize Materials
            // Building Materials
            Material cement = new Material("MAT001", "Portland General Cement", "Building Materials", 500.0, "bags", new BigDecimal("8.50"), "Tokyo Cement Lanka", 100.0);
            cement.setLocation("Main Warehouse - Bay A1");
            cement.setDescription("Standard 50kg hydraulic cement bags for structural concrete & masonry.");

            Material bricks = new Material("MAT002", "Wire-Cut Red Bricks", "Building Materials", 15000.0, "units", new BigDecimal("0.35"), "Kelani Brick Works", 2000.0);
            bricks.setLocation("Open Yard - Section B");
            bricks.setDescription("High-strength clay red engineering bricks.");

            Material sand = new Material("MAT003", "Fine River Sand", "Building Materials", 120.0, "cubes", new BigDecimal("45.00"), "Mahaweli Sand Suppliers", 20.0);
            sand.setLocation("Open Yard - Sand Pit");
            sand.setDescription("Washed and screened river sand for plastering and concrete mixtures.");

            Material steel = new Material("MAT004", "12mm Deformed High-Yield Steel Rebars", "Building Materials", 8.5, "tons", new BigDecimal("950.00"), "Lanwa Sanstha Steel", 2.0);
            steel.setLocation("Steel Yard - Rack 3");
            steel.setDescription("BS 4449 Grade 500B high tensile steel reinforcement.");

            // Electrical Materials
            Material cables = new Material("MAT005", "2.5mm Twin & Earth Copper Cable", "Electrical Materials", 1200.0, "meters", new BigDecimal("1.80"), "Kelani Cables PLC", 300.0);
            cables.setLocation("Electrical Store - Shelf E2");
            cables.setDescription("Pure electrolytic copper insulated building wire.");

            Material switches = new Material("MAT006", "13A Modular Wall Socket & Switch", "Electrical Materials", 350.0, "units", new BigDecimal("3.20"), "Orange Electric", 50.0);
            switches.setLocation("Electrical Store - Bin 14");
            switches.setDescription("White polycarbonate flush-mounted electrical accessories.");

            // Finishing & Paint
            Material paint = new Material("MAT007", "Weather-Shield Exterior Acrylic Paint", "Finishing & Paint", 70.0, "liters", new BigDecimal("14.50"), "Dulux Paints", 100.0);
            paint.setLocation("Chemicals Store - Bay C");
            paint.setDescription("Weather resistant exterior emulsion (Currently Low Stock for monitoring).");

            Material tiles = new Material("MAT008", "Porcelain Glazed Floor Tiles (60x60cm)", "Finishing & Paint", 450.0, "sq.ft", new BigDecimal("4.20"), "Rocell Ceramics", 100.0);
            tiles.setLocation("Warehouse - Bay D");
            tiles.setDescription("Grade 1 vitrified matte porcelain floor tiles.");

            materialRepository.saveAll(List.of(cement, bricks, sand, steel, cables, switches, paint, tiles));

            // Requests, issues, and purchase orders are created from the dashboard.
            // Keeping demo data to the material catalog avoids coupling startup to
            // legacy request-table columns from earlier database versions.
        }
    }

    // Material Operations (Steps 1, 2, 3, 4)
    public Material createMaterial(Material material) {
        if (material.getMaterialCode() == null || material.getMaterialCode().isBlank()) {
            material.setMaterialCode(generateMaterialCode());
        } else if (materialRepository.existsByMaterialCodeIgnoreCase(material.getMaterialCode())) {
            throw new ConflictException("Material code '" + material.getMaterialCode() + "' already exists");
        }
        material.updateCalculatedStatus();
        return materialRepository.save(material);
    }

    public Material updateMaterial(Long id, Material update) {
        Material existing = getMaterialById(id);
        if (update.getMaterialCode() != null && !update.getMaterialCode().isBlank()
                && materialRepository.existsByMaterialCodeIgnoreCaseAndIdNot(update.getMaterialCode(), id)) {
            throw new ConflictException("Material code '" + update.getMaterialCode() + "' already exists");
        }

        existing.setName(update.getName());
        existing.setCategory(update.getCategory());
        existing.setQuantity(update.getQuantity());
        existing.setUnit(update.getUnit());
        existing.setUnitPrice(update.getUnitPrice());
        existing.setSupplier(update.getSupplier());
        existing.setMinStockLevel(update.getMinStockLevel());
        existing.setLocation(update.getLocation());
        existing.setDescription(update.getDescription());
        if (update.getMaterialCode() != null && !update.getMaterialCode().isBlank()) {
            existing.setMaterialCode(update.getMaterialCode());
        }
        existing.updateCalculatedStatus();
        return materialRepository.save(existing);
    }

    public Material getMaterialById(Long id) {
        return materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found with id " + id));
    }

    public List<Material> getAllMaterials(String query, String category, String status) {
        String q = (query != null && !query.isBlank()) ? query.trim() : null;
        String c = (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) ? category.trim() : null;
        String s = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim() : null;

        List<Material> list = materialRepository.searchMaterials(q, c, s);
        // ensure calculated status is updated in response
        list.forEach(Material::updateCalculatedStatus);
        return list;
    }

    public List<Material> getLowStockMaterials() {
        return materialRepository.findLowStockMaterials();
    }

    public List<String> getCategories() {
        return materialRepository.findDistinctCategories();
    }

    public void deleteMaterial(Long id) {
        Material existing = getMaterialById(id);
        materialRepository.delete(existing);
    }

    public String previewNextMaterialCode() {
        return generateMaterialCode();
    }

    private String generateMaterialCode() {
        long next = 1;
        for (Material m : materialRepository.findAll()) {
            String current = m.getMaterialCode();
            if (current == null || !current.toUpperCase().startsWith("MAT")) continue;
            try {
                String num = current.substring(3).replaceAll("\\D", "");
                if (!num.isBlank()) {
                    next = Math.max(next, Long.parseLong(num) + 1);
                }
            } catch (NumberFormatException ignored) {
            }
        }
        String code;
        do {
            code = String.format("MAT%03d", next++);
        } while (materialRepository.existsByMaterialCodeIgnoreCase(code));
        return code;
    }

    // Material Request & Approval Operations (Steps 5 & 6)
    public MaterialRequest createRequest(MaterialRequest request) {
        if (request.getProject() == null || request.getProject().getId() == null) {
            throw new BadRequestException("Project is required for requesting materials");
        }
        if (request.getMaterial() == null || request.getMaterial().getId() == null) {
            throw new BadRequestException("Material is required for request");
        }

        Project project = projectRepository.findById(request.getProject().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id " + request.getProject().getId()));
        Material material = getMaterialById(request.getMaterial().getId());

        request.setProject(project);
        request.setMaterial(material);
        if (request.getRequestCode() == null || request.getRequestCode().isBlank()) {
            request.setRequestCode(generateRequestCode());
        }
        request.setStatus("PENDING");
        request.setRequestDate(LocalDate.now());

        return requestRepository.save(request);
    }

    public MaterialRequest approveRequest(Long id, String approvedBy, String remarks) {
        MaterialRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material request not found with id " + id));

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new BadRequestException("Only PENDING requests can be approved");
        }

        request.setStatus("APPROVED");
        request.setApprovedBy(approvedBy != null ? approvedBy : "Inventory Manager");
        request.setApprovalDate(LocalDate.now());
        if (remarks != null && !remarks.isBlank()) {
            request.setRemarks(request.getRemarks() != null ? request.getRemarks() + " | " + remarks : remarks);
        }

        return requestRepository.save(request);
    }

    public MaterialRequest rejectRequest(Long id, String approvedBy, String remarks) {
        MaterialRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material request not found with id " + id));

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new BadRequestException("Only PENDING requests can be rejected");
        }

        request.setStatus("REJECTED");
        request.setApprovedBy(approvedBy != null ? approvedBy : "Inventory Manager");
        request.setApprovalDate(LocalDate.now());
        request.setRemarks(remarks != null ? remarks : "Request rejected by manager");

        return requestRepository.save(request);
    }

    // Step 7: Record Material Transaction & Stock Issuance
    public MaterialTransaction issueMaterialFromRequest(Long requestId, Double quantityToIssue, String performedBy, String notes) {
        MaterialRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Material request not found with id " + requestId));

        if ("REJECTED".equalsIgnoreCase(request.getStatus())) {
            throw new BadRequestException("Cannot issue materials for a REJECTED request");
        }

        Material material = request.getMaterial();
        double issueQty = (quantityToIssue != null && quantityToIssue > 0) ? quantityToIssue : request.getRequestedQuantity();

        if (material.getQuantity() < issueQty) {
            throw new BadRequestException("Insufficient stock! Available: " + material.getQuantity() + " " + material.getUnit() + ", Requested: " + issueQty + " " + material.getUnit());
        }

        Double previousStock = material.getQuantity();
        Double newStock = previousStock - issueQty;

        // Update Material Stock
        material.setQuantity(newStock);
        materialRepository.save(material);

        // Update Request Status
        request.setStatus("ISSUED");
        request.setIssuedQuantity(issueQty);
        requestRepository.save(request);

        // Record Transaction
        String txnCode = generateTransactionCode();
        MaterialTransaction txn = new MaterialTransaction(
                txnCode,
                "ISSUE",
                material,
                request.getProject(),
                issueQty,
                previousStock,
                newStock,
                material.getUnitPrice(),
                request.getRequestCode(),
                notes != null ? notes : "Issued materials for " + request.getProject().getName(),
                performedBy != null ? performedBy : "Inventory Manager"
        );

        return transactionRepository.save(txn);
    }

    public List<MaterialRequest> getAllRequests(Long projectId, Long materialId, String status) {
        String s = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim() : null;
        return requestRepository.filterRequests(projectId, materialId, s);
    }

    public List<MaterialTransaction> getAllTransactions(Long materialId, Long projectId, String type) {
        String t = (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) ? type.trim() : null;
        return transactionRepository.filterTransactions(materialId, projectId, t);
    }

    // Step 8: Track Material Consumption by Project
    public Map<String, Object> getProjectConsumption(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id " + projectId));

        List<MaterialTransaction> issues = transactionRepository.findProjectConsumption(projectId);

        // Group consumption by material
        Map<Long, Map<String, Object>> byMaterial = new HashMap<>();
        BigDecimal totalProjectMaterialCost = BigDecimal.ZERO;

        for (MaterialTransaction txn : issues) {
            Long matId = txn.getMaterial().getId();
            Map<String, Object> item = byMaterial.computeIfAbsent(matId, k -> {
                Map<String, Object> map = new HashMap<>();
                map.put("materialId", txn.getMaterial().getId());
                map.put("materialCode", txn.getMaterial().getMaterialCode());
                map.put("materialName", txn.getMaterial().getName());
                map.put("category", txn.getMaterial().getCategory());
                map.put("unit", txn.getMaterial().getUnit());
                map.put("totalQuantityUsed", 0.0);
                map.put("totalCost", BigDecimal.ZERO);
                return map;
            });

            Double currentQty = (Double) item.get("totalQuantityUsed");
            item.put("totalQuantityUsed", currentQty + txn.getQuantity());

            BigDecimal currentCost = (BigDecimal) item.get("totalCost");
            BigDecimal addedCost = txn.getTotalCost() != null ? txn.getTotalCost() : BigDecimal.ZERO;
            item.put("totalCost", currentCost.add(addedCost));

            totalProjectMaterialCost = totalProjectMaterialCost.add(addedCost);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("projectId", project.getId());
        result.put("projectName", project.getName());
        result.put("projectStatus", project.getStatus());
        result.put("totalMaterialCost", totalProjectMaterialCost);
        result.put("materialsConsumed", new ArrayList<>(byMaterial.values()));
        result.put("transactionHistory", issues);

        return result;
    }

    // Step 9: Purchase Orders & Stock Replenishment
    public PurchaseOrder createPurchaseOrder(PurchaseOrder order) {
        if (order.getMaterial() == null || order.getMaterial().getId() == null) {
            throw new BadRequestException("Material is required for creating a Purchase Order");
        }
        Material material = getMaterialById(order.getMaterial().getId());
        order.setMaterial(material);

        if (order.getPoNumber() == null || order.getPoNumber().isBlank()) {
            order.setPoNumber(generatePoNumber());
        } else if (purchaseOrderRepository.existsByPoNumberIgnoreCase(order.getPoNumber())) {
            throw new ConflictException("Purchase Order Number '" + order.getPoNumber() + "' already exists");
        }

        if (order.getSupplier() == null || order.getSupplier().isBlank()) {
            order.setSupplier(material.getSupplier() != null ? material.getSupplier() : "Main Supplier");
        }
        if (order.getUnitPrice() == null) {
            order.setUnitPrice(material.getUnitPrice());
        }
        order.setTotalAmount(order.getUnitPrice().multiply(BigDecimal.valueOf(order.getQuantity())));
        order.setStatus("ORDERED");
        order.setOrderDate(LocalDate.now());

        return purchaseOrderRepository.save(order);
    }

    public PurchaseOrder receivePurchaseOrder(Long poId, String receivedBy) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found with id " + poId));

        if ("RECEIVED".equalsIgnoreCase(po.getStatus())) {
            throw new BadRequestException("This purchase order has already been received.");
        }

        Material material = po.getMaterial();
        Double previousStock = material.getQuantity();
        Double receivedQty = po.getQuantity();
        Double newStock = previousStock + receivedQty;

        // Automatically update inventory stock
        material.setQuantity(newStock);
        materialRepository.save(material);

        // Update PO status
        po.setStatus("RECEIVED");
        po.setReceivedDate(LocalDate.now());
        po.setReceivedBy(receivedBy != null ? receivedBy : "Inventory Manager");
        purchaseOrderRepository.save(po);

        // Record RECEIPT Transaction
        MaterialTransaction txn = new MaterialTransaction(
                generateTransactionCode(),
                "RECEIPT",
                material,
                null,
                receivedQty,
                previousStock,
                newStock,
                po.getUnitPrice(),
                po.getPoNumber(),
                "Goods received from " + po.getSupplier() + " against " + po.getPoNumber(),
                receivedBy != null ? receivedBy : "Inventory Manager"
        );
        transactionRepository.save(txn);

        return po;
    }

    public List<PurchaseOrder> getPurchaseOrders(Long materialId, String status) {
        String s = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim() : null;
        return purchaseOrderRepository.filterOrders(materialId, s);
    }

    // Dashboard Overview Metrics
    public Map<String, Object> getInventorySummary() {
        Map<String, Object> summary = new HashMap<>();
        List<Material> all = materialRepository.findAll();

        long totalItems = all.size();
        long lowStockCount = all.stream().filter(m -> m.getQuantity() > 0 && m.getQuantity() <= m.getMinStockLevel()).count();
        long outOfStockCount = all.stream().filter(m -> m.getQuantity() <= 0).count();

        BigDecimal totalStockValue = all.stream()
                .map(m -> m.getUnitPrice().multiply(BigDecimal.valueOf(m.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingRequests = requestRepository.countByStatusIgnoreCase("PENDING");
        long activePurchaseOrders = purchaseOrderRepository.findByStatusOrderByOrderDateDesc("ORDERED").size();
        long pendingStockAlerts = stockAlertRepository.findByStatusOrderByCreatedAtDesc("PENDING").size();

        Map<String, Long> categoryCounts = all.stream()
                .collect(Collectors.groupingBy(Material::getCategory, Collectors.counting()));

        summary.put("totalItems", totalItems);
        summary.put("lowStockCount", lowStockCount);
        summary.put("outOfStockCount", outOfStockCount);
        summary.put("totalStockValue", totalStockValue);
        summary.put("pendingRequestsCount", pendingRequests);
        summary.put("activePurchaseOrdersCount", activePurchaseOrders);
        summary.put("pendingStockAlertsCount", pendingStockAlerts);
        summary.put("categoryCounts", categoryCounts);

        return summary;
    }

    // Site Manager: Create Stock Alert / Low Stock Report
    public StockAlert createStockAlert(StockAlert alert) {
        if (alert.getMaterial() == null || alert.getMaterial().getId() == null) {
            throw new BadRequestException("Material is required for stock alert.");
        }
        Material material = getMaterialById(alert.getMaterial().getId());
        alert.setMaterial(material);
        if (alert.getStatus() == null || alert.getStatus().isBlank()) {
            alert.setStatus("PENDING");
        }
        if (alert.getCreatedAt() == null) {
            alert.setCreatedAt(LocalDateTime.now());
        }
        return stockAlertRepository.save(alert);
    }

    public List<StockAlert> getAllStockAlerts(String status) {
        if (status != null && !status.isBlank()) {
            return stockAlertRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return stockAlertRepository.findAllByOrderByCreatedAtDesc();
    }

    public StockAlert updateStockAlertStatus(Long id, String status) {
        StockAlert alert = stockAlertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stock alert not found with id " + id));
        alert.setStatus(status != null ? status.toUpperCase() : "ACKNOWLEDGED");
        return stockAlertRepository.save(alert);
    }

    private String generateRequestCode() {
        long count = requestRepository.count() + 1;
        String code;
        do {
            code = String.format("REQ%03d", count++);
        } while (requestRepository.existsByRequestCodeIgnoreCase(code));
        return code;
    }

    private String generateTransactionCode() {
        long count = transactionRepository.count() + 1;
        return String.format("TXN%04d", count);
    }

    private String generatePoNumber() {
        long count = purchaseOrderRepository.count() + 1;
        String num;
        do {
            num = String.format("PO%03d", count++);
        } while (purchaseOrderRepository.existsByPoNumberIgnoreCase(num));
        return num;
    }
}
