import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Common patterns for key column detection (parent SKU / product identifier)
const PARENT_SKU_PATTERNS = [
  /^sku$/i,
  /^sku\s*\(sfg\/fg\)$/i,
  /^product\s*sku$/i,
  /^parent\s*sku$/i,
  /^parent\s*item$/i,
  /^parent\s*code$/i,
  /^parent$/i,
  /^item\s*code$/i,
  /^item\s*number$/i,
  /^item\s*no\.?$/i,
  /^part\s*number$/i,
  /^part\s*no\.?$/i,
  /^product\s*code$/i,
  /^product\s*number$/i,
  /^product\s*id$/i,
  /^material\s*code$/i,
  /^material\s*number$/i,
  /^material$/i,
  /^fg\s*code$/i,
  /^sfg\s*code$/i,
  /^finished\s*goods$/i,
  /^semi[\-\s]?finished\s*goods$/i,
  /^assembly$/i,
  /^assembly\s*code$/i,
  /^bom\s*parent$/i,
];

// Patterns for child/component column detection
const CHILD_SKU_PATTERNS = [
  /^child\s*sku$/i,
  /^child\s*item$/i,
  /^child\s*code$/i,
  /^child$/i,
  /^component\s*sku$/i,
  /^component$/i,
  /^component\s*code$/i,
  /^component\s*number$/i,
  /^component\s*id$/i,
  /^raw\s*material$/i,
  /^rm\s*code$/i,
  /^rm\s*sku$/i,
  /^sub[\-\s]?component$/i,
  /^material\s*child$/i,
  /^item\s*child$/i,
  /^bom\s*component$/i,
  /^bom\s*item$/i,
];

// Patterns for quantity column detection
const QUANTITY_PATTERNS = [
  /^qty$/i,
  /^quantity$/i,
  /^qty\s*per$/i,
  /^qty\s*per\s*unit$/i,
  /^qty\s*per\s*parent$/i,
  /^qty\s*required$/i,
  /^quantity\s*per$/i,
  /^quantity\s*required$/i,
  /^bom\s*qty$/i,
  /^bom\s*quantity$/i,
  /^usage$/i,
  /^usage\s*qty$/i,
  /^usage\s*quantity$/i,
  /^unit\s*qty$/i,
  /^amount$/i,
  /^count$/i,
  /^pieces$/i,
  /^pcs$/i,
];

/**
 * Detect column from headers using pattern matching
 * @param {string[]} headers - Array of header strings
 * @param {RegExp[]} patterns - Array of patterns to match
 * @param {number[]} excludeIndices - Indices to exclude from search
 * @returns {{ columnIndex: number, columnName: string } | null}
 */
const detectColumn = (headers, patterns, excludeIndices = []) => {
  for (let i = 0; i < headers.length; i++) {
    if (excludeIndices.includes(i)) continue;
    const header = (headers[i] || '').toString().trim();
    for (const pattern of patterns) {
      if (pattern.test(header)) {
        return { columnIndex: i, columnName: header };
      }
    }
  }
  return null;
};

/**
 * Detect column using keyword search (fallback)
 * @param {string[]} headers - Array of header strings
 * @param {RegExp[]} keywords - Keywords to search for
 * @param {number[]} excludeIndices - Indices to exclude from search
 * @returns {{ columnIndex: number, columnName: string } | null}
 */
const detectColumnByKeyword = (headers, keywords, excludeIndices = []) => {
  for (let i = 0; i < headers.length; i++) {
    if (excludeIndices.includes(i)) continue;
    const header = (headers[i] || '').toString().trim().toLowerCase();
    for (const keyword of keywords) {
      if (keyword.test(header)) {
        return { columnIndex: i, columnName: headers[i] };
      }
    }
  }
  return null;
};

/**
 * Detect all required columns from headers
 * @param {string[]} headers - Array of header strings
 * @returns {{ parentSkuCol: object|null, childSkuCol: object|null, quantityCol: object|null, allDetected: boolean }}
 */
const detectAllColumns = (headers) => {
  const usedIndices = [];

  // 1. Detect Parent SKU column
  let parentSkuCol = detectColumn(headers, PARENT_SKU_PATTERNS, usedIndices);
  if (!parentSkuCol) {
    parentSkuCol = detectColumnByKeyword(headers, [/sku/i, /parent/i, /product/i, /item/i, /material/i], usedIndices);
  }
  if (parentSkuCol) usedIndices.push(parentSkuCol.columnIndex);

  // 2. Detect Child SKU column
  let childSkuCol = detectColumn(headers, CHILD_SKU_PATTERNS, usedIndices);
  if (!childSkuCol) {
    childSkuCol = detectColumnByKeyword(headers, [/child/i, /component/i, /rm/i, /raw/i], usedIndices);
  }
  if (childSkuCol) usedIndices.push(childSkuCol.columnIndex);

  // 3. Detect Quantity column
  let quantityCol = detectColumn(headers, QUANTITY_PATTERNS, usedIndices);
  if (!quantityCol) {
    quantityCol = detectColumnByKeyword(headers, [/qty/i, /quantity/i, /usage/i, /amount/i], usedIndices);
  }

  return {
    parentSkuCol,
    childSkuCol,
    quantityCol,
    allDetected: !!(parentSkuCol && childSkuCol && quantityCol)
  };
};

