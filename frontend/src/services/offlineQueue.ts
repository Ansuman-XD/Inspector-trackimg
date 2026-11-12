/**
 * IndexedDB Offline Queue for Inspector Field Submissions.
 * Supports queuing stage submissions (with binary blobs & idempotency keys)
 * and syncing when connectivity returns.
 */

import { apiClient } from "./apiClient";

const DB_NAME = "railtrack_offline_db";
const DB_VERSION = 1;
const QUEUE_STORE = "stage_submissions";

export interface QueuedStageSubmission {
  id: string; // Idempotency key
  taskId: string;
  type: "check_in" | "check_out";
  lat: number;
  lng: number;
  accuracy: number;
  deviceTime: string;
  photoBlob?: Blob;
  status: "queued" | "syncing" | "accepted" | "rejected";
  rejectReason?: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported on this device"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const offlineQueue = {
  async queueSubmission(submission: QueuedStageSubmission): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).put(submission);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAll(): Promise<QueuedStageSubmission[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async update(id: string, patch: Partial<QueuedStageSubmission>): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          store.put({ ...req.result, ...patch });
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Syncs all queued submissions with the backend API.
   */
  async syncAll(onProgress?: (submission: QueuedStageSubmission) => void): Promise<{
    synced: number;
    failed: number;
  }> {
    const list = await offlineQueue.getAll();
    const queuedItems = list.filter((i) => i.status === "queued" || i.status === "rejected");

    let synced = 0;
    let failed = 0;

    for (const item of queuedItems) {
      await offlineQueue.update(item.id, { status: "syncing" });
      onProgress?.({ ...item, status: "syncing" });

      try {
        const formData = new FormData();
        formData.append("type", item.type);
        formData.append("lat", String(item.lat));
        formData.append("lng", String(item.lng));
        formData.append("accuracy", String(item.accuracy));
        formData.append("deviceTime", item.deviceTime);
        formData.append("idempotencyKey", item.id);

        if (item.photoBlob) {
          formData.append("photo", item.photoBlob, `${item.type}.jpg`);
        }

        await apiClient(`/tasks/${item.taskId}/stages`, {
          method: "POST",
          body: formData,
        });

        await offlineQueue.remove(item.id);
        synced++;
      } catch (err: any) {
        failed++;
        console.error("❌ Stage sync to backend failed:", err);
        const reason = err?.message || "Sync failed";
        try {
          const { toast } = await import("sonner");
          toast.error(`Check-in/out submission failed: ${reason}`);
        } catch {}
        await offlineQueue.update(item.id, {
          status: "rejected",
          rejectReason: reason,
        });
        onProgress?.({
          ...item,
          status: "rejected",
          rejectReason: reason,
        });
      }
    }

    return { synced, failed };
  },
};

// Automatic sync trigger when coming online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineQueue.syncAll().catch(() => {});
  });
}
