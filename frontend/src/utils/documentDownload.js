import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Utility helper for document downloads across all Odiliya portals
 */

export function triggerDownload(blobOrUrl, fileName = 'document.txt') {
  if (typeof blobOrUrl === 'string' && (blobOrUrl.startsWith('data:') || blobOrUrl.startsWith('http') || blobOrUrl.startsWith('blob:'))) {
    const link = document.createElement('a');
    link.href = blobOrUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  let blob;
  if (blobOrUrl instanceof Blob) {
    blob = blobOrUrl;
  } else {
    blob = new Blob([String(blobOrUrl || '')], { type: 'text/plain;charset=utf-8' });
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Universal fallback document downloader supporting PDF and TXT
 */
export function downloadFile(fileDataOrUrl, fileName = 'document.pdf', fallbackTitle = 'Document', fallbackDetails = {}) {
  if (fileDataOrUrl && (fileDataOrUrl.startsWith('data:') || fileDataOrUrl.startsWith('http') || fileDataOrUrl.startsWith('blob:'))) {
    triggerDownload(fileDataOrUrl, fileName);
    return;
  }

  if (fileName.toLowerCase().endsWith('.pdf')) {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Top Brand Header Banner
      doc.setFillColor(15, 76, 58); // Primary Emerald
      doc.rect(0, 0, 210, 24, 'F');
      
      doc.setFillColor(217, 119, 6); // Gold Accent Bar
      doc.rect(0, 24, 210, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('ODILIYA HOMES & REAL ESTATE (PVT) LTD', 14, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(209, 250, 229);
      doc.text('OFFICIAL CORPORATE DOCUMENT & CONSTRUCTION RECORDS VAULT', 14, 18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('VERIFIED RECORD', 196, 15, { align: 'right' });

      // Title Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(fallbackTitle.toUpperCase(), 14, 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Ref: ODLY-${Date.now().toString().slice(-6)}`, 14, 42);

      // Metadata Table
      const metaRows = Object.entries(fallbackDetails)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()), String(v)]);

      if (metaRows.length > 0) {
        autoTable(doc, {
          startY: 48,
          head: [['Specification / Field', 'Recorded Value & Details']],
          body: metaRows,
          theme: 'striped',
          headStyles: { fillColor: [15, 76, 58], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60, textColor: [15, 76, 58] },
            1: { cellWidth: 122 },
          },
          margin: { left: 14, right: 14 },
        });
      }

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 70;

      // Authentication Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, finalY, 182, 28, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 76, 58);
      doc.text('AUTHENTICATION & COMPLIANCE VERIFICATION', 18, finalY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('This document has been digitally issued by the Odiliya Construction Management Enterprise Platform.', 18, finalY + 13);
      doc.text('All engineering records, materials, and corporate logs adhere to ISO/SLS construction standards.', 18, finalY + 18);
      doc.text('Corporate Office: No. 120, Negombo Road, Peliyagoda, Sri Lanka | Phone: +94 11 234 5678', 18, finalY + 23);

      // Bottom Footer Bar
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Odiliya Residencies & Homes (Pvt) Ltd — Confidential Construction & Logistics Document', 105, 287, { align: 'center' });

      doc.save(fileName);
      return;
    } catch (err) {
      console.warn('PDF rendering error, falling back to text format:', err);
    }
  }

  // Generate an official Odiliya document summary text file if no binary payload is attached or as fallback
  const lines = [
    '========================================================================',
    '                   ODILIYA RESIDENCIES & HOMES (PVT) LTD                ',
    '                 OFFICIAL CONSTRUCTION DOCUMENT & RECORD                 ',
    '========================================================================',
    '',
    `DOCUMENT TITLE : ${fallbackTitle}`,
    `FILE NAME      : ${fileName}`,
    `GENERATED ON   : ${new Date().toLocaleString()}`,
    `PORTAL ORIGIN  : Odiliya Construction Management Enterprise System`,
    '',
    '------------------------------------------------------------------------',
    '                         DOCUMENT SPECIFICATIONS                        ',
    '------------------------------------------------------------------------',
  ];

  for (const [key, val] of Object.entries(fallbackDetails)) {
    if (val !== undefined && val !== null && val !== '') {
      lines.push(`${key.padEnd(16)}: ${val}`);
    }
  }

  lines.push('');
  lines.push('------------------------------------------------------------------------');
  lines.push('                      AUTHENTICATION & COMPLIANCE                       ');
  lines.push('------------------------------------------------------------------------');
  lines.push('This document is electronically generated and recorded by the Odiliya');
  lines.push('Construction Management System. Verified for site engineering and compliance.');
  lines.push('========================================================================');

  const content = lines.join('\r\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, fileName.endsWith('.txt') ? fileName : `${fileName.replace(/\.[^/.]+$/, '')}.txt`);
}

export function exportCsv(arg1, arg2, arg3) {
  let filename = 'export.csv';
  let headers = [];
  let rows = [];

  if (typeof arg1 === 'string' && Array.isArray(arg2) && Array.isArray(arg3)) {
    filename = arg1;
    headers = arg2;
    rows = arg3;
  } else if (typeof arg1 === 'string' && Array.isArray(arg2)) {
    filename = arg1;
    if (arg2.length > 0 && typeof arg2[0] === 'object' && !Array.isArray(arg2[0])) {
      headers = Object.keys(arg2[0]);
      rows = arg2.map((obj) => headers.map((h) => obj[h]));
    } else {
      rows = arg2;
    }
  } else if (Array.isArray(arg1)) {
    filename = typeof arg2 === 'string' ? arg2 : 'export.csv';
    if (arg1.length > 0 && typeof arg1[0] === 'object' && !Array.isArray(arg1[0])) {
      headers = Object.keys(arg1[0]);
      rows = arg1.map((obj) => headers.map((h) => obj[h]));
    } else {
      rows = arg1;
    }
  }

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvLines = [];
  if (headers && headers.length > 0) {
    csvLines.push(headers.map(escapeCsv).join(','));
  }

  for (const row of rows) {
    if (Array.isArray(row)) {
      csvLines.push(row.map(escapeCsv).join(','));
    } else if (typeof row === 'object' && row !== null) {
      csvLines.push(Object.values(row).map(escapeCsv).join(','));
    } else {
      csvLines.push(escapeCsv(row));
    }
  }

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Export structured data directly to Microsoft Excel (.xlsx) spreadsheet
 */
export function exportExcel(arg1, arg2, arg3, arg4) {
  let filename = 'spreadsheet.xlsx';
  let data = [];
  let sheetName = 'Sheet1';

  if (typeof arg1 === 'string' && Array.isArray(arg2) && Array.isArray(arg3)) {
    // Signature: (filename, headers, rows, [sheetName])
    filename = arg1;
    const headers = arg2;
    const rows = arg3;
    sheetName = typeof arg4 === 'string' ? arg4 : 'Data';
    data = rows.map((row) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = Array.isArray(row) ? (row[idx] !== undefined ? row[idx] : '') : (row[h] !== undefined ? row[h] : '');
      });
      return obj;
    });
  } else if (typeof arg1 === 'string' && Array.isArray(arg2)) {
    // Signature: (filename, dataArray, [sheetName])
    filename = arg1;
    data = arg2;
    sheetName = typeof arg3 === 'string' ? arg3 : 'Data';
  } else if (Array.isArray(arg1)) {
    // Signature: (dataArray, [filename], [sheetName])
    data = arg1;
    filename = typeof arg2 === 'string' ? arg2 : 'spreadsheet.xlsx';
    sheetName = typeof arg3 === 'string' ? arg3 : 'Data';
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-calculate column widths
    if (data.length > 0) {
      const colKeys = Object.keys(data[0] || {});
      worksheet['!cols'] = colKeys.map((key) => {
        let maxLen = String(key).length;
        data.forEach((row) => {
          const valStr = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
          if (valStr.length > maxLen) {
            maxLen = Math.min(valStr.length, 60);
          }
        });
        return { wch: Math.max(maxLen + 4, 12) };
      });
    }

    const workbook = XLSX.utils.book_new();
    const cleanSheetName = (sheetName || 'Data').replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    const finalName = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    triggerDownload(blob, finalName);
  } catch (err) {
    console.error('Excel generation failed, falling back to CSV export:', err);
    exportCsv(filename.replace(/\.xlsx$/i, '.csv'), data);
  }
}

/**
 * Generate and download an official corporate Goods Procurement Purchase Invoice (PDF)
 * for buying goods/materials from suppliers.
 */
export function downloadPurchaseOrderInvoice(po, supplier = null) {
  if (!po) return;

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const poNum = po.poNumber || `PO-${po.id || 'NEW'}`;
    const fileName = `Odiliya_Supplier_Purchase_Invoice_${poNum}.pdf`;
    const supplierName = po.supplier || supplier?.name || 'Verified Construction Supplier';
    const supplierCode = supplier?.supplierCode || 'SUP-RECORD';
    const contactPerson = supplier?.contactPerson || 'Sales & Procurement Desk';
    const phone = supplier?.phone || '+94 11 234 5678';
    const email = supplier?.email || 'sales@supplier.lk';
    const address = supplier?.address || 'Supplier Central Depot, Colombo, Sri Lanka';
    const paymentTerms = supplier?.paymentTerms || 'Net 30 Days (Direct Bank Transfer)';

    const itemName = po.material?.name || 'Construction Grade Material';
    const itemCode = po.material?.materialCode || 'MAT-001';
    const itemCategory = po.material?.category || supplier?.category || 'Building Materials';
    const warehouseLocation = po.material?.location || 'Central Construction Depot (Bay 01)';
    const qty = Number(po.quantity || 0);
    const unit = po.material?.unit || 'units';
    const unitPrice = Number(po.unitPrice || 0);
    const totalAmount = Number(po.totalAmount || (qty * unitPrice));
    
    const orderDate = po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const deliveryDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB') : 'Immediate Site Dispatch';
    const receivedDate = po.receivedDate ? new Date(po.receivedDate).toLocaleDateString('en-GB') : null;
    const isReceived = String(po.status).toUpperCase() === 'RECEIVED';
    const statusText = isReceived ? 'GOODS RECEIVED & VERIFIED' : 'PURCHASE ORDER ISSUED';

    const formattedUnitPrice = unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedTotal = totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ==========================================
    // 1. TOP HEADER BANNER & BRANDING
    // ==========================================
    // Emerald Top Bar
    doc.setFillColor(15, 76, 58); // Deep Emerald
    doc.rect(0, 0, 210, 32, 'F');

    // Amber Accent Line
    doc.setFillColor(217, 119, 6); // Warm Amber
    doc.rect(0, 32, 210, 2, 'F');

    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('ODILIYA HOMES & REAL ESTATE (PVT) LTD', 14, 13);

    // Subtitle & Registration
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(209, 250, 229);
    doc.text('ENGINEERING, PROPERTY DEVELOPMENT & MATERIAL PROCUREMENT DIVISION', 14, 19);
    doc.text('Reg No: PV-128940 | VAT ID: 102938475-7000 | Web: www.odiliyahomes.lk', 14, 25);

    // Right Header - Invoice Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('PURCHASE INVOICE', 196, 14, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(254, 240, 138); // Yellow accent
    doc.text(`PO: ${poNum}`, 196, 21, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(209, 250, 229);
    doc.text(`Issue Date: ${orderDate}`, 196, 27, { align: 'right' });

    // ==========================================
    // 2. METADATA CARDS (BUYER & SUPPLIER)
    // ==========================================
    const cardY = 40;
    const cardHeight = 44;
    const cardWidth = 88;

    // Buyer Card (Left)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFillColor(15, 76, 58);
    doc.rect(14, cardY, cardWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('BUYER / BILLING ENTITY', 18, cardY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Odiliya Residencies & Homes (Pvt) Ltd', 18, cardY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Procurement & Central Logistics Division', 18, cardY + 17);
    doc.text('No. 120, Negombo Road, Peliyagoda, Sri Lanka', 18, cardY + 22);
    doc.text('Phone: +94 11 234 5678 | +94 77 123 4567', 18, cardY + 27);
    doc.text('Email: procurement@odiliyahomes.lk', 18, cardY + 32);
    doc.text(`Delivery Yard: ${warehouseLocation}`, 18, cardY + 37);

    // Supplier Card (Right)
    const supX = 108;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(supX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFillColor(4, 120, 87);
    doc.rect(supX, cardY, cardWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('VENDOR / SUPPLIER DETAILS', supX + 4, cardY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${supplierName}`, supX + 4, cardY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Vendor Code: ${supplierCode} | Contact: ${contactPerson}`, supX + 4, cardY + 17);
    doc.text(`Address: ${address}`, supX + 4, cardY + 22);
    doc.text(`Phone: ${phone}`, supX + 4, cardY + 27);
    doc.text(`Email: ${email}`, supX + 4, cardY + 32);
    doc.text(`Payment Terms: ${paymentTerms}`, supX + 4, cardY + 37);

    // ==========================================
    // 3. ORDER STATUS STRIP
    // ==========================================
    const stripY = 88;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, stripY, 182, 12, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 76, 58);
    doc.text('STATUS:', 18, stripY + 7.5);

    doc.setFont('helvetica', 'bold');
    if (isReceived) {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(180, 83, 9);
    }
    doc.text(statusText, 35, stripY + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 76, 58);
    doc.text('EXPECTED DELIVERY:', 95, stripY + 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(deliveryDate, 130, stripY + 7.5);

    if (receivedDate) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(`(Received: ${receivedDate})`, 160, stripY + 7.5);
    }

    // ==========================================
    // 4. ITEM DETAILS TABLE
    // ==========================================
    const tableData = [
      [
        '1',
        itemCode,
        itemName,
        itemCategory,
        warehouseLocation,
        `LKR ${formattedUnitPrice}`,
        `${qty} ${unit}`,
        `LKR ${formattedTotal}`,
      ],
    ];

    autoTable(doc, {
      startY: 104,
      head: [['#', 'Item Code', 'Material Description', 'Category', 'Target Yard', 'Unit Price', 'Quantity', 'Amount (LKR)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 76, 58],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        2: { halign: 'left', cellWidth: 46, fontStyle: 'bold' },
        3: { halign: 'left', cellWidth: 24 },
        4: { halign: 'left', cellWidth: 28 },
        5: { halign: 'right', cellWidth: 24 },
        6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 26, fontStyle: 'bold', textColor: [15, 76, 58] },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 3.5,
      },
      margin: { left: 14, right: 14 },
    });

    const tableEnd = doc.lastAutoTable ? doc.lastAutoTable.finalY : 130;

    // ==========================================
    // 5. FINANCIAL TOTALS & NOTES SUMMARY
    // ==========================================
    const summaryY = tableEnd + 6;

    // Left Notes Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, summaryY, 105, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 76, 58);
    doc.text('PROCUREMENT INSTRUCTIONS & NOTES', 18, summaryY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const notesText = po.notes ? po.notes : 'All materials must strictly conform to SLS/BS construction specifications. Delivery trucks must present Goods Delivery Note (GDN) matching this PO upon arrival at the central gate.';
    const splitNotes = doc.splitTextToSize(notesText, 97);
    doc.text(splitNotes, 18, summaryY + 12);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Authorized Officer: ${po.createdBy || 'Inventory & Procurement Manager'}`, 18, summaryY + 29);

    // Right Totals Box
    const totalsX = 124;
    const totalsWidth = 72;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(totalsX, summaryY, totalsWidth, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Subtotal (Excl. Taxes):', totalsX + 4, summaryY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`LKR ${formattedTotal}`, totalsX + totalsWidth - 4, summaryY + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('VAT / Tax Assessment:', totalsX + 4, summaryY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Included in Quoted Rate', totalsX + totalsWidth - 4, summaryY + 14, { align: 'right' });

    // Grand Total Emerald Highlight Box
    doc.setFillColor(15, 76, 58);
    doc.roundedRect(totalsX + 2, summaryY + 19, totalsWidth - 4, 12, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('NET PAYABLE TOTAL:', totalsX + 5, summaryY + 26.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(254, 240, 138); // Yellow accent
    doc.text(`LKR ${formattedTotal}`, totalsX + totalsWidth - 6, summaryY + 26.5, { align: 'right' });

    // ==========================================
    // 6. TERMS & CONDITIONS
    // ==========================================
    const termsY = summaryY + 38;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, termsY, 182, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 76, 58);
    doc.text('PURCHASE TERMS & CORPORATE COMPLIANCE AGREEMENT:', 18, termsY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('1. Quality Inspection: Goods are received subject to on-site civil quality assessment and sampling laboratory test approval.', 18, termsY + 9.5);
    doc.text('2. Rejection & Transit: Non-conforming or damaged batches will be rejected at vendor risk; replacement must be completed within 48h.', 18, termsY + 13.5);
    doc.text('3. Invoice Settlement: Payments are released according to agreed payment terms following verified Goods Received Note (GRN) issuance.', 18, termsY + 17.5);
    doc.text('4. Jurisdiction: This commercial order is governed by the commercial laws of the Democratic Socialist Republic of Sri Lanka.', 18, termsY + 21.5);

    // ==========================================
    // 7. SIGNATURES & OFFICIAL SEALS
    // ==========================================
    const signY = termsY + 28;

    // Signatory 1: Prepared By
    doc.setDrawColor(148, 163, 184);
    doc.line(18, signY + 14, 64, signY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Prepared By (Procurement)', 18, signY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(po.createdBy || 'Inventory Manager', 18, signY + 21.5);

    // Signatory 2: Authorized Director
    doc.line(82, signY + 14, 128, signY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Authorized By (Finance / Ops)', 82, signY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Head of Project Logistics', 82, signY + 21.5);

    // Signatory 3: Supplier Stamp
    doc.line(146, signY + 14, 192, signY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Vendor Acknowledgment & Stamp', 146, signY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Official Seal / Signature', 146, signY + 21.5);

    // ==========================================
    // 8. SECURITY WATERMARK & FOOTER
    // ==========================================
    doc.setFillColor(15, 76, 58);
    doc.rect(0, 289, 210, 8, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(209, 250, 229);
    doc.text('ODILIYA HOMES & REAL ESTATE (PVT) LTD — ELECTRONIC PURCHASE INVOICE & AUDIT TRAIL', 14, 294);

    doc.setFont('helvetica', 'bold');
    doc.text('SYSTEM VERIFIED', 196, 294, { align: 'right' });

    // Save and Trigger PDF download
    doc.save(fileName);
  } catch (err) {
    console.error('PDF generation error, executing fallback text download:', err);
    // Fallback if needed
    downloadFile(null, `Odiliya_Supplier_Purchase_Invoice_${po.poNumber || po.id}.txt`, 'Supplier Purchase Order Invoice', {
      poNumber: po.poNumber,
      supplier: po.supplier || supplier?.name,
      material: po.material?.name,
      quantity: `${po.quantity} ${po.material?.unit || 'units'}`,
      totalAmount: `LKR ${po.totalAmount}`,
      status: po.status,
    });
  }
}

/**
 * Helper to safely convert an image URL or data URL to base64 for jsPDF
 */
async function getBase64Image(url) {
  if (!url) return null;
  if (typeof url === 'string' && url.startsWith('data:image/')) {
    return url;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 400;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataURL);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates an executive, professional Project Details & Status Dossier PDF with embedded images,
 * KPI summary metrics, milestone schedule, tasks breakdown, team roster, and financial analysis.
 */
export async function generateProjectDetailsPdf(project, {
  client = null,
  tasks = [],
  milestones = [],
  expenses = [],
  employees = [],
  spent = 0,
  pmName = 'Project Manager',
} = {}) {
  if (!project) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const formattedBudget = Number(project.budget || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedSpent = Number(spent || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const remainingBudget = Number((project.budget || 0) - (spent || 0));
  const formattedRemaining = remainingBudget.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const progress = Number(project.progressPercentage || 0);

  // Helper for rendering header banner on Page 1
  const renderHeader = () => {
    doc.setFillColor(15, 76, 58); // Deep Emerald #0F4C3A
    doc.rect(0, 0, pageWidth, 26, 'F');

    doc.setFillColor(217, 119, 6); // Gold Accent Bar #D97706
    doc.rect(0, 26, pageWidth, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('ODILIYA HOMES & REAL ESTATE (PVT) LTD', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(209, 250, 229);
    doc.text('ENGINEERING OPERATIONS & PROJECT MANAGEMENT DOSSIER', margin, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(254, 240, 138); // Soft Gold
    doc.text('EXECUTIVE PROJECT REPORT', pageWidth - margin, 12, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Ref: ODLY-PRJ-${String(project.id).padStart(4, '0')} | ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, 18, { align: 'right' });
  };

  // Helper for footer on all pages
  const addFooter = (pageNum, totalPages) => {
    doc.setFillColor(15, 76, 58);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(209, 250, 229);
    doc.text('ODILIYA HOMES & REAL ESTATE (PVT) LTD — CONFIDENTIAL PROJECT AUDIT REPORT', margin, pageHeight - 3);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 3, { align: 'right' });
  };

  renderHeader();

  // ==========================================
  // 1. PROJECT IDENTITY & CLIENT CARD
  // ==========================================
  let curY = 34;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 76, 58);
  doc.text(project.name || 'Untitled Construction Project', margin + 4, curY + 7);

  // Status Badge
  const statusStr = String(project.status || 'PLANNING').replace(/_/g, ' ');
  doc.setFillColor(project.status === 'COMPLETED' ? 220 : 254, project.status === 'COMPLETED' ? 252 : 243, project.status === 'COMPLETED' ? 231 : 199);
  doc.roundedRect(margin + contentWidth - 36, curY + 3, 32, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(project.status === 'COMPLETED' ? 22 : 180, project.status === 'COMPLETED' ? 101 : 83, project.status === 'COMPLETED' ? 52 : 9);
  doc.text(statusStr, margin + contentWidth - 20, curY + 7.5, { align: 'center' });

  // Project details subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Category: ${project.category || 'RESIDENCIES'}  |  Location: ${project.location || 'Colombo, Sri Lanka'}  |  Code: PRJ-${project.id}`, margin + 4, curY + 13);

  // Client Info Line
  const clientObj = client || project.client;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Assigned Client: ', margin + 4, curY + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(clientObj ? `${clientObj.name} (${clientObj.email || 'N/A'}${clientObj.phone ? ` • ${clientObj.phone}` : ''})` : 'In-House Development / Direct Corporate Portfolio', margin + 28, curY + 19);

  curY += 30;

  // ==========================================
  // 2. KEY PERFORMANCE INDICATORS (KPIs)
  // ==========================================
  const kpiWidth = (contentWidth - 9) / 4; // 4 boxes
  const kpis = [
    { label: 'TOTAL BUDGET', val: `LKR ${formattedBudget}`, color: [15, 76, 58], bg: [240, 253, 244], border: [187, 247, 208] },
    { label: 'TOTAL EXPENDITURE', val: `LKR ${formattedSpent}`, color: [30, 64, 175], bg: [239, 246, 255], border: [191, 219, 254] },
    { label: 'REMAINING BALANCE', val: `LKR ${formattedRemaining}`, color: remainingBudget >= 0 ? [5, 150, 105] : [220, 38, 38], bg: [255, 255, 255], border: [226, 232, 240] },
    { label: 'PROJECT COMPLETION', val: `${progress}% COMPLETE`, color: [180, 83, 9], bg: [254, 252, 232], border: [254, 240, 138] },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * (kpiWidth + 3);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(...kpi.border);
    doc.roundedRect(kx, curY, kpiWidth, 18, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + 3, curY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, kx + 3, curY + 12.5);
  });

  curY += 22;

  // ==========================================
  // 3. PROJECT IMAGE & ARCHITECTURAL VISUAL
  // ==========================================
  let imageBase64 = null;
  if (project.imageUrl) {
    try {
      imageBase64 = await getBase64Image(project.imageUrl);
    } catch {
      imageBase64 = null;
    }
  }

  if (imageBase64) {
    const imgBoxWidth = 88;
    const imgBoxHeight = 54;
    const imgX = margin;
    const imgY = curY;

    // Image frame
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(imgX, imgY, imgBoxWidth, imgBoxHeight, 2, 2, 'FD');

    try {
      doc.addImage(imageBase64, 'JPEG', imgX + 1.5, imgY + 1.5, imgBoxWidth - 3, imgBoxHeight - 8);
      // Caption
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Figure 1.0: Site Photo / Architectural Model for ${project.name}`, imgX + 3, imgY + imgBoxHeight - 2.5);
    } catch (e) {
      console.warn('Could not render image to PDF:', e);
    }

    // Right Side: Scope & Specifications Box
    const descX = margin + imgBoxWidth + 4;
    const descWidth = contentWidth - imgBoxWidth - 4;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(descX, imgY, descWidth, imgBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 76, 58);
    doc.text('PROJECT SCOPE & SPECIFICATIONS', descX + 4, imgY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    const descText = project.description || 'Turnkey architectural design, structural engineering, foundation piling, civil works, and high-spec interior finishes executed by Odiliya Homes.';
    const splitDesc = doc.splitTextToSize(descText, descWidth - 8);
    doc.text(splitDesc.slice(0, 5), descX + 4, imgY + 12);

    // Architectural Specs
    let specY = imgY + 28;
    if (project.specifications) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text('Structural Specifications:', descX + 4, specY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const splitSpecs = doc.splitTextToSize(project.specifications, descWidth - 8);
      doc.text(splitSpecs.slice(0, 3), descX + 4, specY + 4.5);
      specY += 13;
    }

    // Timeline & Construction Stage
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Timeline & Stage:', descX + 4, specY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Start: ${project.startDate || 'N/A'}  |  Target End: ${project.endDate || 'Ongoing'}  |  Stage: ${project.constructionStatus || 'Active Civil Works'}`, descX + 4, specY + 4.5);

    curY += imgBoxHeight + 6;
  } else {
    // No image: Render Full-Width Specifications Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 76, 58);
    doc.text('PROJECT SCOPE & ARCHITECTURAL OVERVIEW', margin + 4, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const descText = project.description || 'Full turnkey residential and commercial development, structural design, civil contracting, and certified architectural construction managed under Odiliya standard QA/QC protocols.';
    const splitDesc = doc.splitTextToSize(descText, contentWidth - 8);
    doc.text(splitDesc.slice(0, 3), margin + 4, curY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Start: ${project.startDate || 'N/A'}  |  Target End: ${project.endDate || 'Ongoing'}  |  Stage: ${project.constructionStatus || 'Active'}  |  Price Guide: ${project.priceRange || 'Standard Commercial'}`, margin + 4, curY + 22);

    curY += 30;
  }

  // ==========================================
  // 4. MILESTONES PROGRESSION TABLE
  // ==========================================
  const milestoneRows = milestones.map((m, idx) => [
    String(idx + 1),
    m.title || 'Milestone Phase',
    m.targetDate || '—',
    m.status || 'PENDING',
    `${m.progressPercentage || 0}%`,
    m.description || '—',
  ]);

  if (milestoneRows.length === 0) {
    milestoneRows.push(['1', 'Foundation & Site Earthworks', project.startDate || 'Phase 1', progress > 20 ? 'COMPLETED' : 'IN_PROGRESS', `${Math.min(100, progress * 2)}%`, 'Piling, excavation and foundation structural slab']);
    milestoneRows.push(['2', 'Superstructure & RCC Framing', 'Phase 2', progress > 50 ? 'COMPLETED' : (progress > 20 ? 'IN_PROGRESS' : 'PENDING'), `${Math.max(0, Math.min(100, (progress - 25) * 2))}%`, 'Reinforced concrete columns, beams and slab levels']);
    milestoneRows.push(['3', 'MEP, Masonry & Plastering', 'Phase 3', progress > 80 ? 'COMPLETED' : (progress > 50 ? 'IN_PROGRESS' : 'PENDING'), `${Math.max(0, Math.min(100, (progress - 50) * 2))}%`, 'Conduit wiring, plumbing runs, brickwork and wall plaster']);
    milestoneRows.push(['4', 'Finishes, Handover & Commissioning', project.endDate || 'Phase 4', progress === 100 ? 'COMPLETED' : (progress > 80 ? 'IN_PROGRESS' : 'PENDING'), `${Math.max(0, Math.min(100, (progress - 80) * 5))}%`, 'Flooring tiles, painting, fittings, landscaping and keys handover']);
  }

  autoTable(doc, {
    startY: curY,
    head: [['#', 'Construction Milestone', 'Target Date', 'Status', 'Progress', 'Scope / Engineering Notes']],
    body: milestoneRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 76, 58],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', cellWidth: 46 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 18, fontStyle: 'bold', textColor: [15, 76, 58] },
      5: { cellWidth: 62 },
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    margin: { left: margin, right: margin },
  });

  curY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : curY + 30;

  // ==========================================
  // 5. TASK SCHEDULE & ENGINEERING EXECUTION
  // ==========================================
  const taskRows = tasks.map((t, idx) => [
    String(idx + 1),
    t.taskName || 'Engineering Task',
    t.assignedEmployee?.name || 'Site Crew',
    t.deadline || '—',
    t.status || 'PENDING',
    `${t.progressPercentage || 0}%`,
    t.progressRemarks || t.description || '—',
  ]);

  if (taskRows.length > 0) {
    if (curY > pageHeight - 60) {
      doc.addPage();
      renderHeader();
      curY = 34;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 76, 58);
    doc.text('PROJECT TASKS & ENGINEERING SCHEDULE', margin, curY);
    curY += 3;

    autoTable(doc, {
      startY: curY,
      head: [['#', 'Task Name', 'Assigned Engineer / Worker', 'Deadline', 'Status', 'Progress', 'Remarks']],
      body: taskRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 64, 175], // Blue Header
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 42 },
        2: { cellWidth: 32 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 16, fontStyle: 'bold', textColor: [30, 64, 175] },
        6: { cellWidth: 40 },
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 2.5,
      },
      margin: { left: margin, right: margin },
    });

    curY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : curY + 30;
  }

  // ==========================================
  // 6. ASSIGNED SITE PERSONNEL & TEAM
  // ==========================================
  const teamRows = employees.map((emp, idx) => [
    String(idx + 1),
    emp.name || 'Team Member',
    emp.role || 'Site Engineer / Trade Worker',
    emp.email || 'N/A',
    emp.phone || 'N/A',
  ]);

  if (teamRows.length > 0) {
    if (curY > pageHeight - 50) {
      doc.addPage();
      renderHeader();
      curY = 34;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 76, 58);
    doc.text('ALLOCATED SITE PERSONNEL & TECHNICAL TEAM', margin, curY);
    curY += 3;

    autoTable(doc, {
      startY: curY,
      head: [['#', 'Personnel Name', 'Trade / Role Designation', 'Email Address', 'Contact Phone']],
      body: teamRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105], // Slate Header
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 48 },
        2: { cellWidth: 46 },
        3: { cellWidth: 46 },
        4: { cellWidth: 34 },
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 2.5,
      },
      margin: { left: margin, right: margin },
    });

    curY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : curY + 30;
  }

  // ==========================================
  // 7. FINANCIAL EXPENDITURE & BUDGET AUDIT
  // ==========================================
  const expenseRows = expenses.map((exp, idx) => [
    String(idx + 1),
    exp.description || 'Project Expense Item',
    exp.date || '—',
    `LKR ${Number(exp.amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
  ]);

  if (expenseRows.length > 0) {
    if (curY > pageHeight - 55) {
      doc.addPage();
      renderHeader();
      curY = 34;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 76, 58);
    doc.text('ITEMIZED EXPENDITURE & COST LOG', margin, curY);
    curY += 3;

    autoTable(doc, {
      startY: curY,
      head: [['#', 'Expenditure Description', 'Recorded Date', 'Amount (LKR)']],
      body: expenseRows,
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9], // Gold/Amber Header
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { fontStyle: 'bold', cellWidth: 104 },
        2: { halign: 'center', cellWidth: 32 },
        3: { halign: 'right', cellWidth: 38, fontStyle: 'bold', textColor: [15, 76, 58] },
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 2.5,
      },
      margin: { left: margin, right: margin },
    });

    curY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : curY + 30;
  }

  // ==========================================
  // 8. SIGNATURES & OFFICIAL SEALS
  // ==========================================
  if (curY > pageHeight - 42) {
    doc.addPage();
    renderHeader();
    curY = 34;
  }

  const signY = Math.max(curY + 4, pageHeight - 38);

  // Signatory 1: Project Manager
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 4, signY + 12, margin + 50, signY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Prepared By (Project Manager)', margin + 4, signY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(pmName || 'Certified Project Engineer', margin + 4, signY + 19.5);

  // Signatory 2: Head of Civil Operations
  doc.line(margin + 66, signY + 12, margin + 116, signY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Reviewed By (Chief Engineer)', margin + 66, signY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Head of Technical & QA/QC', margin + 66, signY + 19.5);

  // Signatory 3: Managing Director / Client
  doc.line(margin + 132, signY + 12, margin + 178, signY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('Approved By (Managing Director)', margin + 132, signY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Odiliya Homes Directorate Seal', margin + 132, signY + 19.5);

  // Add Footers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  const safeFileName = `Odiliya_Project_Dossier_${(project.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(safeFileName);
}
