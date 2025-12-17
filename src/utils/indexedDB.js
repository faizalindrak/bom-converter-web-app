// IndexedDB utilities for storing large BOM datasets
// IndexedDB can store hundreds of MB to GB of data (vs localStorage's 5MB limit)

const DB_NAME = 'BOMConverterDB';
const DB_VERSION = 1;
const STORE_NAME = 'bomResults';

/**
 * Open/create the IndexedDB database
 */
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('convertedAt', 'convertedAt', { unique: false });
            }
        };
    });
};

/**
 * Save BOM result to IndexedDB
 * @param {Object} bomData - The converted BOM data with headers and rows
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} The saved result
 */
export const saveBOMToIndexedDB = async (bomData, filename) => {
    const db = await openDB();

    const result = {
        id: Date.now(),
        filename,
        headers: bomData.headers,
        rows: bomData.rows,
        convertedAt: new Date().toISOString(),
        rowCount: bomData.rows.length
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put(result);

        request.onsuccess = () => {
            // Clean up old entries (keep last 10)
            cleanupOldEntries(db).then(() => {
                resolve(result);
            });
        };

        request.onerror = () => {
            reject(new Error('Failed to save BOM data'));
        };

        transaction.oncomplete = () => {
            db.close();
        };
    });
};

/**
 * Get the latest BOM result from IndexedDB
 * @returns {Promise<Object|null>}
 */
export const getLatestBOMFromIndexedDB = async () => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('convertedAt');

        // Get all and return the most recent
        const request = index.openCursor(null, 'prev');

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                resolve(cursor.value);
            } else {
                resolve(null);
            }
        };

        request.onerror = () => {
            reject(new Error('Failed to get BOM data'));
        };

        transaction.oncomplete = () => {
            db.close();
        };
    });
};

/**
 * Get all BOM results (history) from IndexedDB
 * @returns {Promise<Array>}
 */
export const getAllBOMFromIndexedDB = async () => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('convertedAt');

        const results = [];
        const request = index.openCursor(null, 'prev');

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // For history, only include metadata to keep it lightweight
                const { id, filename, convertedAt, rowCount, headers } = cursor.value;
                results.push({ id, filename, convertedAt, rowCount, columnCount: headers?.length || 0 });
                cursor.continue();
            } else {
                resolve(results);
            }
        };

        request.onerror = () => {
            reject(new Error('Failed to get BOM history'));
        };

        transaction.oncomplete = () => {
            db.close();
        };
    });
};

/**
 * Get a specific BOM result by ID
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export const getBOMByIdFromIndexedDB = async (id) => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(parseInt(id));

        request.onsuccess = () => {
            resolve(request.result || null);
        };

        request.onerror = () => {
            reject(new Error('Failed to get BOM data'));
        };

        transaction.oncomplete = () => {
            db.close();
        };
    });
};

/**
 * Delete a BOM result by ID
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteBOMFromIndexedDB = async (id) => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.delete(parseInt(id));

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(new Error('Failed to delete BOM data'));
        };

        transaction.oncomplete = () => {
            db.close();
        };
    });
};

/**
 * Clear all BOM data
 * @returns {Promise<void>}
 */
export const clearAllBOMFromIndexedDB = async () => {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.clear();

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(new Error('Failed to clear BOM data'));
        };

        transaction.oncomplete = () => {
            db.close();
        };
    });
};

/**
 * Clean up old entries, keeping only the last 10
 */
const cleanupOldEntries = async (db) => {
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('convertedAt');

        const allIds = [];
        const request = index.openCursor(null, 'prev');

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                allIds.push(cursor.value.id);
                cursor.continue();
            } else {
                // Delete entries beyond the 10th
                if (allIds.length > 10) {
                    const idsToDelete = allIds.slice(10);
                    idsToDelete.forEach(id => {
                        store.delete(id);
                    });
                }
                resolve();
            }
        };

        request.onerror = () => {
            resolve(); // Don't fail on cleanup errors
        };
    });
};
