// LocalStorage utilities for BOM data persistence

const BOM_STORAGE_KEY = 'bom_conversion_result';
const BOM_HISTORY_KEY = 'bom_conversion_history';

/**
 * Save BOM conversion result to localStorage
 * Only stores full data for current result; history only keeps metadata
 * @param {Object} bomData - The converted BOM data with headers and rows
 * @param {string} filename - Original filename
 */
export const saveBOMResult = (bomData, filename) => {
    try {
        const id = Date.now();
        const result = {
            id,
            filename,
            headers: bomData.headers,
            rows: bomData.rows,
            convertedAt: new Date().toISOString(),
            rowCount: bomData.rows.length
        };

        // Save current result with full data
        localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(result));

        // Update history with metadata only (no rows/headers to save space)
        const historyEntry = {
            id,
            filename,
            convertedAt: result.convertedAt,
            rowCount: result.rowCount,
            columnCount: bomData.headers.length
        };

        const history = getBOMHistory();
        // Keep only last 10 entries, remove duplicates
        const updatedHistory = [historyEntry, ...history.filter(h => h.id !== id)].slice(0, 10);

        try {
            localStorage.setItem(BOM_HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (historyError) {
            // If history save fails, just keep the current result
            console.warn('Could not save to history, clearing old history:', historyError);
            localStorage.setItem(BOM_HISTORY_KEY, JSON.stringify([historyEntry]));
        }

        return result;
    } catch (error) {
        console.error('Failed to save BOM result to localStorage:', error);
        // Try to clear old data and save again
        try {
            localStorage.removeItem(BOM_HISTORY_KEY);
            localStorage.removeItem(BOM_STORAGE_KEY);
            const result = {
                id: Date.now(),
                filename,
                headers: bomData.headers,
                rows: bomData.rows,
                convertedAt: new Date().toISOString(),
                rowCount: bomData.rows.length
            };
            localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(result));
            return result;
        } catch (retryError) {
            console.error('Failed to save even after clearing:', retryError);
            // Return the result anyway so the app can still function
            return {
                id: Date.now(),
                filename,
                headers: bomData.headers,
                rows: bomData.rows,
                convertedAt: new Date().toISOString(),
                rowCount: bomData.rows.length
            };
        }
    }
};

/**
 * Get the most recent BOM conversion result
 * @returns {Object|null} The saved BOM result or null
 */
export const getLatestBOMResult = () => {
    try {
        const stored = localStorage.getItem(BOM_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Failed to get BOM result from localStorage:', error);
        return null;
    }
};

/**
 * Get BOM conversion history
 * @returns {Array} Array of saved BOM results
 */
export const getBOMHistory = () => {
    try {
        const stored = localStorage.getItem(BOM_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to get BOM history from localStorage:', error);
        return [];
    }
};

/**
 * Get a specific BOM result by ID
 * @param {number} id - The result ID
 * @returns {Object|null} The BOM result or null
 */
export const getBOMResultById = (id) => {
    try {
        const history = getBOMHistory();
        return history.find(h => h.id === parseInt(id)) || null;
    } catch (error) {
        console.error('Failed to get BOM result by ID:', error);
        return null;
    }
};

/**
 * Clear all BOM data from localStorage
 */
export const clearBOMData = () => {
    try {
        localStorage.removeItem(BOM_STORAGE_KEY);
        localStorage.removeItem(BOM_HISTORY_KEY);
    } catch (error) {
        console.error('Failed to clear BOM data:', error);
    }
};

/**
 * Delete a specific BOM result from history
 * @param {number} id - The result ID to delete
 */
export const deleteBOMResult = (id) => {
    try {
        const history = getBOMHistory();
        const updatedHistory = history.filter(h => h.id !== parseInt(id));
        localStorage.setItem(BOM_HISTORY_KEY, JSON.stringify(updatedHistory));

        // If deleted result was the latest, update latest
        const latest = getLatestBOMResult();
        if (latest && latest.id === parseInt(id)) {
            if (updatedHistory.length > 0) {
                localStorage.setItem(BOM_STORAGE_KEY, JSON.stringify(updatedHistory[0]));
            } else {
                localStorage.removeItem(BOM_STORAGE_KEY);
            }
        }
    } catch (error) {
        console.error('Failed to delete BOM result:', error);
    }
};
