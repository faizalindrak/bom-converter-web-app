export const convertToMultiLevelBOM = (parsedData) => {
  const { headers, rows } = parsedData;
  
  if (!headers || !rows || rows.length === 0) {
    throw new Error('No data found in file');
  }

  // Build parent-child relationships
  const sfgToChildren = new Map();
  const skuToRowMap = new Map();
  
  rows.forEach(row => {
    if (!row || row.length < 12) return;
    
    // Convert numeric columns (indices 9, 10, 11) to numbers
    const numericIndices = [9, 10, 11];
    numericIndices.forEach(idx => {
      if (idx < row.length) {
        const value = row[idx];
        const numValue = parseFloat(value?.toString().replace(',', '.'));
        row[idx] = isNaN(numValue) ? 0.0 : numValue;
      }
    });
    
    const parentSku = row[0]?.toString();
    if (!parentSku) return;
    
    if (!sfgToChildren.has(parentSku)) {
      sfgToChildren.set(parentSku, []);
    }
    sfgToChildren.get(parentSku).push(row);
    
    if (!skuToRowMap.has(parentSku)) {
      skuToRowMap.set(parentSku, row);
    }
  });
  
  const allParentSkus = Array.from(sfgToChildren.keys());
  const outputData = [];
  const newHeaders = [...headers.slice(0, 5), 'Level', ...headers.slice(5)];
  
  const getChildrenRecursive = (parentSku, level, multiplier, topLevelParentRow, memo, parentChain) => {
    if (!sfgToChildren.has(parentSku)) return;
    
    const children = sfgToChildren.get(parentSku);
    
    for (const childRow of children) {
      const childSku = childRow[5]?.toString();
      if (!childSku) continue;
      
      // Create memo key to prevent infinite loops
      const currentPath = [...parentChain, parentSku];
      const memoKey = JSON.stringify([topLevelParentRow[0], currentPath, childSku]);
      
      if (memo.has(memoKey)) continue;
      memo.add(memoKey);
      
      const baseQuantity = childRow[9] || 0;
      const cumulativeQuantity = baseQuantity * multiplier;
      
      // Create output row: parent info + level + child info with cumulative quantity
      const outputRow = [
        ...topLevelParentRow.slice(0, 5),
        level,
        ...childRow.slice(5, 9),
        cumulativeQuantity,
        ...childRow.slice(10)
      ];
      
      outputData.push(outputRow);
      
      // Recursively process children if they exist
      if (sfgToChildren.has(childSku)) {
        getChildrenRecursive(childSku, level + 1, cumulativeQuantity, topLevelParentRow, memo, currentPath);
      }
    }
  };
  
  // Process each top-level parent SKU
  for (const parentSku of allParentSkus) {
    const topLevelParentRow = skuToRowMap.get(parentSku);
    if (!topLevelParentRow) continue;
    
    const memo = new Set();
    getChildrenRecursive(parentSku, 1, 1.0, topLevelParentRow, memo, []);
  }
  
  return { headers: newHeaders, rows: outputData };
};