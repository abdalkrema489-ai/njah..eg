// src/utils/offlineStorage.js
import { openDB } from 'idb';

const DB_NAME = 'najah_offline_db';
const STORE_NAME = 'sync_queue';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveToQueue(action) {
  const db = await initDB();
  await db.add(STORE_NAME, {
    ...action,
    timestamp: Date.now()
  });
}

export async function getQueue() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function removeFromQueue(id) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}

export async function clearQueue() {
  const db = await initDB();
  await db.clear(STORE_NAME);
}
