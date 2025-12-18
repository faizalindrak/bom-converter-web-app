export const convertToMultiLevelBOM = (parsedData) => {
  const { headers, rows, columnMapping } = parsedData;

  if (!headers || !rows || rows.length === 0) {
    throw new Error('No data found in file');
  }

  // Get column indices from mapping (fallback to hardcoded if not provided for backwards compatibility)
  const parentSkuIndex = columnMapping?.parentSkuIndex ?? 0;
  const childSkuIndex = columnMapping?.childSkuIndex ?? 5;
  const quantityIndex = columnMapping?.quantityIndex ?? 9;

  // Calculate which columns are "parent info" vs "child info"
  // Parent info: columns before child SKU
  // Child info: columns from child SKU onwards
  const parentInfoEndIndex = Math.min(parentSkuIndex + 5, childSkuIndex);

  // Build parent-child relationships
  const sfgToChildren = new Map();
  const skuToRowMap = new Map();

  rows.forEach(row => {
    if (!row || row.length < Math.max(parentSkuIndex, childSkuIndex, quantityIndex) + 1) return;

    // Convert quantity column to number
    if (quantityIndex < row.length) {
      const value = row[quantityIndex];
      const numValue = parseFloat(value?.toString().replace(',', '.'));
      row[quantityIndex] = isNaN(numValue) ? 0.0 : numValue;
    }

    // Also convert any other likely numeric columns after quantity
    for (let idx = quantityIndex + 1; idx < Math.min(quantityIndex + 3, row.length); idx++) {
      const value = row[idx];
      const numValue = parseFloat(value?.toString().replace(',', '.'));
      if (!isNaN(numValue)) {
        row[idx] = numValue;
      }
    }

    const parentSku = row[parentSkuIndex]?.toString();
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

  // Build new headers: parent columns + Level + child columns (from childSkuIndex onwards)
  const parentHeaders = headers.slice(0, parentInfoEndIndex);
  const childHeaders = headers.slice(childSkuIndex);
  const newHeaders = [...parentHeaders, 'Level', ...childHeaders];

  const getChildrenRecursive = (parentSku, level, multiplier, topLevelParentRow, memo, parentChain) => {
    if (!sfgToChildren.has(parentSku)) return;

    const children = sfgToChildren.get(parentSku);

    for (const childRow of children) {
      const childSku = childRow[childSkuIndex]?.toString();
      if (!childSku) continue;

      // Create memo key to prevent infinite loops
      const currentPath = [...parentChain, parentSku];
      const memoKey = JSON.stringify([topLevelParentRow[parentSkuIndex], currentPath, childSku]);

      if (memo.has(memoKey)) continue;
      memo.add(memoKey);

      const baseQuantity = childRow[quantityIndex] || 0;
      const cumulativeQuantity = baseQuantity * multiplier;

      // Create output row: parent info + level + child info with cumulative quantity
      const parentInfo = topLevelParentRow.slice(0, parentInfoEndIndex);
      const childInfo = childRow.slice(childSkuIndex);

      // Replace quantity at the correct position in child info
      const quantityPositionInChildInfo = quantityIndex - childSkuIndex;
      const childInfoWithCumulativeQty = [...childInfo];
      if (quantityPositionInChildInfo >= 0 && quantityPositionInChildInfo < childInfoWithCumulativeQty.length) {
        childInfoWithCumulativeQty[quantityPositionInChildInfo] = cumulativeQuantity;
      }

      const outputRow = [
        ...parentInfo,
        level,
        ...childInfoWithCumulativeQty
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

  return {
    headers: newHeaders,
    rows: outputData,
    columnMapping // Pass through for reference
  };
};