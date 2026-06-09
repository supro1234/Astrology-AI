/**
 * predictionDB.js — IndexedDB-based prediction tracking
 *
 * Uses browser-native IndexedDB (~50MB quota, survives localStorage clears,
 * persists across sessions). No backend required.
 */

const DB_NAME = 'vedastro_predictions';
const DB_VERSION = 1;

const STORES = {
  PREDICTIONS: 'predictions',
  OUTCOMES: 'outcomes',
};

// ─── Open / Init DB ────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Predictions store
      if (!db.objectStoreNames.contains(STORES.PREDICTIONS)) {
        const store = db.createObjectStore(STORES.PREDICTIONS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // Outcomes store
      if (!db.objectStoreNames.contains(STORES.OUTCOMES)) {
        db.createObjectStore(STORES.OUTCOMES, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Helper: run an IDB transaction ───────────────────────────────────────────
async function txn(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = callback(store);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Save a new prediction ─────────────────────────────────────────────────────
/**
 * @param {{ type, text, confidence, factors, birthSnapshot }} prediction
 * @returns {number} id of saved prediction
 */
export async function logPrediction({ type, text, confidence = 0.7, factors = [], birthSnapshot = null }) {
  return txn(STORES.PREDICTIONS, 'readwrite', (store) =>
    store.add({
      type,           // 'career' | 'love' | 'health' | 'finance' | 'family' | 'spirituality'
      text,           // prediction text
      confidence,     // 0–1 float
      factors,        // ['Saturn in 10th', 'Jupiter transit', ...]
      birthSnapshot,  // { ascendant, sun, moon, dasha } at time of prediction
      status: 'pending',        // 'pending' | 'accurate' | 'inaccurate'
      outcomeText: null,
      outcomeDate: null,
      createdAt: Date.now(),
    })
  );
}

// ─── Update outcome for a prediction ─────────────────────────────────────────
/**
 * @param {number} id - prediction id
 * @param {'accurate'|'inaccurate'} status
 * @param {string} outcomeText
 */
export async function logOutcome(id, status, outcomeText = '') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PREDICTIONS, 'readwrite');
    const store = tx.objectStore(STORES.PREDICTIONS);

    const getReq = store.get(id);
    getReq.onsuccess = (e) => {
      const record = e.target.result;
      if (!record) return reject(new Error('Prediction not found'));
      record.status = status;
      record.outcomeText = outcomeText;
      record.outcomeDate = Date.now();
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(record);
      putReq.onerror = (e2) => reject(e2.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

// ─── Get all predictions ──────────────────────────────────────────────────────
export async function getAllPredictions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PREDICTIONS, 'readonly');
    const req = tx.objectStore(STORES.PREDICTIONS).getAll();
    req.onsuccess = (e) => resolve(e.target.result.sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Delete a prediction ──────────────────────────────────────────────────────
export async function deletePrediction(id) {
  return txn(STORES.PREDICTIONS, 'readwrite', (store) => store.delete(id));
}

// ─── Get accuracy stats ───────────────────────────────────────────────────────
/**
 * @returns {{ total, pending, accurate, inaccurate, accuracy, byType }}
 */
export async function getAccuracyStats() {
  const all = await getAllPredictions();
  const resolved = all.filter(p => p.status !== 'pending');
  const accurate = resolved.filter(p => p.status === 'accurate').length;

  const byType = {};
  const types = ['career', 'love', 'health', 'finance', 'family', 'spirituality'];
  types.forEach(type => {
    const typeAll = all.filter(p => p.type === type);
    const typeResolved = typeAll.filter(p => p.status !== 'pending');
    const typeAccurate = typeResolved.filter(p => p.status === 'accurate').length;
    byType[type] = {
      total: typeAll.length,
      resolved: typeResolved.length,
      accurate: typeAccurate,
      accuracy: typeResolved.length > 0
        ? Math.round((typeAccurate / typeResolved.length) * 100)
        : null,
    };
  });

  return {
    total: all.length,
    pending: all.filter(p => p.status === 'pending').length,
    accurate,
    inaccurate: resolved.length - accurate,
    accuracy: resolved.length > 0
      ? Math.round((accurate / resolved.length) * 100)
      : null,
    byType,
  };
}

// ─── Export all predictions as JSON ───────────────────────────────────────────
export async function exportPredictions() {
  const all = await getAllPredictions();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vedastro_predictions_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Clear all predictions ─────────────────────────────────────────────────────
export async function clearAllPredictions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PREDICTIONS, 'readwrite');
    const req = tx.objectStore(STORES.PREDICTIONS).clear();
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}
