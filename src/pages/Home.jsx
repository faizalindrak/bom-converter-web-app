import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';
import { downloadFile } from '../utils/xlsxGenerator';
import registerServiceWorker from '../serviceWorkerRegistration';

const Home = () => {
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('');

  React.useEffect(() => {
    registerServiceWorker();
  }, []);

  const handleFileProcessed = (blob, filename) => {
    setDownloadBlob(blob);
    setDownloadFilename(filename);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BOM Multi-Level Converter
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Convert single-level Bill of Materials to multi-level structure with hierarchical relationships <br/>
            and cumulative quantity calculations. Supports CSV and XLSX files.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Upload Your BOM File
          </h2>
          <FileUpload onFileProcessed={handleFileProcessed} />
        </div>

        {isDownloadReady && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              Conversion Complete!
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Your multi-level BOM file is ready for download
            </p>
            <div className="text-center">
              <button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-5 h-5 inline-block mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Multi-Level BOM
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            How to Use
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Input Requirements:</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>CSV or XLSX file formats</li>
                <li>Must contain "SKU (SFG/FG)" header column</li>
                <li>Parent-child relationships defined in columns</li>
                <li>Quantity information in numeric columns</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Output Features:</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Hierarchical BOM structure with levels</li>
                <li>Cumulative quantity calculations</li>
                <li>Prevents infinite loops</li>
                <li>XLSX format output</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;