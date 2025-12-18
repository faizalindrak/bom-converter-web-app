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
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8 font-sans">
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

        <div className="mt-16 border-t border-gray-200 pt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-8 text-center">
            Features & Guidelines
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3 text-sm font-bold">1</span>
                Input Requirements
              </h4>
              <ul className="space-y-3 text-gray-600 text-sm">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-500 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  CSV or XLSX file formats
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-500 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  "SKU (SFG/FG)" header required
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-blue-500 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Defined parent-child columns
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3 text-sm font-bold">2</span>
                Output Features
              </h4>
              <ul className="space-y-3 text-gray-600 text-sm">
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-purple-500 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Hierarchical structure analysis
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-purple-500 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Smart cumulative calculations
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 text-purple-500 mt-1 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Infinite loop detection
                </li>
              </ul>
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
                <span className="font-medium text-gray-900">What does "SKU (SFG/FG)" header mean?</span>
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                This column header identifies the parent SKU in your BOM structure. <strong>SFG</strong> stands for Semi-Finished Goods and <strong>FG</strong> stands for Finished Goods. The tool uses this column to identify parent-child relationships and build the multi-level hierarchy.
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
  );
};

export default Home;