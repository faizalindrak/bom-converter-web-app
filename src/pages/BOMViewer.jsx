import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import { getLatestBOMFromIndexedDB, getAllBOMFromIndexedDB, getBOMByIdFromIndexedDB, deleteBOMFromIndexedDB } from '../utils/indexedDB';
import { generateXLSX, downloadFile } from '../utils/xlsxGenerator';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Custom theme based on Quartz
const customTheme = themeQuartz.withParams({
    accentColor: 'oklch(12.9% 0.042 264.695)',
    backgroundColor: '#ffffff',
    foregroundColor: '#1f2937',
    headerBackgroundColor: '#f8fafc',
    headerTextColor: '#374151',
    rowHoverColor: '#f1f5f9',
    selectedRowBackgroundColor: 'oklch(95% 0.01 264.695)',
    borderColor: '#e5e7eb',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    headerFontSize: 13,
    headerFontWeight: 600,
    rowBorder: true,
    wrapperBorderRadius: 12,
});

const BOMViewer = () => {
    const [searchParams] = useSearchParams();
    const [bomData, setBomData] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedHistoryId, setSelectedHistoryId] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [gridApi, setGridApi] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const exportDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setExportDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load BOM data from IndexedDB
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Load latest result and history from IndexedDB
                const [latest, historyData] = await Promise.all([
                    getLatestBOMFromIndexedDB(),
                    getAllBOMFromIndexedDB()
                ]);

                setBomData(latest);
                if (latest) setSelectedHistoryId(latest.id);
                setHistory(historyData);
            } catch (error) {
                console.error('Failed to load BOM data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [searchParams]);

    // Generate column definitions from headers
    const columnDefs = useMemo(() => {
        if (!bomData?.headers) return [];

        return bomData.headers.map((header, index) => {
            const isLevelColumn = header?.toLowerCase() === 'level';
            const isNumericColumn = ['qty', 'quantity', 'price', 'cost', 'amount', 'level'].some(
                keyword => header?.toLowerCase()?.includes(keyword)
            );

            return {
                field: `col_${index}`,
                headerName: header || `Column ${index + 1}`,
                minWidth: isLevelColumn ? 80 : 120,
                maxWidth: isLevelColumn ? 100 : undefined,
                filter: true,
                sortable: true,
                resizable: true,
                cellClass: isNumericColumn ? 'text-right' : '',
                headerClass: 'font-semibold',
                // Custom cell renderer for Level column with visual hierarchy
                cellRenderer: isLevelColumn ? (params) => {
                    const level = parseInt(params.value) || 0;
                    const colors = [
                        'bg-[oklch(90%_0.03_264.695)] text-[oklch(20%_0.042_264.695)]',
                        'bg-purple-100 text-purple-700',
                        'bg-blue-100 text-blue-700',
                        'bg-cyan-100 text-cyan-700',
                        'bg-teal-100 text-teal-700',
                    ];
                    const colorClass = colors[Math.min(level - 1, colors.length - 1)] || colors[0];
                    return (
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                            L{level}
                        </span>
                    );
                } : undefined,
                // Format numeric values
                valueFormatter: !isLevelColumn && isNumericColumn ? (params) => {
                    const num = parseFloat(params.value);
                    if (isNaN(num)) return params.value;
                    return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
                } : undefined,
            };
        });
    }, [bomData?.headers]);

    // Transform rows data for AG Grid
    const rowData = useMemo(() => {
        if (!bomData?.rows) return [];

        return bomData.rows.map((row, rowIndex) => {
            const rowObj = { id: rowIndex };
            row.forEach((cell, colIndex) => {
                rowObj[`col_${colIndex}`] = cell;
            });
            return rowObj;
        });
    }, [bomData?.rows]);

    // Grid ready handler
    const onGridReady = useCallback((params) => {
        setGridApi(params.api);
    }, []);

    // Quick search filter
    useEffect(() => {
        if (gridApi) {
            gridApi.setGridOption('quickFilterText', searchText);
        }
    }, [searchText, gridApi]);

    // Handle delete from history
    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this from history?')) {
            try {
                await deleteBOMFromIndexedDB(id);
                const updatedHistory = await getAllBOMFromIndexedDB();
                setHistory(updatedHistory);

                // If deleted the current data, reload
                if (selectedHistoryId === id) {
                    const latest = await getLatestBOMFromIndexedDB();
                    setBomData(latest);
                    setSelectedHistoryId(latest?.id || null);
                }
            } catch (error) {
                console.error('Failed to delete:', error);
            }
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        if (gridApi) {
            gridApi.exportDataAsCsv({
                fileName: `${bomData?.filename || 'bom_export'}_${new Date().toISOString().split('T')[0]}.csv`
            });
        }
        setExportDropdownOpen(false);
    };

    // Export to XLSX
    const handleExportXLSX = () => {
        if (bomData) {
            const xlsxBlob = generateXLSX(bomData);
            const filename = `${bomData.filename || 'bom_export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
            downloadFile(xlsxBlob, filename);
        }
        setExportDropdownOpen(false);
    };

    // Format date
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(12.9%_0.042_264.695)]"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 flex-shrink-0">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/"
                                className="inline-flex items-center text-gray-500 hover:text-[oklch(12.9%_0.042_264.695)] transition-colors"
                            >
                                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back
                            </Link>
                            <div className="h-6 w-px bg-gray-300"></div>
                            <h1 className="text-xl font-bold text-gray-900">BOM Viewer</h1>

                            {/* Sidebar Toggle */}
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                title={sidebarCollapsed ? 'Show History' : 'Hide History'}
                            >
                                <svg className={`w-4 h-4 mr-1.5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                {sidebarCollapsed ? 'Show History' : 'Hide History'}
                            </button>
                        </div>

                        {bomData && (
                            <div className="flex items-center space-x-3">
                                {/* Search */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Quick search..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="w-72 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(12.9%_0.042_264.695)] focus:border-transparent transition-shadow"
                                    />
                                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>

                                {/* Export Dropdown Button */}
                                <div className="relative" ref={exportDropdownRef}>
                                    <button
                                        onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                                        className="inline-flex items-center px-4 py-2 bg-[oklch(12.9%_0.042_264.695)] text-white text-sm font-medium rounded-lg hover:bg-[oklch(18%_0.042_264.695)] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[oklch(12.9%_0.042_264.695)]"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Export
                                        <svg className={`w-4 h-4 ml-2 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {exportDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                            <button
                                                onClick={handleExportXLSX}
                                                className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Save as XLSX
                                            </button>
                                            <button
                                                onClick={handleExportCSV}
                                                className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Save as CSV
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden px-4 py-3 gap-4">
                {/* History Sidebar - Collapsible */}
                <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                            <h2 className="text-sm font-semibold text-gray-700">Conversion History</h2>
                        </div>

                        {history.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm flex-1">
                                <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                No history yet.
                                <Link to="/" className="block mt-2 text-[oklch(12.9%_0.042_264.695)] hover:text-[oklch(18%_0.042_264.695)] font-medium text-xs">
                                    Convert a file →
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-3 transition-colors group ${selectedHistoryId === item.id
                                            ? 'bg-[oklch(95%_0.01_264.695)] border-l-2 border-[oklch(12.9%_0.042_264.695)]'
                                            : 'hover:bg-gray-50 border-l-2 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-medium truncate ${selectedHistoryId === item.id ? 'text-[oklch(12.9%_0.042_264.695)]' : 'text-gray-900'
                                                    }`}>
                                                    {item.filename}
                                                </p>
                                                <div className="mt-1 flex items-center text-xs text-gray-500">
                                                    <span>{item.rowCount?.toLocaleString()} rows</span>
                                                    <span className="mx-1.5">•</span>
                                                    <span>{formatDate(item.convertedAt)}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="ml-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content - AG Grid (Maximized) */}
                <div className="flex-1 min-w-0 flex flex-col">
                    {!bomData ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex-1 flex flex-col items-center justify-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data to Display</h3>
                            <p className="text-gray-500 mb-6">Convert a BOM file to view it here.</p>
                            <Link
                                to="/"
                                className="inline-flex items-center px-6 py-3 bg-[oklch(12.9%_0.042_264.695)] text-white font-medium rounded-lg hover:bg-[oklch(18%_0.042_264.695)] transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload & Convert
                            </Link>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                            {/* Data Info Bar - Compact */}
                            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-700">{bomData.filename}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {bomData.rowCount?.toLocaleString()} rows × {bomData.headers?.length} cols
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {formatDate(bomData.convertedAt)}
                                </span>
                            </div>

                            {/* AG Grid - Full Height */}
                            <div className="flex-1">
                                <AgGridReact
                                    theme={customTheme}
                                    columnDefs={columnDefs}
                                    rowData={rowData}
                                    onGridReady={onGridReady}
                                    defaultColDef={{
                                        sortable: true,
                                        filter: true,
                                        resizable: true,
                                        minWidth: 100,
                                        enableRowGroup: false,
                                    }}
                                    autoSizeStrategy={{
                                        type: 'fitCellContents',
                                    }}
                                    columnMenu="new"
                                    animateRows={true}
                                    rowSelection={{ mode: "multiRow", enableClickSelection: false }}
                                    pagination={true}
                                    paginationPageSize={100}
                                    paginationPageSizeSelector={[50, 100, 200, 500, 1000]}
                                    enableCellTextSelection={true}
                                    ensureDomOrder={true}
                                    suppressMovableColumns={false}
                                    suppressColumnVirtualisation={false}
                                    rowBuffer={30}
                                    domLayout="normal"
                                    sideBar={{
                                        toolPanels: [
                                            {
                                                id: 'columns',
                                                labelDefault: 'Columns',
                                                labelKey: 'columns',
                                                iconKey: 'columns',
                                                toolPanel: 'agColumnsToolPanel',
                                                toolPanelParams: {
                                                    suppressRowGroups: true,
                                                    suppressValues: true,
                                                    suppressPivots: true,
                                                    suppressPivotMode: true,
                                                },
                                            },
                                        ],
                                        defaultToolPanel: '',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default BOMViewer;
