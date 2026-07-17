/* ==========================================================
   ゆるねこ一言帖 Version1.0
   backup.js
   控えの書き出し・復元
   ========================================================== */

(() => {
  "use strict";

  const BACKUP_VERSION = 1;
  const LAST_BACKUP_KEY = "yuruneko-last-backup-date";

  const exportButton = document.getElementById("exportBackupButton");
  const importInput = document.getElementById("importBackupInput");
  const lastBackupDate = document.getElementById("lastBackupDate");
  const backupEntryCount = document.getElementById("backupEntryCount");

  function formatDateTime(date = new Date()) {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function createFileName(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());

    return `yuruneko-backup-${year}${month}${day}-${hour}${minute}.json`;
  }

  function showMessage(title, message) {
    const dialog = document.getElementById("appDialog");
    const dialogTitle = document.getElementById("dialogTitle");
    const dialogMessage = document.getElementById("dialogMessage");
    const dialogActions = document.getElementById("dialogActions");

    if (!dialog || typeof dialog.showModal !== "function") {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogActions.innerHTML = "";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "primary-button";
    closeButton.textContent = "閉じる";
    closeButton.addEventListener("click", () => dialog.close());

    dialogActions.appendChild(closeButton);
    dialog.showModal();
  }

  function showConfirm(title, message) {
    return new Promise((resolve) => {
      const dialog = document.getElementById("appDialog");
      const dialogTitle = document.getElementById("dialogTitle");
      const dialogMessage = document.getElementById("dialogMessage");
      const dialogActions = document.getElementById("dialogActions");

      if (!dialog || typeof dialog.showModal !== "function") {
        resolve(window.confirm(`${title}\n\n${message}`));
        return;
      }

      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogActions.innerHTML = "";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "secondary-button";
      cancelButton.textContent = "やめる";

      const confirmButton = document.createElement("button");
      confirmButton.type = "button";
      confirmButton.className = "primary-button";
      confirmButton.textContent = "戻す";

      const finish = (result) => {
        if (dialog.open) dialog.close();
        resolve(result);
      };

      cancelButton.addEventListener("click", () => finish(false));
      confirmButton.addEventListener("click", () => finish(true));

      dialog.addEventListener(
        "cancel",
        (event) => {
          event.preventDefault();
          finish(false);
        },
        { once: true }
      );

      dialogActions.append(cancelButton, confirmButton);
      dialog.showModal();
    });
  }

  function saveLastBackupDate(isoDate) {
    try {
      localStorage.setItem(LAST_BACKUP_KEY, isoDate);
    } catch (error) {
      console.warn("最後の控え日時を保存できませんでした。", error);
    }
  }

  function getLastBackupDate() {
    try {
      return localStorage.getItem(LAST_BACKUP_KEY);
    } catch (error) {
      return null;
    }
  }

  async function updateBackupStatus() {
    if (!window.YurunekoStorage) return;

    try {
      const count = await window.YurunekoStorage.count();

      if (backupEntryCount) {
        backupEntryCount.textContent = `${count}冊`;
      }

      const savedDate = getLastBackupDate();

      if (lastBackupDate) {
        lastBackupDate.textContent = savedDate
          ? formatDateTime(new Date(savedDate))
          : "まだありません";
      }
    } catch (error) {
      console.warn("控え画面の件数を更新できませんでした。", error);
    }
  }

  function validateBackup(data) {
    if (!data || typeof data !== "object") {
      throw new Error("控えファイルの形式が正しくありません。");
    }

    if (!Array.isArray(data.entries)) {
      throw new Error("一言データが見つかりません。");
    }

    return true;
  }

  async function exportBackup() {
    if (!window.YurunekoStorage) {
      showMessage("書き出せませんでした", "保存機能を読み込めませんでした。");
      return;
    }

    try {
      exportButton.disabled = true;
      exportButton.textContent = "控えを作っています…";

      const entries = await window.YurunekoStorage.getAll();
      const now = new Date();

      const backupData = {
        app: "ゆるねこ一言帖",
        version: BACKUP_VERSION,
        exportedAt: now.toISOString(),
        count: entries.length,
        entries
      };

      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], {
        type: "application/json;charset=utf-8"
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = createFileName(now);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      saveLastBackupDate(now.toISOString());
      await updateBackupStatus();

      showMessage(
        "控えを作りました",
        `${entries.length}冊ぶんを書き出しました。\nファイルアプリなど、図書館の外に置いておいてね。`
      );
    } catch (error) {
      console.error(error);
      showMessage(
        "書き出せませんでした",
        error?.message || "もう一度試してみてください。"
      );
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = "控えを書き出す";
    }
  }

  async function readBackupFile(file) {
    const text = await file.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error("JSONファイルとして読み込めませんでした。");
    }

    validateBackup(data);
    return data;
  }

  async function importBackup(file) {
    if (!file) return;

    if (!window.YurunekoStorage) {
      showMessage("戻せませんでした", "保存機能を読み込めませんでした。");
      return;
    }

    try {
      const backupData = await readBackupFile(file);
      const currentEntries = await window.YurunekoStorage.getAll();

      const accepted = await showConfirm(
        "控えから戻しますか？",
        `今の本棚は${currentEntries.length}冊です。\n選んだ控えには${backupData.entries.length}冊あります。\n\n戻すと、今の本棚は控えの内容に置き換わります。`
      );

      if (!accepted) return;

      await window.YurunekoStorage.replaceAll(backupData.entries);
      await updateBackupStatus();

      document.dispatchEvent(
        new CustomEvent("yuruneko:entries-changed", {
          detail: {
            reason: "restore",
            count: backupData.entries.length
          }
        })
      );

      showMessage(
        "本棚に戻しました",
        `${backupData.entries.length}冊ぶんを、控えから戻しました。`
      );
    } catch (error) {
      console.error(error);
      showMessage(
        "戻せませんでした",
        error?.message || "控えファイルを確認してください。"
      );
    } finally {
      importInput.value = "";
    }
  }

  exportButton?.addEventListener("click", exportBackup);

  importInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    importBackup(file);
  });

  document.addEventListener("yuruneko:entries-changed", updateBackupStatus);

  document.addEventListener("DOMContentLoaded", updateBackupStatus);

  window.YurunekoBackup = Object.freeze({
    exportBackup,
    importBackup,
    updateBackupStatus
  });
})();
