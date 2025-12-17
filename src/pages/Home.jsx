import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { downloadFile } from '../utils/xlsxGenerator';
import registerServiceWorker from '../serviceWorkerRegistration';

const Home = () => {
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [bomData, setBomData] = useState(null);

  React.useEffect(() => {
    registerServiceWorker();
  }, []);

  const handleFileProcessed = (blob, filename, multiLevelBOM) => {
    setDownloadBlob(blob);
    setDownloadFilename(filename);
    setBomData(multiLevelBOM);
    setIsDownloadReady(true);
  };

  const handleDownload = () => {
    if (downloadBlob && downloadFilename) {
      downloadFile(downloadBlob, downloadFilename);
      // Reset after download
      setTimeout(() => {
        setIsDownloadReady(false);
        setDownloadBlob(null);
        setDownloadFilename('');
      }, 1000);
    }
  };

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

        {isDownloadReady && (
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-8 mb-8 ring-1 ring-green-500/10">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Conversion Successful
              </h3>
              <p className="text-gray-500 mb-6">
                Your BOM has been converted with {bomData?.rows?.length?.toLocaleString() || 0} rows.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto"
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
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-indigo-600 text-base font-medium rounded-lg text-indigo-600 bg-white hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto"
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
      </div>
    </div>
  );
};

export default Home;