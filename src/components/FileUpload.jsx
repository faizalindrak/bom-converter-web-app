import React, { useState, useCallback } from 'react';
import { parseBOMFile } from '../utils/bomParser';
import { convertToMultiLevelBOM } from '../utils/bomConverter';
import { generateXLSX } from '../utils/xlsxGenerator';
import { saveBOMToIndexedDB } from '../utils/indexedDB';

const FileUpload = ({ onFileProcessed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

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
      const multiLevelBOM = convertToMultiLevelBOM(parsedData);

      // Save converted data to IndexedDB for viewing (supports large datasets)
      const originalFilename = file.name.replace(/\.[^/.]+$/, '');
      await saveBOMToIndexedDB(multiLevelBOM, originalFilename);

      // Generate XLSX for download
      const xlsxBlob = generateXLSX(multiLevelBOM);

      onFileProcessed(xlsxBlob, originalFilename + '_multi_level.xlsx', multiLevelBOM);
    } catch (err) {
      setError(err.message || 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [onFileProcessed]);

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

  return (
    <div className="w-full max-w-xl mx-auto"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <label
        className={`group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${isDragging
          ? 'border-indigo-500 bg-indigo-50/50'
          : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-400 hover:shadow-sm'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isDragging ? 'bg-indigo-100' : 'bg-white group-hover:bg-indigo-50'}`}>
            <svg
              className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'}`}
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
            <span className="text-indigo-600 font-semibold hover:text-indigo-700">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-400">CSV or XLSX files only</p>
          {isProcessing && (
            <div className="flex items-center mt-4 text-indigo-600">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

      {error && (
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