// ============================================================
// 本地数据存储层（IndexedDB）
//  - items   : 各模块业务记录（按 store 区分）
//  - files   : 上传的文件二进制（Blob），支持图片/文档在线预览与下载
//  - calendar: 首页日历个人工作事项（按日期存储）
// 权限与工作台整体一致（本地同源存储）。
// ============================================================
window.DB = (function () {
  const DB_NAME = 'liliWorkbench';
  const DB_VERSION = 1;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('items')) {
          const s = db.createObjectStore('items', { keyPath: 'id' });
          s.createIndex('store', 'store', { unique: false });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('calendar')) {
          db.createObjectStore('calendar', { keyPath: 'date' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function prom(req) {
    return new Promise(function (res, rej) {
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }

  async function store(name, mode) {
    const db = await open();
    return db.transaction(name, mode).objectStore(name);
  }

  // ---------- 业务记录 items ----------
  async function putItem(item) {
    const s = await store('items', 'readwrite');
    return prom(s.put(item));
  }
  async function getItems(storeName) {
    const s = await store('items', 'readonly');
    const idx = s.index('store');
    return prom(idx.getAll(storeName)) || [];
  }
  async function deleteItem(id) {
    const s = await store('items', 'readwrite');
    return prom(s.delete(id));
  }

  // ---------- 文件 files ----------
  async function putFile(f) {
    const s = await store('files', 'readwrite');
    return prom(s.put(f));
  }
  async function getFile(id) {
    const s = await store('files', 'readonly');
    return prom(s.get(id));
  }
  async function deleteFile(id) {
    const s = await store('files', 'readwrite');
    return prom(s.delete(id));
  }

  // ---------- 日历个人事项 calendar ----------
  async function putDay(day) {
    const s = await store('calendar', 'readwrite');
    return prom(s.put(day));
  }
  async function getDay(dateStr) {
    const s = await store('calendar', 'readonly');
    return prom(s.get(dateStr));
  }
  async function getAllDays() {
    const s = await store('calendar', 'readonly');
    return prom(s.getAll()) || [];
  }

  // ---------- 工具 ----------
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return {
    open: open, putItem: putItem, getItems: getItems, deleteItem: deleteItem,
    putFile: putFile, getFile: getFile, deleteFile: deleteFile,
    putDay: putDay, getDay: getDay, getAllDays: getAllDays, genId: genId
  };
})();
