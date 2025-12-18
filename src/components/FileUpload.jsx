import React, { useState, useCallback, useEffect } from 'react';
import { parseBOMFile, processWithSelectedColumns } from '../utils/bomParser';
import { convertToMultiLevelBOM } from '../utils/bomConverter';
import { generateXLSX } from '../utils/xlsxGenerator';
import { saveBOMToIndexedDB } from '../utils/indexedDB';

const FileUpload = ({ onFileProcessed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Column selection state
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnSelectionData, setColumnSelectionData] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState({
    parentSkuIndex: 0,
    childSkuIndex: 1,
    quantityIndex: 2
  });
  const [pendingFile, setPendingFile] = useState(null);

  // Update selected columns when partial detection is available
  useEffect(() => {
    if (columnSelectionData?.partialDetection) {
      const pd = columnSelectionData.partialDetection;
      setSelectedColumns({
        parentSkuIndex: pd.parentSkuCol?.columnIndex ?? 0,
        childSkuIndex: pd.childSkuCol?.columnIndex ?? 1,
        quantityIndex: pd.quantityCol?.columnIndex ?? 2
      });
    }
  }, [columnSelectionData]);

  const processConversion = useCallback(async (parsedData, file) => {
    const multiLevelBOM = convertToMultiLevelBOM(parsedData);

    // Save converted data to IndexedDB for viewing (supports large datasets)
    const originalFilename = file.name.replace(/\.[^/.]+$/, '');
    await saveBOMToIndexedDB(multiLevelBOM, originalFilename);

    // Generate XLSX for download
    const xlsxBlob = generateXLSX(multiLevelBOM);

    onFileProcessed(xlsxBlob, originalFilename + '_multi_level.xlsx', multiLevelBOM);
  }, [onFileProcessed]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const validTypes = ['.csv', '.xlsx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validTypes.includes(fileExtension)) {
      setError('Please upload a CSV or XLSX file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const parsedData = await parseBOMFile(file);
      await processConversion(parsedData, file);
    } catch (err) {
      // Check if this is a column selection request
      if (err.needsColumnSelection) {
        setPendingFile(file);
        setColumnSelectionData({
          rawData: err.rawData,
          potentialHeaders: err.potentialHeaders,
          headerRowIndex: err.headerRowIndex,
          sampleRows: err.sampleRows,
          partialDetection: err.partialDetection
        });
        setShowColumnSelector(true);
        setError(null);
      } else {
        setError(err.message || 'Failed to process file');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [processConversion]);

  const handleColumnSelection = useCallback(async () => {
    if (!columnSelectionData || !pendingFile) return;

    // Validate that all three columns are different
    const indices = [selectedColumns.parentSkuIndex, selectedColumns.childSkuIndex, selectedColumns.quantityIndex];
    if (new Set(indices).size !== indices.length) {
      setError('Please select three different columns for Parent SKU, Child SKU, and Quantity.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const parsedData = processWithSelectedColumns(
        columnSelectionData.rawData,
        columnSelectionData.headerRowIndex,
        selectedColumns
      );

      await processConversion(parsedData, pendingFile);

      // Reset column selection state
      setShowColumnSelector(false);
      setColumnSelectionData(null);
      setSelectedColumns({ parentSkuIndex: 0, childSkuIndex: 1, quantityIndex: 2 });
      setPendingFile(null);
    } catch (err) {
      setError(err.message || 'Failed to process file with selected columns');
    } finally {
      setIsProcessing(false);
    }
  }, [columnSelectionData, selectedColumns, pendingFile, processConversion]);

  const handleCancelColumnSelection = useCallback(() => {
    setShowColumnSelector(false);
    setColumnSelectionData(null);
    setSelectedColumns({ parentSkuIndex: 0, childSkuIndex: 1, quantityIndex: 2 });
    setPendingFile(null);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    handleFile(file);
  }, [handleFile]);

  // Get highlight class for column
  const getColumnHighlightClass = (colIndex) => {
    if (colIndex === selectedColumns.parentSkuIndex) return 'bg-blue-50 text-blue-900 ring-2 ring-inset ring-blue-300';
    if (colIndex === selectedColumns.childSkuIndex) return 'bg-purple-50 text-purple-900 ring-2 ring-inset ring-purple-300';
    if (colIndex === selectedColumns.quantityIndex) return 'bg-green-50 text-green-900 ring-2 ring-inset ring-green-300';
    return '';
  };

  const getColumnIcon = (colIndex) => {
    if (colIndex === selectedColumns.parentSkuIndex) {
      return <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500 text-white text-xs font-bold mr-1.5">P</span>;
    }
    if (colIndex === selectedColumns.childSkuIndex) {
      return <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-purple-500 text-white text-xs font-bold mr-1.5">C</span>;
    }
    if (colIndex === selectedColumns.quantityIndex) {
      return <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-500 text-white text-xs font-bold mr-1.5">Q</span>;
    }
    return null;
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Column Selection Modal */}
      {showColumnSelector && columnSelectionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Select BOM Columns</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Please identify the <strong>Parent SKU</strong>, <strong>Child SKU</strong>, and <strong>Quantity</strong> columns from your data.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Column Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Parent SKU Selector */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-500 text-white text-xs font-bold">P</span>
                    Parent SKU Column
                  </label>
                  <select
                    value={selectedColumns.parentSkuIndex}
                    onChange={(e) => setSelectedColumns(prev => ({ ...prev, parentSkuIndex: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-gray-900 font-medium bg-blue-50/30"
                  >
                    {columnSelectionData.potentialHeaders.map((header, index) => (
                      <option key={index} value={index}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Child SKU Selector */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-500 text-white text-xs font-bold">C</span>
                    Child SKU Column
                  </label>
                  <select
                    value={selectedColumns.childSkuIndex}
                    onChange={(e) => setSelectedColumns(prev => ({ ...prev, childSkuIndex: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-900 font-medium bg-purple-50/30"
                  >
                    {columnSelectionData.potentialHeaders.map((header, index) => (
                      <option key={index} value={index}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Selector */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-500 text-white text-xs font-bold">Q</span>
                    Quantity Column
                  </label>
                  <select
                    value={selectedColumns.quantityIndex}
                    onChange={(e) => setSelectedColumns(prev => ({ ...prev, quantityIndex: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 border-2 border-green-200 rounded-lg focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-gray-900 font-medium bg-green-50/30"
                  >
                    {columnSelectionData.potentialHeaders.map((header, index) => (
                      <option key={index} value={index}>
                        {header || `Column ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-blue-500"></span>
                  <span className="text-gray-600">Parent SKU (Product/Assembly)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-purple-500"></span>
                  <span className="text-gray-600">Child SKU (Component/Material)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-green-500"></span>
                  <span className="text-gray-600">Quantity (Per Parent)</span>
                </div>
              </div>

              {/* Data Preview */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Data Preview:</h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {columnSelectionData.potentialHeaders.map((header, index) => (
                            <th
                              key={index}
                              className={`px-4 py-3 text-left font-semibold whitespace-nowrap border-b border-gray-200 transition-colors ${getColumnHighlightClass(index) || 'text-gray-700'}`}
                            >
                              <div className="flex items-center">
                                {getColumnIcon(index)}
                                {header || `Column ${index + 1}`}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {columnSelectionData.sampleRows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className={`px-4 py-2.5 whitespace-nowrap border-b border-gray-100 transition-colors ${getColumnHighlightClass(cellIndex) ? getColumnHighlightClass(cellIndex).replace('ring-2 ring-inset ring-', '').split(' ')[0] + '/50' : 'text-gray-600'
                                  }`}
                              >
                                {cell?.toString().substring(0, 25) || <span className="text-gray-300 italic">empty</span>}
                                {cell?.toString().length > 25 && '...'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Showing first 5 data rows. Selected columns are highlighted with their respective colors.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start mb-4">
                  <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={handleCancelColumnSelection}
                className="px-5 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleColumnSelection}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-gradient-to-r from-[oklch(12.9%_0.042_264.695)] to-[oklch(18%_0.06_264.695)] text-white font-medium rounded-lg hover:from-[oklch(18%_0.042_264.695)] hover:to-[oklch(22%_0.06_264.695)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm & Convert
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <label
          className={`group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isDragging
            ? 'border-[oklch(12.9%_0.042_264.695)] bg-[oklch(95%_0.01_264.695)]'
            : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-[oklch(25%_0.042_264.695)] hover:shadow-sm'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isDragging ? 'bg-[oklch(90%_0.03_264.695)]' : 'bg-white group-hover:bg-[oklch(95%_0.01_264.695)]'}`}>
              <svg
                className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-[oklch(12.9%_0.042_264.695)]' : 'text-gray-400 group-hover:text-[oklch(18%_0.042_264.695)]'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="mb-2 text-sm text-gray-600 font-medium">
              <span className="text-[oklch(12.9%_0.042_264.695)] font-semibold hover:text-[oklch(18%_0.042_264.695)]">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400">CSV or XLSX files only</p>
            {isProcessing && (
              <div className="flex items-center mt-4 text-[oklch(12.9%_0.042_264.695)]">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[oklch(12.9%_0.042_264.695)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-medium">Processing file...</p>
              </div>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            disabled={isProcessing}
          />
        </label>
      </div>

      {error && !showColumnSelector && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start">
          <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;