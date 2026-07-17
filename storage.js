/* ==========================================================
   ゆるねこ一言帖 Version1.0
   storage.js
   一言データの保存・読込・更新・削除
   ========================================================== */

(() => {
  "use strict";

  const DB_NAME = "yuruneko-hitokotocho";
  const DB_VERSION = 1;
  const STORE_NAME = "entries";
  const FALLBACK_KEY = "yuruneko-hitokotocho-entries-v1";

  let databasePromise = null;

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeThemes(themes) {
    if (!Array.isArray(themes)) return [];

    return [...new Set(
      themes
        .map((theme) => String(theme || "").trim())
        .filter(Boolean)
    )];
  }

  function normalizeEntry(entry = {}) {
    const now = new Date().toISOString();

    return {
      id: String(entry.id || createId()),
      date: String(entry.date || "").trim(),
      cardName: String(entry.cardName || "").trim(),
      text: String(entry.text || "").trim(),
      themes: normalizeThemes(entry.themes),
      memo: String(entry.memo || "").trim(),
      imageData: String(entry.imageData || ""),
      favorite: Boolean(entry.favorite),
      createdAt: String(entry.createdAt || now),
      updatedAt: now
    };
  }

  function sortEntries(entries) {
    return [...entries].sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare !== 0) return dateCompare;

      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is not available."));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("date", "date", { unique: false });
          store.createIndex("favorite", "favorite", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        db.onversionchange = () => {
          db.close();
          databasePromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        databasePromise = null;
        reject(request.error || new Error("データベースを開けませんでした。"));
      };

      request.onblocked = () => {
        databasePromise = null;
        reject(new Error("データベースの更新がブロックされました。"));
      };
    });

    return databasePromise;
  }

  function runTransaction(mode, action) {
    return openDatabase().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);

        let result;

        try {
          result = action(store);
        } catch (error) {
          reject(error);
          return;
        }

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => {
          reject(transaction.error || new Error("保存処理に失敗しました。"));
        };
        transaction.onabort = () => {
          reject(transaction.error || new Error("保存処理が中断されました。"));
        };
      });
    });
  }

  function readFallback() {
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("予備保存を読み込めませんでした。", error);
      return [];
    }
  }

  function writeFallback(entries) {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(sortEntries(entries)));
    } catch (error) {
      console.warn("予備保存を書き込めませんでした。", error);
    }
  }

  async function syncFallbackFromDatabase() {
    try {
      const entries = await getAllFromDatabase();
      writeFallback(entries);
    } catch (error) {
      console.warn("予備保存の同期に失敗しました。", error);
    }
  }

  function getAllFromDatabase() {
    return openDatabase().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(sortEntries(request.result || []));
        request.onerror = () => {
          reject(request.error || new Error("一言を読み込めませんでした。"));
        };
      });
    });
  }

  async function getAll() {
    try {
      const entries = await getAllFromDatabase();

      if (entries.length > 0) {
        writeFallback(entries);
        return entries;
      }

      const fallbackEntries = readFallback();

      if (fallbackEntries.length > 0) {
        await replaceAll(fallbackEntries);
        return sortEntries(fallbackEntries);
      }

      return [];
    } catch (error) {
      console.warn("IndexedDBから読み込めないため予備保存を使います。", error);
      return sortEntries(readFallback());
    }
  }

  async function getById(id) {
    const safeId = String(id || "");

    if (!safeId) return null;

    try {
      const db = await openDatabase();

      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(safeId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          reject(request.error || new Error("一言を読み込めませんでした。"));
        };
      });
    } catch (error) {
      return readFallback().find((entry) => entry.id === safeId) || null;
    }
  }

  async function save(entry) {
    const normalized = normalizeEntry(entry);

    if (!normalized.date) {
      throw new Error("日付を入力してください。");
    }

    if (!normalized.cardName) {
      throw new Error("タロットカード名を入力してください。");
    }

    if (!normalized.text) {
      throw new Error("ゆるねこ一言を入力してください。");
    }

    const existing = await getById(normalized.id);

    if (existing?.createdAt) {
      normalized.createdAt = existing.createdAt;
    }

    try {
      await runTransaction("readwrite", (store) => {
        store.put(normalized);
      });

      await syncFallbackFromDatabase();
      return normalized;
    } catch (error) {
      const entries = readFallback();
      const index = entries.findIndex((item) => item.id === normalized.id);

      if (index >= 0) {
        entries[index] = normalized;
      } else {
        entries.push(normalized);
      }

      writeFallback(entries);
      return normalized;
    }
  }

  async function remove(id) {
    const safeId = String(id || "");
    if (!safeId) return false;

    try {
      await runTransaction("readwrite", (store) => {
        store.delete(safeId);
      });

      await syncFallbackFromDatabase();
      return true;
    } catch (error) {
      const entries = readFallback().filter((entry) => entry.id !== safeId);
      writeFallback(entries);
      return true;
    }
  }

  async function clearAll() {
    try {
      await runTransaction("readwrite", (store) => {
        store.clear();
      });
    } catch (error) {
      console.warn("IndexedDBの全削除に失敗しました。", error);
    }

    try {
      localStorage.removeItem(FALLBACK_KEY);
    } catch (error) {
      console.warn("予備保存の全削除に失敗しました。", error);
    }

    return true;
  }

  async function replaceAll(entries) {
    const normalizedEntries = Array.isArray(entries)
      ? entries.map((entry) => normalizeEntry(entry))
      : [];

    try {
      const db = await openDatabase();

      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        store.clear();

        normalizedEntries.forEach((entry) => {
          store.put(entry);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          reject(transaction.error || new Error("一言を戻せませんでした。"));
        };
        transaction.onabort = () => {
          reject(transaction.error || new Error("復元処理が中断されました。"));
        };
      });
    } catch (error) {
      console.warn("IndexedDBへ復元できないため予備保存だけ更新します。", error);
    }

    writeFallback(normalizedEntries);
    return sortEntries(normalizedEntries);
  }

  async function count() {
    const entries = await getAll();
    return entries.length;
  }

  async function toggleFavorite(id) {
    const entry = await getById(id);

    if (!entry) {
      throw new Error("一言が見つかりません。");
    }

    return save({
      ...entry,
      favorite: !entry.favorite
    });
  }

  window.YurunekoStorage = Object.freeze({
    getAll,
    getById,
    save,
    remove,
    clearAll,
    replaceAll,
    count,
    toggleFavorite,
    normalizeEntry
  });
})();
