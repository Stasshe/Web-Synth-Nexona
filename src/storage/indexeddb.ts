/**
 * IndexedDB utilities for persisting synth state
 */

const DB_NAME = "web-synth-nexona";
const DB_VERSION = 1;
const STORE_NAME = "synth-patches";
const INITIAL_STATE_KEY = "initial-state";

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save state to IndexedDB
 */
export async function saveState(state: unknown): Promise<void> {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(state, INITIAL_STATE_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Load state from IndexedDB
 */
export async function loadState(): Promise<unknown | null> {
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(INITIAL_STATE_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Clear IndexedDB
 */
export async function clearState(): Promise<void> {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(INITIAL_STATE_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
