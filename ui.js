/* ==========================================================
   ゆるねこ一言帖 Version1.1
   ui.js
   入力・表示・本棚・読書席の連携
   ========================================================== */

(() => {
  "use strict";

  const entryForm = document.getElementById("entryForm");
  const entryDate = document.getElementById("entryDate");
  const entryCardName = document.getElementById("entryCardName");
  const entryText = document.getElementById("entryText");
  const entryMemo = document.getElementById("entryMemo");
  const entryNewTheme = document.getElementById("entryNewTheme");
  const entryThemeOptions = document.getElementById("entryThemeOptions");
  const entryImage = document.getElementById("entryImage");
  const entryImagePreview = document.getElementById("entryImagePreview");

  const todayCardText = document.getElementById("todayCardText");
  const todayCardName = document.getElementById("todayCardName");
  const todayCardDate = document.getElementById("todayCardDate");
  const todayCardImage = document.getElementById("todayCardImage");
  const todayCardPlaceholder = document.getElementById("todayCardPlaceholder");

  const bookshelfList = document.getElementById("bookshelfList");
  const bookshelfCount = document.getElementById("bookshelfCount");
  const bookshelfEmpty = document.getElementById("bookshelfEmpty");
  const bookshelfSearch = document.getElementById("bookshelfSearch");
  const themeChips = document.getElementById("themeChips");
  const sortButton = document.getElementById("sortButton");

  const readingTitle = document.getElementById("readingTitle");
  const readingCardName = document.getElementById("readingCardName");
  const readingDate = document.getElementById("readingDate");
  const readingMemo = document.getElementById("readingMemo");
  const readingThemes = document.getElementById("readingThemes");
  const readingImage = document.getElementById("readingImage");
  const readingPlaceholder = document.getElementById("readingPlaceholder");

  let entries = [];
  let selectedTheme = "all";
  let sortNewestFirst = true;
  let selectedImageData = "";
  let currentReadingId = "";

  function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showMessage(title, message, onClose = null) {
    const dialog = document.getElementById("appDialog");
    const dialogTitle = document.getElementById("dialogTitle");
    const dialogMessage = document.getElementById("dialogMessage");
    const dialogActions = document.getElementById("dialogActions");

    if (!dialog || typeof dialog.showModal !== "function") {
      window.alert(`${title}\n\n${message}`);
      if (typeof onClose === "function") onClose();
      return;
    }

    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogActions.innerHTML = "";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "primary-button";
    closeButton.textContent = "閉じる";
    closeButton.addEventListener("click", () => {
      dialog.close();
      if (typeof onClose === "function") onClose();
    });

    dialogActions.appendChild(closeButton);
    dialog.showModal();
  }

  function getSelectedThemes() {
    const selected = Array.from(
      entryThemeOptions?.querySelectorAll('input[type="checkbox"]:checked') || []
    ).map((input) => input.value.trim());

    const newTheme = entryNewTheme?.value.trim();

    if (newTheme) {
      selected.push(newTheme);
    }

    return [...new Set(selected.filter(Boolean))];
  }

  function collectAllThemes() {
    return [...new Set(
      entries.flatMap((entry) => Array.isArray(entry.themes) ? entry.themes : [])
    )].sort((a, b) => a.localeCompare(b, "ja"));
  }

  function renderThemeOptions() {
    if (!entryThemeOptions) return;

    const themes = collectAllThemes();

    entryThemeOptions.innerHTML = themes.map((theme) => `
      <label class="theme-option">
        <input type="checkbox" value="${escapeHtml(theme)}">
        <span>${escapeHtml(theme)}</span>
      </label>
    `).join("");
  }

  function renderThemeChips() {
    if (!themeChips) return;

    const themes = collectAllThemes();

    themeChips.innerHTML = `
      <button
        class="theme-chip ${selectedTheme === "all" ? "is-active" : ""}"
        type="button"
        data-theme="all"
      >
        すべて
      </button>
      ${themes.map((theme) => `
        <button
          class="theme-chip ${selectedTheme === theme ? "is-active" : ""}"
          type="button"
          data-theme="${escapeHtml(theme)}"
        >
          ${escapeHtml(theme)}
        </button>
      `).join("")}
    `;
  }

  function getFilteredEntries() {
    const query = bookshelfSearch?.value.trim().toLowerCase() || "";

    const filtered = entries.filter((entry) => {
      const matchesTheme =
        selectedTheme === "all" ||
        (Array.isArray(entry.themes) && entry.themes.includes(selectedTheme));

      if (!matchesTheme) return false;

      if (!query) return true;

      const haystack = [
        entry.text,
        entry.cardName,
        entry.date,
        entry.memo,
        ...(entry.themes || [])
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    return [...filtered].sort((a, b) => {
      const direction = sortNewestFirst ? -1 : 1;
      return String(a.date || "").localeCompare(String(b.date || "")) * direction;
    });
  }

  function renderBookshelf() {
    if (!bookshelfList) return;

    const visibleEntries = getFilteredEntries();

    if (bookshelfCount) {
      bookshelfCount.textContent = `${visibleEntries.length}冊`;
    }

    if (bookshelfEmpty) {
      bookshelfEmpty.hidden = visibleEntries.length !== 0;
    }

    bookshelfList.innerHTML = visibleEntries.map((entry) => `
      <article class="book-card">
        <div class="book-card__photo">
          ${
            entry.imageData
              ? `<img src="${entry.imageData}" alt="ねこ写真">`
              : `<div class="photo-placeholder"><span aria-hidden="true">🐾</span></div>`
          }
        </div>

        <div class="book-card__body">
          <p class="book-card__date">${escapeHtml(formatDate(entry.date))}</p>
          <h3 class="book-card__text">${escapeHtml(entry.text)}</h3>

          <div class="book-card__meta">
            <span>${escapeHtml(entry.cardName || "カード名なし")}</span>
            ${(entry.themes || []).map((theme) => `<span>${escapeHtml(theme)}</span>`).join("")}
          </div>

          <button
            class="book-card__open"
            type="button"
            data-read-entry="${escapeHtml(entry.id)}"
          >
            読書席で読む
          </button>
        </div>
      </article>
    `).join("");
  }

  function showImage(imageElement, placeholderElement, imageData) {
    if (!imageElement || !placeholderElement) return;

    if (imageData) {
      imageElement.src = imageData;
      imageElement.hidden = false;
      placeholderElement.hidden = true;
    } else {
      imageElement.src = "";
      imageElement.hidden = true;
      placeholderElement.hidden = false;
    }
  }

  function setTodayCard(entry) {
    if (!entry) {
      if (todayCardText) {
        todayCardText.textContent = "今日の一言が、ここに表示されます。";
      }
      if (todayCardName) {
        todayCardName.textContent = "カード名";
      }
      if (todayCardDate) {
        todayCardDate.textContent = "日付";
      }
      showImage(todayCardImage, todayCardPlaceholder, "");
      return;
    }

    if (todayCardText) {
      todayCardText.textContent = entry.text;
    }

    if (todayCardName) {
      todayCardName.textContent = entry.cardName || "カード名なし";
    }

    if (todayCardDate) {
      todayCardDate.textContent = formatDate(entry.date);
    }

    showImage(todayCardImage, todayCardPlaceholder, entry.imageData);
  }

  function openReading(entry) {
    if (!entry) return;

    currentReadingId = entry.id;

    if (readingTitle) {
      readingTitle.textContent = entry.text;
    }

    if (readingCardName) {
      readingCardName.textContent = entry.cardName || "カード名なし";
    }

    if (readingDate) {
      readingDate.textContent = formatDate(entry.date);
    }

    if (readingMemo) {
      readingMemo.textContent = entry.memo || "メモはありません。";
    }

    if (readingThemes) {
      readingThemes.innerHTML = (entry.themes || [])
        .map((theme) => `<span>${escapeHtml(theme)}</span>`)
        .join("");
    }

    showImage(readingImage, readingPlaceholder, entry.imageData);

    const readingScreenLink = document.querySelector(
      '[data-screen-link="reading"]'
    );

    if (readingScreenLink) {
      readingScreenLink.click();
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      const isReading = screen.dataset.screen === "reading";
      screen.hidden = !isReading;
      screen.classList.toggle("is-active", isReading);
    });

    const headerEyebrow = document.getElementById("headerEyebrow");
    const headerTitle = document.getElementById("headerTitle");
    const headerBackButton = document.getElementById("headerBackButton");

    if (headerEyebrow) headerEyebrow.textContent = "読書席";
    if (headerTitle) headerTitle.textContent = "この一枚を読む";
    if (headerBackButton) {
      headerBackButton.classList.remove("is-hidden");
      headerBackButton.disabled = false;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderAll() {
    const newestEntry = entries[0] || null;

    setTodayCard(newestEntry);
    renderThemeOptions();
    renderThemeChips();
    renderBookshelf();

    document.dispatchEvent(
      new CustomEvent("yuruneko:entries-rendered", {
        detail: {
          count: entries.length,
          newestId: newestEntry?.id || ""
        }
      })
    );
  }

  async function reloadEntries() {
    if (!window.YurunekoStorage) {
      console.warn("保存機能を読み込めませんでした。");
      return;
    }

    entries = await window.YurunekoStorage.getAll();
    renderAll();
  }

  async function fileToDataUrl(file) {
    if (!file) return "";

    const maxBytes = 5 * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new Error("写真が大きすぎます。5MB以下の写真を選んでください。");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("写真を読み込めませんでした。"));

      reader.readAsDataURL(file);
    });
  }

  function resetForm() {
    entryForm?.reset();
    selectedImageData = "";

    if (entryImagePreview) {
      entryImagePreview.hidden = true;
      const previewImage = entryImagePreview.querySelector("img");

      if (previewImage) {
        previewImage.src = "";
      }
    }

    if (entryDate) {
      const now = new Date();
      entryDate.value = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 10);
    }
  }

  async function saveEntry(event) {
    event.preventDefault();

    if (!window.YurunekoStorage) {
      showMessage("保存できませんでした", "保存機能を読み込めませんでした。");
      return;
    }

    const submitButton = entryForm.querySelector('button[type="submit"]');

    try {
      submitButton.disabled = true;
      submitButton.textContent = "本棚にしまっています…";

      const savedEntry = await window.YurunekoStorage.save({
        date: entryDate.value,
        cardName: entryCardName.value,
        text: entryText.value,
        themes: getSelectedThemes(),
        memo: entryMemo.value,
        imageData: selectedImageData
      });

      await reloadEntries();
      resetForm();

      document.dispatchEvent(
        new CustomEvent("yuruneko:entries-changed", {
          detail: {
            reason: "save",
            id: savedEntry.id,
            count: entries.length
          }
        })
      );

      showMessage(
        "本棚にしまいました",
        "今日の一言を、図書館に預けました。",
        () => {
          const backButton = document.getElementById("headerBackButton");

          if (backButton && !backButton.disabled) {
            backButton.click();
          }
        }
      );
    } catch (error) {
      console.error(error);
      showMessage(
        "保存できませんでした",
        error?.message || "入力内容を確認してください。"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "本棚にしまう";
    }
  }

  entryForm?.addEventListener("submit", saveEntry);

  entryImage?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      selectedImageData = "";
      return;
    }

    try {
      selectedImageData = await fileToDataUrl(file);

      const previewImage = entryImagePreview?.querySelector("img");

      if (previewImage) {
        previewImage.src = selectedImageData;
      }

      if (entryImagePreview) {
        entryImagePreview.hidden = false;
      }
    } catch (error) {
      selectedImageData = "";
      entryImage.value = "";
      showMessage(
        "写真を読み込めませんでした",
        error?.message || "別の写真を選んでください。"
      );
    }
  });

  bookshelfSearch?.addEventListener("input", renderBookshelf);

  themeChips?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-theme]");

    if (!chip) return;

    selectedTheme = chip.dataset.theme || "all";
    renderThemeChips();
    renderBookshelf();
  });

  sortButton?.addEventListener("click", () => {
    sortNewestFirst = !sortNewestFirst;
    sortButton.textContent = sortNewestFirst ? "新しい順 ↓" : "古い順 ↑";
    renderBookshelf();
  });

  bookshelfList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-read-entry]");

    if (!button) return;

    const entry = entries.find((item) => item.id === button.dataset.readEntry);

    if (entry) {
      openReading(entry);
    }
  });

  document.addEventListener("yuruneko:entries-changed", reloadEntries);

  document.addEventListener("DOMContentLoaded", reloadEntries);

  window.YurunekoUI = Object.freeze({
    reloadEntries,
    renderAll,
    openReading,
    getEntries: () => [...entries],
    getCurrentReadingId: () => currentReadingId
  });
})();
