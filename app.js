/* ==========================================================
   ゆるねこ一言帖 Version1.0
   app.js
   画面切り替えと基本操作
   ========================================================== */

(() => {
  "use strict";

  const screens = Array.from(document.querySelectorAll(".screen"));
  const headerBackButton = document.getElementById("headerBackButton");
  const headerEyebrow = document.getElementById("headerEyebrow");
  const headerTitle = document.getElementById("headerTitle");
  const todayDate = document.getElementById("todayDate");

  const largeTextToggle = document.getElementById("largeTextToggle");
  const reducedMotionToggle = document.getElementById("reducedMotionToggle");
  const openBackupFromSettings = document.getElementById("openBackupFromSettings");
  const sendFeedbackButton = document.getElementById("sendFeedbackButton");

  const screenTitles = {
    home: { eyebrow: "ゆるねこ一言帖", title: "おかえりなさい。" },
    bookshelf: { eyebrow: "図書館の中へ", title: "本棚" },
    reading: { eyebrow: "読書席", title: "この一枚を読む" },
    create: { eyebrow: "今日の机", title: "新しく作る" },
    backup: { eyebrow: "図書館の書庫", title: "控え" },
    settings: { eyebrow: "図書館のお手入れ", title: "設定" }
  };

  let currentScreen = "home";
  const historyStack = ["home"];

  function formatToday() {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(new Date());
  }

  function setTodayDate() {
    if (todayDate) todayDate.textContent = formatToday();

    const entryDate = document.getElementById("entryDate");
    if (entryDate && !entryDate.value) {
      const now = new Date();
      entryDate.value = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      ).toISOString().slice(0, 10);
    }
  }

  function updateHeader(screenName) {
    const heading = screenTitles[screenName] || screenTitles.home;

    if (headerEyebrow) headerEyebrow.textContent = heading.eyebrow;
    if (headerTitle) headerTitle.textContent = heading.title;

    if (headerBackButton) {
      const isHome = screenName === "home";
      headerBackButton.classList.toggle("is-hidden", isHome);
      headerBackButton.disabled = isHome;
    }
  }

  function showScreen(screenName, options = {}) {
    const { addToHistory = true } = options;
    const targetScreen = document.querySelector(`[data-screen="${screenName}"]`);

    if (!targetScreen) return;

    screens.forEach((screen) => {
      const isTarget = screen === targetScreen;
      screen.hidden = !isTarget;
      screen.classList.toggle("is-active", isTarget);
    });

    currentScreen = screenName;
    updateHeader(screenName);

    if (addToHistory && historyStack.at(-1) !== screenName) {
      historyStack.push(screenName);
    }

    window.scrollTo({
      top: 0,
      behavior: document.body.classList.contains("is-reduced-motion")
        ? "auto"
        : "smooth"
    });
  }

  function goBack() {
    if (historyStack.length <= 1) {
      showScreen("home", { addToHistory: false });
      return;
    }

    historyStack.pop();
    showScreen(historyStack.at(-1) || "home", { addToHistory: false });
  }

  function openReadingSeat() {
    const todayText = document.getElementById("todayCardText");
    const todayCardName = document.getElementById("todayCardName");
    const todayCardDate = document.getElementById("todayCardDate");

    const readingTitle = document.getElementById("readingTitle");
    const readingCardName = document.getElementById("readingCardName");
    const readingDate = document.getElementById("readingDate");

    if (readingTitle && todayText) {
      readingTitle.textContent = todayText.textContent.trim();
    }
    if (readingCardName && todayCardName) {
      readingCardName.textContent = todayCardName.textContent.trim();
    }
    if (readingDate && todayCardDate) {
      readingDate.textContent = todayCardDate.textContent.trim();
    }

    showScreen("reading");
  }

  function showNotice(title, message) {
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

  function handleHomeRoom(action) {
    if (action === "themes" || action === "recent") {
      showScreen("bookshelf");
      return;
    }

    if (action === "flip") {
      openReadingSeat();
      return;
    }

    if (action === "surprise") {
      showNotice("神楽のお楽しみ箱", "一言が入ったら、神楽が一枚そっと選びます。");
      return;
    }

    if (action === "small-shelf") {
      showNotice("小さな本棚", "お気に入りを集める棚は、データ機能と一緒に動き始めます。");
    }
  }

  function saveDisplaySettings() {
    try {
      localStorage.setItem("yuruneko-large-text", largeTextToggle?.checked ? "1" : "0");
      localStorage.setItem("yuruneko-reduced-motion", reducedMotionToggle?.checked ? "1" : "0");
    } catch (error) {
      console.warn("表示設定を保存できませんでした。", error);
    }
  }

  function applyDisplaySettings() {
    let largeText = false;
    let reducedMotion = false;

    try {
      largeText = localStorage.getItem("yuruneko-large-text") === "1";
      reducedMotion = localStorage.getItem("yuruneko-reduced-motion") === "1";
    } catch (error) {
      console.warn("表示設定を読み込めませんでした。", error);
    }

    if (largeTextToggle) largeTextToggle.checked = largeText;
    if (reducedMotionToggle) reducedMotionToggle.checked = reducedMotion;

    document.body.classList.toggle("is-large-text", largeText);
    document.body.classList.toggle("is-reduced-motion", reducedMotion);
  }

  document.addEventListener("click", (event) => {
    const screenLink = event.target.closest("[data-screen-link]");
    if (screenLink) {
      showScreen(screenLink.dataset.screenLink);
      return;
    }

    const readingButton = event.target.closest("[data-open-reading]");
    if (readingButton) {
      openReadingSeat();
      return;
    }

    const homeRoomButton = event.target.closest("[data-go]");
    if (homeRoomButton) {
      handleHomeRoom(homeRoomButton.dataset.go);
    }
  });

  headerBackButton?.addEventListener("click", goBack);

  openBackupFromSettings?.addEventListener("click", () => {
    showScreen("backup");
  });

  sendFeedbackButton?.addEventListener("click", () => {
    showNotice(
      "ご意見・ご感想",
      "この入口は用意できました。送り先は、完成時に設定します。"
    );
  });

  largeTextToggle?.addEventListener("change", () => {
    document.body.classList.toggle("is-large-text", largeTextToggle.checked);
    saveDisplaySettings();
  });

  reducedMotionToggle?.addEventListener("change", () => {
    document.body.classList.toggle(
      "is-reduced-motion",
      reducedMotionToggle.checked
    );
    saveDisplaySettings();
  });

  function initialize() {
    setTodayDate();
    applyDisplaySettings();
    showScreen("home", { addToHistory: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