/**
 * Find the header row in raw data
 * @param {any[][]} data - Raw data rows
 * @returns {{ headerRowIndex: number, headers: string[], columnMapping: object } | null}
 */
const findHeaderRow = (data) => {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = Array.isArray(data[i]) ? data[i] : Object.values(data[i] || {});

    // Skip empty rows
    if (row.every(cell => !cell || cell.toString().trim() === '')) continue;

    // Count non-empty text cells (likely headers)
    const textCells = row.filter(cell => {
      const val = (cell || '').toString().trim();
      return val && isNaN(parseFloat(val));
    });

    const nonEmptyCells = row.filter(cell => (cell || '').toString().trim()).length;
    if (textCells.length >= nonEmptyCells * 0.4 && nonEmptyCells >= 3) {
      const headers = row.map(cell => (cell || '').toString().trim());
      const detection = detectAllColumns(headers);

      // If at least parent and child are detected, consider it a valid header row
      if (detection.parentSkuCol && detection.childSkuCol) {
        return {
          headerRowIndex: i,
          headers,
          columnMapping: detection
        };
      }
    }
  }
  return null;
};

/**
 * Find potential header row and sample data for manual selection
 */
const findPotentialHeaders = (data) => {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = Array.isArray(data[i]) ? data[i] : Object.values(data[i] || {});

    const textCells = row.filter(cell => {
      const val = (cell || '').toString().trim();
      return val && isNaN(parseFloat(val));
    });

    if (textCells.length >= 3) {
      const headers = row.map(cell => (cell || '').toString().trim());
      const sampleRows = data.slice(i + 1, i + 6).map(r =>
        (Array.isArray(r) ? r : Object.values(r || {})).map(c => (c || '').toString())
      );

      // Get partial detection info
      const partialDetection = detectAllColumns(headers);

      return { headerRowIndex: i, headers, sampleRows, partialDetection };
    }
  }

  // Fallback: use first row
  const firstRow = Array.isArray(data[0]) ? data[0] : Object.values(data[0] || {});
  const headers = firstRow.map((cell, i) => (cell || '').toString().trim() || `Column ${i + 1}`);
  const sampleRows = data.slice(1, 6).map(r =>
    (Array.isArray(r) ? r : Object.values(r || {})).map(c => (c || '').toString())
  );
  return { headerRowIndex: 0, headers, sampleRows, partialDetection: detectAllColumns(headers) };
};

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
      header: false,
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
  const headerInfo = findHeaderRow(data);

  if (!headerInfo) {
    // Return special response for manual selection
    const potentialHeaderInfo = findPotentialHeaders(data);
    throw {
      needsColumnSelection: true,
      rawData: data,
      potentialHeaders: potentialHeaderInfo.headers,
      headerRowIndex: potentialHeaderInfo.headerRowIndex,
      sampleRows: potentialHeaderInfo.sampleRows,
      partialDetection: potentialHeaderInfo.partialDetection,
      message: 'Could not automatically detect all required columns. Please select the columns manually.'
    };
  }

  const { headerRowIndex, headers, columnMapping } = headerInfo;

  // If quantity column wasn't detected, we still proceed but use a fallback
  const quantityColIndex = columnMapping.quantityCol?.columnIndex;

  const rows = data.slice(headerRowIndex + 1).map(row => {
    if (Array.isArray(row)) {
      return row;
    } else {
      return headers.map(header => row[header] || '');
    }
  });

  return {
    headers,
    rows,
    columnMapping: {
      parentSkuIndex: columnMapping.parentSkuCol.columnIndex,
      parentSkuName: columnMapping.parentSkuCol.columnName,
      childSkuIndex: columnMapping.childSkuCol.columnIndex,
      childSkuName: columnMapping.childSkuCol.columnName,
      quantityIndex: quantityColIndex,
      quantityName: columnMapping.quantityCol?.columnName || null,
    },
    detectedAutomatically: true
  };
};

/**
 * Process data with manually selected columns
 * @param {any[][]} rawData - Raw data from file
 * @param {number} headerRowIndex - Index of header row
 * @param {object} columnMapping - User-selected column mapping
 */
export const processWithSelectedColumns = (rawData, headerRowIndex, columnMapping) => {
  const headerRow = Array.isArray(rawData[headerRowIndex])
    ? rawData[headerRowIndex]
    : Object.values(rawData[headerRowIndex] || {});

  const headers = headerRow.map(cell => (cell || '').toString().trim());

  const rows = rawData.slice(headerRowIndex + 1).map(row => {
    if (Array.isArray(row)) {
      return row.map(cell => (cell || '').toString());
    } else {
      return headers.map(header => (row[header] || '').toString());
    }
  });

  return {
    headers,
    rows,
    columnMapping: {
      parentSkuIndex: columnMapping.parentSkuIndex,
      parentSkuName: headers[columnMapping.parentSkuIndex],
      childSkuIndex: columnMapping.childSkuIndex,
      childSkuName: headers[columnMapping.childSkuIndex],
      quantityIndex: columnMapping.quantityIndex,
      quantityName: headers[columnMapping.quantityIndex],
    },
    detectedAutomatically: false
  };
};