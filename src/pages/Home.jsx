import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { downloadFile, generateXLSX } from '../utils/xlsxGenerator';
import { getLatestBOMFromIndexedDB } from '../utils/indexedDB';
import registerServiceWorker from '../serviceWorkerRegistration';

const Home = () => {
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [bomData, setBomData] = useState(null);
  const [lastConversion, setLastConversion] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    registerServiceWorker();

    // Load last conversion from IndexedDB
    const loadLastConversion = async () => {
      try {
        const latest = await getLatestBOMFromIndexedDB();
        if (latest) {
          setLastConversion(latest);
        }
      } catch (error) {
        console.error('Failed to load last conversion:', error);
      }
    };

    loadLastConversion();
  }, []);

  const handleFileProcessed = (blob, filename, multiLevelBOM) => {
    setDownloadBlob(blob);
    setDownloadFilename(filename);
    setBomData(multiLevelBOM);
    setIsDownloadReady(true);
    setIsDismissed(false);
    // Update last conversion with the new one
    setLastConversion({
      ...multiLevelBOM,
      filename: filename.replace('_multi_level.xlsx', ''),
      rowCount: multiLevelBOM.rows?.length || 0,
      convertedAt: new Date().toISOString()
    });
  };

  const handleDownload = () => {
    if (downloadBlob && downloadFilename) {
      downloadFile(downloadBlob, downloadFilename);
    }
  };

  const handleDownloadLastConversion = () => {
    if (lastConversion) {
      const xlsxBlob = generateXLSX(lastConversion);
      const filename = `${lastConversion.filename || 'bom_export'}_multi_level.xlsx`;
      downloadFile(xlsxBlob, filename);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsDownloadReady(false);
  };

  // Format date for display
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine what to show - new conversion takes priority
  const showConversionCard = !isDismissed && (isDownloadReady || lastConversion);
  const displayData = isDownloadReady ? bomData : lastConversion;
  const isNewConversion = isDownloadReady;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <div className="flex-1 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4 sm:text-5xl">
              BOM Multi-Level Converter
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Transform single-level Bill of Materials into a structured multi-level hierarchy with automatic quantity calculations.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 transition-shadow hover:shadow-md duration-300">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Upload Your BOM File
            </h2>
            <FileUpload onFileProcessed={handleFileProcessed} />
          </div>

          {showConversionCard && (
            <div className="bg-white rounded-xl shadow-sm border border-green-100 p-8 mb-8 ring-1 ring-green-500/10 relative">
              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {isNewConversion ? 'Conversion Successful' : 'Last Conversion'}
                </h3>
                {!isNewConversion && lastConversion?.convertedAt && (
                  <p className="text-xs text-gray-400 mb-2">
                    {formatDate(lastConversion.convertedAt)}
                  </p>
                )}
                <p className="text-gray-500 mb-1">
                  <span className="font-medium text-gray-700">{displayData?.filename || lastConversion?.filename}</span>
                </p>
                <p className="text-gray-500 mb-6">
                  {(displayData?.rows?.length || displayData?.rowCount || 0).toLocaleString()} rows
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={isNewConversion ? handleDownload : handleDownloadLastConversion}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[oklch(12.9%_0.042_264.695)] hover:bg-[oklch(18%_0.042_264.695)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[oklch(12.9%_0.042_264.695)] w-full sm:w-auto"
                  >
                    <svg
                      className="w-5 h-5 mr-2 -ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download XLSX
                  </button>

                  <Link
                    to="/viewer"
                    className="inline-flex items-center justify-center px-6 py-3 border-2 border-[oklch(12.9%_0.042_264.695)] text-base font-medium rounded-lg text-[oklch(12.9%_0.042_264.695)] bg-white hover:bg-[oklch(95%_0.01_264.695)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[oklch(12.9%_0.042_264.695)] w-full sm:w-auto"
                  >
                    <svg
                      className="w-5 h-5 mr-2 -ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View in Browser
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="mt-20 pt-16 border-t border-gray-200">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 bg-[oklch(95%_0.01_264.695)] text-[oklch(12.9%_0.042_264.695)] text-sm font-medium rounded-full mb-4">
                Powerful Features
              </span>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Everything You Need for BOM Conversion
              </h3>
              <p className="text-gray-500 max-w-xl mx-auto">
                Transform your single-level BOMs into structured multi-level hierarchies with our powerful client-side processor.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1 - Security */}
              <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-200 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-lg">100% Client-Side</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Your data never leaves your browser. All processing happens locally, ensuring complete privacy and security.
                </p>
              </div>

              {/* Feature 2 - File Formats */}
              <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-lg">Multiple Formats</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Import CSV or XLSX files and export your converted BOM in either format with auto-sized columns.
                </p>
              </div>

              {/* Feature 3 - Multi-Level */}
              <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-lg">Multi-Level Hierarchy</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Automatically builds hierarchical structure from flat BOM data with clear level indicators.
                </p>
              </div>

              {/* Feature 4 - Cumulative Quantities */}
              <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-lg">Smart Calculations</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Automatically calculates cumulative quantities by multiplying through the hierarchy chain.
                </p>
              </div>

              {/* Feature 5 - Loop Detection */}
              <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-red-200 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-lg">Loop Detection</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Intelligent circular reference detection prevents infinite loops in your BOM structure.
                </p>
              </div>

              {/* Feature 6 - Browser Viewer */}
              <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2 text-lg">Interactive Viewer</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  View, search, filter, and sort your converted BOM directly in the browser with AG Grid.
                </p>
              </div>
            </div>

            {/* Quick Start Guide */}
            <div className="mt-12 bg-gradient-to-r from-[oklch(12.9%_0.042_264.695)] to-[oklch(18%_0.06_264.695)] rounded-2xl p-8 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="text-xl font-bold mb-2">Quick Start Guide</h4>
                  <p className="text-white/80 text-sm">
                    Upload any BOM file — we'll auto-detect your columns or let you select manually!
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-sm">Upload File</span>
                  </div>
                  <svg className="w-4 h-4 text-white/50 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-sm">Auto Convert</span>
                  </div>
                  <svg className="w-4 h-4 text-white/50 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-sm">Download</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 border-t border-gray-200 pt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h3>
            <div className="space-y-4">
              {/* FAQ Item 1 */}
              <details className="bg-white rounded-lg border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">Is my data secure when using this tool?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  <strong className="text-green-600">Yes, absolutely!</strong> All processing happens entirely in your browser (client-side). Your BOM data is <strong>never uploaded to any server</strong>. The conversion, parsing, and calculations are performed locally using JavaScript. Your files stay on your device, ensuring complete data privacy and security.
                </div>
              </details>

              {/* FAQ Item 2 */}
              <details className="bg-white rounded-lg border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">What file formats are supported?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  The tool supports <strong>CSV</strong> and <strong>XLSX (Excel)</strong> file formats for input. For output, you can export your converted multi-level BOM as either XLSX or CSV format from the BOM Viewer.
                </div>
              </details>

              {/* FAQ Item 3 */}
              <details className="bg-white rounded-lg border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">What column formats are supported?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  The tool uses <strong>smart detection</strong> to automatically identify your parent SKU column. It recognizes common formats like "SKU", "Part Number", "Item Code", "Material", "Product ID", and many more. If auto-detection fails, you'll be prompted to manually select the correct column from your data.
                </div>
              </details>

              {/* FAQ Item 4 */}
              <details className="bg-white rounded-lg border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">How are cumulative quantities calculated?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  The tool recursively processes parent-child relationships and multiplies quantities along the hierarchy. For example, if Product A needs 2× Component B, and Component B needs 3× Part C, then the cumulative quantity of Part C for Product A would be 2 × 3 = 6.
                </div>
              </details>

              {/* FAQ Item 5 */}
              <details className="bg-white rounded-lg border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">What happens if there's a circular reference in my BOM?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  The converter includes <strong>infinite loop detection</strong>. It tracks the processing path and uses memoization to prevent circular references from causing infinite recursion. If a component references itself (directly or indirectly), the tool will skip that path and continue processing.
                </div>
              </details>

              {/* FAQ Item 6 */}
              <details className="bg-white rounded-lg border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">How is my conversion history stored?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  Conversion history is stored locally in your browser using <strong>IndexedDB</strong>, which can handle large datasets (hundreds of MB). This data stays on your device and persists across browser sessions. The last 10 conversions are automatically retained, and older entries are cleaned up to save space.
                </div>
              </details>

              {/* FAQ Item 7 */}
              <details className="bg-white rounded-lg border border-gray-100 shadow-sm group">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">Can I use this tool offline?</span>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                  Yes! Once the page is loaded, the tool works entirely offline. Since all processing is done client-side in your browser, you don't need an internet connection to convert your BOM files. The app even includes a service worker for improved offline capability.
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[oklch(12.9%_0.042_264.695)] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="py-12 grid md:grid-cols-2 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                </div>
                <span className="text-lg font-bold">BOM Converter</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                Transform single-level Bill of Materials into structured multi-level hierarchies. 100% client-side processing for complete data privacy.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4 text-white/90">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-white/60 hover:text-white text-sm transition-colors inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                  </a>
                </li>
                <li>
                  <Link to="/viewer" className="text-white/60 hover:text-white text-sm transition-colors inline-flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    BOM Viewer
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} BOM Converter. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-white/50 text-xs flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Your data stays private
              </span>
              <span className="text-white/50 text-xs flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Powered by React
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;