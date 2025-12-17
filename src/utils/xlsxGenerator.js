import * as XLSX from 'xlsx';

export const generateXLSX = (bomData) => {
  const { headers, rows } = bomData;
  
  // Sanitize data for XML compatibility
  const sanitizeForXML = (value) => {
    if (typeof value === 'string') {
      // eslint-disable-next-line no-control-regex
      return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
    }
    return value;
  };
  
  // Create worksheet data with headers
  const worksheetData = [
    headers.map(sanitizeForXML),
    ...rows.map(row => row.map(sanitizeForXML))
  ];
  
  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  
  // Auto-size columns based on content
  const colWidths = headers.map((header, index) => {
    const maxLength = Math.max(
      header?.toString().length || 0,
      ...rows.map(row => row[index]?.toString().length || 0)
    );
    return { wch: Math.min(maxLength + 2, 50) }; // Max width 50
  });
  
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Multi-Level BOM');
  
  // Generate Excel file as blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
};

export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};