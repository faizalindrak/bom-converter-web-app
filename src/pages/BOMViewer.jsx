import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';
import { getLatestBOMFromIndexedDB, getAllBOMFromIndexedDB, deleteBOMFromIndexedDB } from '../utils/indexedDB';
import { generateXLSX, downloadFile } from '../utils/xlsxGenerator';

// Filter modes
const FILTER_MODES = [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'notContains', label: 'Does not contain' },
    { value: 'notEquals', label: 'Does not equal' },
    { value: 'empty', label: 'Is empty' },
    { value: 'notEmpty', label: 'Is not empty' },
];

// Custom filter function
const customFilterFn = (row, columnId, filterValue) => {
    if (!filterValue) return true;

    const { mode, value } = filterValue;
    const cellValue = String(row.getValue(columnId) ?? '').toLowerCase();
    const searchValue = String(value ?? '').toLowerCase();

    switch (mode) {
        case 'contains':
            return cellValue.includes(searchValue);
        case 'equals':
            return cellValue === searchValue;
        case 'startsWith':
            return cellValue.startsWith(searchValue);
        case 'endsWith':
            return cellValue.endsWith(searchValue);
        case 'notContains':
            return !cellValue.includes(searchValue);
        case 'notEquals':
            return cellValue !== searchValue;
        case 'empty':
            return cellValue === '';
        case 'notEmpty':
            return cellValue !== '';
        default:
            return cellValue.includes(searchValue);
    }
};

