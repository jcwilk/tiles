/**
 * IndexedDB wrapper for persisting shader objects.
 * Saves, retrieves, and persists generated shader objects locally.
 */
import type { ShaderObject } from "./types.js";

export interface ShaderStorage {
  getAll(): Promise<ShaderObject[]>;
  add(shader: ShaderObject): Promise<void>;
  delete(id: string): Promise<void>;
}

const DB_NAME = "tiles-db";
const DB_VERSION = 1;
const STORE_NAME = "shaders";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export function createIndexedDBStorage(): ShaderStorage {
  return {
    async getAll(): Promise<ShaderObject[]> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
        request.onsuccess = () => {
          db.close();
          resolve(request.result ?? []);
        };
      });
    },

    async add(shader: ShaderObject): Promise<void> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(shader);
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
        request.onsuccess = () => {
          db.close();
          resolve();
        };
      });
    },

    async delete(id: string): Promise<void> {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
        request.onsuccess = () => {
          db.close();
          resolve();
        };
      });
    },
  };
}

/**
 * In-memory storage for tests. Does not require IndexedDB.
 */
export function createInMemoryStorage(): ShaderStorage {
  const store = new Map<string, ShaderObject>();
  return {
    async getAll(): Promise<ShaderObject[]> {
      return Array.from(store.values());
    },
    async add(shader: ShaderObject): Promise<void> {
      store.set(shader.id, shader);
    },
    async delete(id: string): Promise<void> {
      store.delete(id);
    },
  };
}
