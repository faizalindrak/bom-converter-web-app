import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const parseBOMFile = async (file) => {
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (fileExtension === '.csv') {
    return parseCSV(file);
  } else if (fileExtension === '.xlsx') {
    return parseXLSX(file);
  } else {
    throw new Error('Unsupported file format. Please use CSV or XLSX.');
  }
};

const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = findHeaderAndProcessData(results.data);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
};

const parseXLSX = async (file) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  
  return findHeaderAndProcessData(jsonData);
};

const findHeaderAndProcessData = (data) => {
  let headerRowIndex = -1;
  
  // Look for header row in first 20 rows
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = Array.isArray(data[i]) ? data[i] : Object.values(data[i]);
    const rowString = row.join(' ');
    
    if (rowString.includes('SKU (SFG/FG)')) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    throw new Error('Could not find header row containing "SKU (SFG/FG)"');
  }
  
  const headers = Array.isArray(data[headerRowIndex]) 
    ? data[headerRowIndex] 
    : Object.keys(data[headerRowIndex]);
  
  const rows = data.slice(headerRowIndex + 1).map(row => {
    if (Array.isArray(row)) {
      return row;
    } else {
      return headers.map(header => row[header] || '');
    }
  });
  
  return { headers, rows };
};