// Rich Column Filter Component
const ColumnFilter = ({ column, columnName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState('contains');
    const [value, setValue] = useState('');
    const dropdownRef = useRef(null);

    const filterValue = column.getFilterValue();
    const isFiltered = filterValue && (filterValue.value || filterValue.mode === 'empty' || filterValue.mode === 'notEmpty');

    // Sync local state with column filter
    useEffect(() => {
        if (filterValue) {
            setMode(filterValue.mode || 'contains');
            setValue(filterValue.value || '');
        } else {
            setMode('contains');
            setValue('');
        }
    }, [filterValue]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyFilter = () => {
        if (mode === 'empty' || mode === 'notEmpty') {
            column.setFilterValue({ mode, value: '' });
        } else if (value) {
            column.setFilterValue({ mode, value });
        } else {
            column.setFilterValue(undefined);
        }
        setIsOpen(false);
    };

    const clearFilter = () => {
        column.setFilterValue(undefined);
        setMode('contains');
        setValue('');
        setIsOpen(false);
    };

    const needsValue = mode !== 'empty' && mode !== 'notEmpty';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${isFiltered ? 'text-[oklch(12.9%_0.042_264.695)] bg-[oklch(95%_0.01_264.695)]' : 'text-gray-400'}`}
                title="Filter column"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                        <span className="text-xs font-semibold text-gray-700">Filter: {columnName}</span>
                    </div>

                    <div className="p-3 space-y-3">
                        {/* Filter Mode Select */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[oklch(12.9%_0.042_264.695)] focus:border-transparent"
                            >
                                {FILTER_MODES.map((m) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Value Input */}
                        {needsValue && (
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                                <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') applyFilter();
                                    }}
                                    placeholder="Enter filter value..."
                                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[oklch(12.9%_0.042_264.695)] focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <button
                                onClick={clearFilter}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={applyFilter}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-[oklch(12.9%_0.042_264.695)] hover:bg-[oklch(18%_0.042_264.695)] rounded-md transition-colors"
                            >
                                Apply Filter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Level badge component
const LevelBadge = ({ value }) => {
    const level = parseInt(value) || 0;
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
};

const BOMViewer = () => {
    const [searchParams] = useSearchParams();
    const [bomData, setBomData] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedHistoryId, setSelectedHistoryId] = useState(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [columnSizing, setColumnSizing] = useState({});
    const exportDropdownRef = useRef(null);
    const columnVisibilityRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setExportDropdownOpen(false);
            }
            if (columnVisibilityRef.current && !columnVisibilityRef.current.contains(event.target)) {
                setColumnVisibilityOpen(false);
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
    const columns = useMemo(() => {
        if (!bomData?.headers) return [];

        return bomData.headers.map((header, index) => {
            const isLevelColumn = header?.toLowerCase() === 'level';
            const isNumericColumn = ['qty', 'quantity', 'price', 'cost', 'amount', 'level'].some(
                keyword => header?.toLowerCase()?.includes(keyword)
            );

            // Cell renderer based on column type
            const getCellRenderer = () => {
                if (isLevelColumn) {
                    return ({ getValue }) => <LevelBadge value={getValue()} />;
                }
                if (isNumericColumn) {
                    return ({ getValue }) => {
                        const val = getValue();
                        if (val === null || val === undefined || val === '') return '';
                        const num = parseFloat(val);
                        if (isNaN(num)) return String(val);
                        return num.toLocaleString('en-US', { maximumFractionDigits: 4 });
                    };
                }
                // Default renderer for text columns
                return ({ getValue }) => {
                    const val = getValue();
                    if (val === null || val === undefined) return '';
                    return String(val);
                };
            };

            return {
                id: `col_${index}`,
                accessorKey: `col_${index}`,
                header: header || `Column ${index + 1}`,
                size: isLevelColumn ? 80 : 150,
                minSize: isLevelColumn ? 60 : 100,
                maxSize: isLevelColumn ? 100 : 500,
                cell: getCellRenderer(),
                filterFn: customFilterFn,
                meta: {
                    isNumeric: isNumericColumn,
                    isLevel: isLevelColumn,
                    headerName: header || `Column ${index + 1}`,
                },
            };
        });
    }, [bomData?.headers]);

    // Transform rows data for TanStack Table
    const data = useMemo(() => {
        if (!bomData?.rows) return [];

        return bomData.rows.map((row, rowIndex) => {
            const rowObj = { id: rowIndex };
            row.forEach((cell, colIndex) => {
                rowObj[`col_${colIndex}`] = cell;
            });
            return rowObj;
        });
    }, [bomData?.rows]);

    // Initialize table
    const table = useReactTable({
        data,
        columns,
        state: {
            globalFilter,
            columnVisibility,
            sorting,
            columnFilters,
            columnSizing,
        },
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnSizingChange: setColumnSizing,
        enableColumnFilters: true,
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 100,
            },
        },
    });

    // Handle delete from history
    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this from history?')) {
            try {
                await deleteBOMFromIndexedDB(id);
                const updatedHistory = await getAllBOMFromIndexedDB();
                setHistory(updatedHistory);

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
        if (!bomData) return;

        const headers = bomData.headers.join(',');
        const rows = bomData.rows.map(row =>
            row.map(cell => {
                const str = String(cell ?? '');
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(',')
        ).join('\n');

        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const filename = `${bomData.filename || 'bom_export'}_${new Date().toISOString().split('T')[0]}.csv`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);

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
                                {/* Column Visibility Dropdown */}
                                <div className="relative" ref={columnVisibilityRef}>
                                    <button
                                        onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                        </svg>
                                        Columns
                                    </button>

                                    {columnVisibilityOpen && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-80 overflow-y-auto">
                                            <div className="px-3 py-2 border-b border-gray-100">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={table.getIsAllColumnsVisible()}
                                                        onChange={table.getToggleAllColumnsVisibilityHandler()}
                                                        className="rounded border-gray-300 text-[oklch(12.9%_0.042_264.695)] focus:ring-[oklch(12.9%_0.042_264.695)]"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Toggle All</span>
                                                </label>
                                            </div>
                                            {table.getAllLeafColumns().map(column => (
                                                <div key={column.id} className="px-3 py-1.5">
                                                    <label className="flex items-center space-x-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={column.getIsVisible()}
                                                            onChange={column.getToggleVisibilityHandler()}
                                                            className="rounded border-gray-300 text-[oklch(12.9%_0.042_264.695)] focus:ring-[oklch(12.9%_0.042_264.695)]"
                                                        />
                                                        <span className="text-sm text-gray-600">{column.columnDef.header}</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Quick search..."
                                        value={globalFilter ?? ''}
                                        onChange={(e) => setGlobalFilter(e.target.value)}
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

                {/* Main Content - TanStack Table */}
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
                                        {table.getFilteredRowModel().rows.length.toLocaleString()} of {bomData.rowCount?.toLocaleString()} rows × {bomData.headers?.length} cols
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {formatDate(bomData.convertedAt)}
                                </span>
                            </div>

                            {/* Table Container */}
                            <div className="flex-1 overflow-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50/80 sticky top-0 z-10">
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th
                                                        key={header.id}
                                                        className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm select-none relative group/header"
                                                        style={{ width: header.getSize() }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div
                                                                className="flex items-center space-x-1 cursor-pointer hover:text-gray-900 transition-colors flex-1"
                                                                onClick={header.column.getToggleSortingHandler()}
                                                            >
                                                                <span>
                                                                    {header.isPlaceholder
                                                                        ? null
                                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                                </span>
                                                                {header.column.getIsSorted() && (
                                                                    <span className="text-[oklch(12.9%_0.042_264.695)]">
                                                                        {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Rich Column Filter */}
                                                            {header.column.getCanFilter() && (
                                                                <ColumnFilter
                                                                    column={header.column}
                                                                    columnName={header.column.columnDef.meta?.headerName || header.column.columnDef.header}
                                                                />
                                                            )}
                                                        </div>
                                                        {/* Resize Handle */}
                                                        {header.column.getCanResize() && (
                                                            <div
                                                                onMouseDown={header.getResizeHandler()}
                                                                onTouchStart={header.getResizeHandler()}
                                                                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none 
                                                                    ${header.column.getIsResizing()
                                                                        ? 'bg-[oklch(12.9%_0.042_264.695)]'
                                                                        : 'bg-transparent hover:bg-gray-300 group-hover/header:bg-gray-200'
                                                                    }`}
                                                            />
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {table.getRowModel().rows.map(row => (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-gray-50/50 transition-colors"
                                            >
                                                {row.getVisibleCells().map(cell => (
                                                    <td
                                                        key={cell.id}
                                                        className={`px-4 py-2.5 text-sm text-gray-700 ${cell.column.columnDef.meta?.isNumeric ? 'text-right tabular-nums' : ''
                                                            }`}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Rows per page:</span>
                                    <select
                                        value={table.getState().pagination.pageSize}
                                        onChange={e => table.setPageSize(Number(e.target.value))}
                                        className="px-2 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(12.9%_0.042_264.695)] focus:border-transparent"
                                    >
                                        {[50, 100, 200, 500, 1000].map(pageSize => (
                                            <option key={pageSize} value={pageSize}>
                                                {pageSize}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-600">
                                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                        <button
                                            onClick={() => table.setPageIndex(0)}
                                            disabled={!table.getCanPreviousPage()}
                                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7m0 0l7-7m-7 7h18" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                            disabled={!table.getCanNextPage()}
                                            className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BOMViewer;
