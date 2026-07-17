/* ==========================================================
   ゆるねこ一言帖 Version1.0
   data.js
   共通データ・初期設定
   ========================================================== */

(() => {
  "use strict";

  const DEFAULT_THEMES = [
    "巡航速度",
    "境界線",
    "ごきげん",
    "勇気",
    "休息",
    "挑戦"
  ];

  const APP_INFO = Object.freeze({
    name: "ゆるねこ一言帖",
    version: "1.0",
    slogan: "帰ってきたくなる図書館。"
  });

  const SAMPLE_ENTRY = Object.freeze({
    date: "",
    cardName: "",
    text: "",
    themes: [],
    memo: "",
    imageData: "",
    favorite: false
  });

  window.YurunekoData = Object.freeze({
    DEFAULT_THEMES,
    APP_INFO,
    SAMPLE_ENTRY
  });
})();
