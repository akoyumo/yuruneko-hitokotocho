/* ==========================================================
  ゆるねこ一言帖 Version1.8
  ui.js
  入力・表示・本棚・読書席・手直し・固定7テーマ
  ========================================================== */

(() => {
  "use strict";

  const FIXED_THEMES = [
    {
      name: "ごきげん",
      icon: "🌿",
      description: "心の整え方、安心、ゆるねこモード"
    },
    {
      name: "歩き方",
      icon: "🚶",
      description: "巡航速度、一歩ずつ、急がない、風に乗る"
    },
    {
      name: "考え方",
      icon: "🌱",
      description: "正解探しより発見探し、視点、受け取り方"
    },
    {
      name: "人との距離",
      icon: "🤝",
      description: "境界線、かわす、声を張らない、人間関係"
    },
    {
      name: "今日の暮らし",
      icon: "☀️",
      description: "休む、片付ける、今ここ、日々の過ごし方"
    },
    {
      name: "自分を信じる",
      icon: "🌸",
      description: "自分のペース、自分の点数、花は自分のタイミング"
    },
    {
      name: "前へ",
      icon: "🐾",
      description: "始める、終える、進む、チャレンジ"
    }
  ];

  const FIXED_THEME_NAMES = FIXED_THEMES.map((theme) => theme.name);

  const entryForm = document.getElementById("entryForm");
  const entryDate = document.getElementById("entryDate");
  const entryCardName = document.getElementById("entryCardName");
  const entryText = document.getElementById("entryText");
  const entryMemo = document.getElementById("entryMemo");
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
  let editingEntryId = "";

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;

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

  function showConfirm({
    title,
    message,
    confirmText = "本棚からしまう",
    cancelText = "そのままにする",
    onConfirm
  }) {
    const dialog = document.getElementById("appDialog");
    const dialogTitle = document.getElementById("dialogTitle");
    const dialogMessage = document.getElementById("dialogMessage");
    const dialogActions = document.getElementById("dialogActions");

    if (!dialog || typeof dialog.showModal !== "function") {
      if (window.confirm(`${title}\n\n${message}`)) onConfirm?.();
      return;
    }

    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogActions.innerHTML = "";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "secondary-button";
    cancelButton.textContent = cancelText;
    cancelButton.addEventListener("click", () => dialog.close());

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "primary-button";
    confirmButton.textContent = confirmText;
    confirmButton.addEventListener("click", async () => {
      confirmButton.disabled = true;
      cancelButton.disabled = true;

      try {
        await onConfirm?.();
        dialog.close();
      } catch (error) {
        console.error(error);
        dialog.close();
        showMessage(
          "本棚からしまえませんでした",
          error?.message || "もう一度試してください。"
        );
      }
    });

    dialogActions.append(cancelButton, confirmButton);
    dialog.showModal();
  }

  function getSelectedThemes() {
    return Array.from(
      entryThemeOptions?.querySelectorAll('input[type="checkbox"]:checked') || []
    )
      .map((input) => input.value.trim())
      .filter((theme) => FIXED_THEME_NAMES.includes(theme));
  }

  function collectAllThemes() {
    return [...FIXED_THEME_NAMES];
  }

  function renderThemeOptions() {
    if (!entryThemeOptions) return;

    const checkedThemes = getSelectedThemes();

    entryThemeOptions.innerHTML = FIXED_THEMES.map((theme) => `
      <label class="theme-option theme-option--described">
        <input
          type="checkbox"
          value="${escapeHtml(theme.name)}"
          ${checkedThemes.includes(theme.name) ? "checked" : ""}
        >
        <span class="theme-option__content">
          <strong>${escapeHtml(theme.icon)} ${escapeHtml(theme.name)}</strong>
          <small>${escapeHtml(theme.description)}</small>
        </span>
      </label>
    `).join("");
  }

  function renderThemeChips() {
    if (!themeChips) return;

    themeChips.innerHTML = `
      <button
        class="theme-chip ${selectedTheme === "all" ? "is-active" : ""}"
        type="button"
        data-theme="all"
      >
        すべて
      </button>

      ${FIXED_THEMES.map((theme) => `
        <button
          class="theme-chip ${selectedTheme === theme.name ? "is-active" : ""}"
          type="button"
          data-theme="${escapeHtml(theme.name)}"
        >
          ${escapeHtml(theme.icon)} ${escapeHtml(theme.name)}
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
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });

    return [...filtered].sort((a, b) => {
      const direction = sortNewestFirst ? -1 : 1;
      const dateCompare =
        String(a.date || "").localeCompare(String(b.date || "")) * direction;

      if (dateCompare !== 0) return dateCompare;

      return (
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")) *
        direction
      );
    });
  }

  function renderBookshelf() {
    if (!bookshelfList) return;

    const visibleEntries = getFilteredEntries();

    if (bookshelfCount) bookshelfCount.textContent = `${visibleEntries.length}冊`;
    if (bookshelfEmpty) bookshelfEmpty.hidden = visibleEntries.length !== 0;

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
            <span>カード：${escapeHtml(entry.cardName || "なし")}</span>
            ${(entry.themes || [])
              .map((theme) => `<span>テーマ：${escapeHtml(theme)}</span>`)
              .join("")}
          </div>

          <div class="book-card__actions">
            <button
              class="book-card__open"
              type="button"
              data-read-entry="${escapeHtml(entry.id)}"
            >
              読書席で読む
            </button>
          </div>
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
      if (todayCardText) todayCardText.textContent = "今日の一言が、ここに表示されます。";
      if (todayCardName) todayCardName.textContent = "カード名";
      if (todayCardDate) todayCardDate.textContent = "日付";
      showImage(todayCardImage, todayCardPlaceholder, "");
      return;
    }

    if (todayCardText) todayCardText.textContent = entry.text;
    if (todayCardName) todayCardName.textContent = entry.cardName || "カード名なし";
    if (todayCardDate) todayCardDate.textContent = formatDate(entry.date);
    showImage(todayCardImage, todayCardPlaceholder, entry.imageData);
  }


  function ensureThemeSelectorStyles() {
    if (document.getElementById("themeSelectorStylesV18")) return;

    const style = document.createElement("style");
    style.id = "themeSelectorStylesV18";
    style.textContent = `
      .theme-selector {
        display: grid;
        gap: 10px;
      }

      .theme-option--described {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: start;
        gap: 10px;
        padding: 12px 10px;
        border: 1px solid rgba(109, 159, 173, 0.2);
        border-radius: 16px;
        background: rgba(238, 248, 251, 0.72);
        cursor: pointer;
      }

      .theme-option--described input {
        margin-top: 4px;
        width: 20px;
        height: 20px;
      }

      .theme-option__content {
        display: grid;
        grid-template-columns: 145px minmax(0, 1fr);
        align-items: start;
        gap: 12px;
      }

      .theme-option__content strong {
        font-size: 0.98rem;
        line-height: 1.35;
        white-space: nowrap;
      }

      .theme-option__content small {
        color: #5b6a70;
        font-size: 0.88rem;
        line-height: 1.55;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureReadingActionStyles() {
    if (document.getElementById("readingActionStylesV17")) return;

    const style = document.createElement("style");
    style.id = "readingActionStylesV17";
    style.textContent = `
      #readingEntryActions {
        display: grid;
        justify-items: start;
        gap: 11px;
        margin-top: 34px;
        padding-top: 4px;
        padding-bottom: 10px;
      }

      #readingEntryActions .reading-action-button {
        min-height: 46px;
        width: auto;
        max-width: 100%;
        padding: 10px 18px;
        border: 1px solid rgba(109, 159, 173, 0.18);
        border-radius: 999px;
        background: #eef8fb;
        color: #33454d;
        font: inherit;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.25;
        text-align: left;
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.82) inset;
        -webkit-tap-highlight-color: transparent;
      }

      #readingEntryActions .reading-action-button:active {
        transform: scale(0.98);
      }

      #readingEntryActions .reading-action-button--edit {
        background: #eef8fb;
      }

      #readingEntryActions .reading-action-button--remove {
        min-height: 42px;
        padding-block: 8px;
        background: rgba(246, 247, 247, 0.92);
        color: #526068;
        font-size: 0.96rem;
      }

      @media (max-width: 390px) {
        #readingEntryActions {
          gap: 9px;
          margin-top: 28px;
        }

        #readingEntryActions .reading-action-button {
          padding-inline: 15px;
          font-size: 0.95rem;
        }

        #readingEntryActions .reading-action-button--remove {
          font-size: 0.92rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureReadingActions() {
    const readingScreen = document.querySelector('[data-screen="reading"]');
    if (!readingScreen) return null;

    ensureReadingActionStyles();

    let actions = document.getElementById("readingEntryActions");

    if (!actions) {
      actions = document.createElement("div");
      actions.id = "readingEntryActions";

      const card =
        readingMemo?.closest("article") ||
        readingMemo?.parentElement ||
        readingScreen;

      card.appendChild(actions);
    }

    actions.innerHTML = `
      <button
        type="button"
        class="reading-action-button reading-action-button--edit"
        data-reading-edit
      >
        ✏️ この一枚を手直しする
      </button>

      <button
        type="button"
        class="reading-action-button reading-action-button--remove"
        data-reading-delete
      >
        📚 本棚からしまう
      </button>
    `;

    return actions;
  }

  function openReading(entry) {
    if (!entry) return;

    currentReadingId = entry.id;

    if (readingTitle) readingTitle.textContent = entry.text;
    if (readingCardName) readingCardName.textContent = `カード：${entry.cardName || "なし"}`;
    if (readingDate) readingDate.textContent = formatDate(entry.date);
    if (readingMemo) readingMemo.textContent = entry.memo || "メモはありません。";

    if (readingThemes) {
      readingThemes.innerHTML = (entry.themes || [])
        .map((theme) => `<span>テーマ：${escapeHtml(theme)}</span>`)
        .join("");
    }

    showImage(readingImage, readingPlaceholder, entry.imageData);
    ensureReadingActions();

    const readingScreenLink = document.querySelector('[data-screen-link="reading"]');

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
    ensureThemeSelectorStyles();
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

    if (currentReadingId) {
      const currentEntry = entries.find((entry) => entry.id === currentReadingId);
      if (currentEntry) openReading(currentEntry);
    }
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

  function setImagePreview(imageData) {
    selectedImageData = imageData || "";
    const previewImage = entryImagePreview?.querySelector("img");

    if (selectedImageData) {
      if (previewImage) previewImage.src = selectedImageData;
      if (entryImagePreview) entryImagePreview.hidden = false;
    } else {
      if (previewImage) previewImage.src = "";
      if (entryImagePreview) entryImagePreview.hidden = true;
    }
  }

  function setTodayDate() {
    if (!entryDate) return;

    const now = new Date();
    entryDate.value = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);
  }

  function updateSubmitButton() {
    const submitButton = entryForm?.querySelector('button[type="submit"]');
    if (!submitButton) return;

    submitButton.textContent = editingEntryId
      ? "変更を本棚にしまう"
      : "本棚にしまう";
  }

  function resetForm() {
    entryForm?.reset();
    editingEntryId = "";
    setImagePreview("");

    if (entryImage) entryImage.value = "";

    setTodayDate();
    renderThemeOptions();
    updateSubmitButton();
  }

  function openCreateScreen() {
    const createScreenLink = document.querySelector('[data-screen-link="create"]');

    if (createScreenLink) {
      createScreenLink.click();
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      const isCreate = screen.dataset.screen === "create";
      screen.hidden = !isCreate;
      screen.classList.toggle("is-active", isCreate);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditing(entry) {
    if (!entry || !entryForm) return;

    editingEntryId = entry.id;
    openCreateScreen();

    entryDate.value = entry.date || "";
    entryCardName.value = entry.cardName || "";
    entryText.value = entry.text || "";
    entryMemo.value = entry.memo || "";

    setImagePreview(entry.imageData || "");
    renderThemeOptions();

    const themes = Array.isArray(entry.themes) ? entry.themes : [];
    entryThemeOptions
      ?.querySelectorAll('input[type="checkbox"]')
      .forEach((input) => {
        input.checked = themes.includes(input.value);
      });

    updateSubmitButton();
    entryText.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeFromBookshelf(entry) {
    if (!entry || !window.YurunekoStorage) return;

    showConfirm({
      title: "この一枚を本棚からしまう？",
      message: `「${entry.text}」を本棚からしまいます。しまったあとは元に戻せません。`,
      confirmText: "本棚からしまう",
      cancelText: "そのままにする",
      onConfirm: async () => {
        await window.YurunekoStorage.remove(entry.id);

        if (editingEntryId === entry.id) resetForm();
        if (currentReadingId === entry.id) currentReadingId = "";

        await reloadEntries();

        document.dispatchEvent(
          new CustomEvent("yuruneko:entries-changed", {
            detail: {
              reason: "delete",
              id: entry.id,
              count: entries.length
            }
          })
        );

        showMessage(
          "本棚からしまいました",
          "この一枚を、本棚から静かにしまいました。",
          () => {
            const backButton = document.getElementById("headerBackButton");
            if (backButton && !backButton.disabled) backButton.click();
          }
        );
      }
    });
  }

  async function saveEntry(event) {
    event.preventDefault();

    if (!window.YurunekoStorage) {
      showMessage("保存できませんでした", "保存機能を読み込めませんでした。");
      return;
    }

    const submitButton = entryForm.querySelector('button[type="submit"]');
    const existingEntry = editingEntryId
      ? entries.find((entry) => entry.id === editingEntryId)
      : null;

    try {
      submitButton.disabled = true;
      submitButton.textContent = editingEntryId
        ? "変更をしまっています…"
        : "本棚にしまっています…";

      const savedEntry = await window.YurunekoStorage.save({
        ...(existingEntry || {}),
        ...(editingEntryId ? { id: editingEntryId } : {}),
        date: entryDate.value,
        cardName: entryCardName.value,
        text: entryText.value,
        themes: getSelectedThemes(),
        memo: entryMemo.value,
        imageData: selectedImageData
      });

      const wasEditing = Boolean(editingEntryId);

      await reloadEntries();
      resetForm();

      document.dispatchEvent(
        new CustomEvent("yuruneko:entries-changed", {
          detail: {
            reason: wasEditing ? "edit" : "save",
            id: savedEntry.id,
            count: entries.length
          }
        })
      );

      showMessage(
        wasEditing ? "手直ししました" : "本棚にしまいました",
        wasEditing
          ? "この一枚を、きれいに整えました。"
          : "今日の一言を、図書館に預けました。",
        () => {
          const backButton = document.getElementById("headerBackButton");
          if (backButton && !backButton.disabled) backButton.click();
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
      updateSubmitButton();
    }
  }

  entryForm?.addEventListener("submit", saveEntry);

  entryImage?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await fileToDataUrl(file);
      setImagePreview(imageData);
    } catch (error) {
      setImagePreview("");
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
    const readButton = event.target.closest("[data-read-entry]");
    if (!readButton) return;

    const entry = entries.find(
      (item) => item.id === readButton.dataset.readEntry
    );

    if (entry) openReading(entry);
  });

  document.addEventListener("click", (event) => {
    const readingEditButton = event.target.closest("[data-reading-edit]");
    if (readingEditButton) {
      const entry = entries.find((item) => item.id === currentReadingId);
      if (entry) startEditing(entry);
      return;
    }

    const readingDeleteButton = event.target.closest("[data-reading-delete]");
    if (readingDeleteButton) {
      const entry = entries.find((item) => item.id === currentReadingId);
      if (entry) removeFromBookshelf(entry);
    }
  });

  document.addEventListener("yuruneko:entries-changed", reloadEntries);

  document.addEventListener("DOMContentLoaded", () => {
    setTodayDate();
    reloadEntries();
  });

  window.YurunekoUI = Object.freeze({
    reloadEntries,
    renderAll,
    openReading,
    startEditing,
    deleteEntry: removeFromBookshelf,
    resetForm,
    getEntries: () => [...entries],
    getCurrentReadingId: () => currentReadingId,
    getEditingEntryId: () => editingEntryId
  });
})();
