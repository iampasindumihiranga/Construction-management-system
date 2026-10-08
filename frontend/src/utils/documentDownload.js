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

export function downloadFile(fileDataOrUrl, fileName = 'document.pdf', fallbackTitle = 'Document', fallbackDetails = {}) {
  if (fileDataOrUrl && (fileDataOrUrl.startsWith('data:') || fileDataOrUrl.startsWith('http') || fileDataOrUrl.startsWith('blob:'))) {
    triggerDownload(fileDataOrUrl, fileName);
    return;
  }

  // Generate an official Odiliya document summary text file if no binary payload is attached
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

export function exportCsv(filename, headers, rows) {
  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvLines = [];
  csvLines.push(headers.map(escapeCsv).join(','));

  for (const row of rows) {
    csvLines.push(row.map(escapeCsv).join(','));
  }

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}
