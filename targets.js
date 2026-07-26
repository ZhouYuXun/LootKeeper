// ── 領取目標註冊表 ────────────────────────────────────
// 唯一真值：新增一個領取目標只需在此加一筆，background / content script
// 都由此表驅動。manifest.json 的 content_scripts.matches 必須涵蓋每筆 match，
// 由 tools/check-consistency.mjs 自動驗證（npm run check）。
//
// 此檔為 classic script，同時被：
//   - background.js 以 importScripts() 載入
//   - content_scripts 陣列第一順位載入（與後續腳本共享 isolated world）
//
// 欄位說明：
//   id            穩定識別碼，寫入 storage 與 log，改名會造成資料不相容
//   name          顯示名稱
//   url           開啟的完整網址
//   match         manifest content_scripts 的 match pattern
//   loggedOut     判定「未登入」的選擇器；命中即視為需要重新登入
//   ready         判定「頁面骨架已渲染」的選擇器，用於區分未登入與載入失敗
const TARGETS = [
    {
        id: "vip",
        name: "VIP 禮包",
        url: "https://www.swordofjustice.com/h5/20260424/vip/index.html#/",
        match: "https://www.swordofjustice.com/h5/20260424/*",
        loggedOut: ".bg-no-login, .privilege-icon--unlogin",
        ready: ".privilege-grid, .privilege-item"
    },
    {
        id: "checkin",
        name: "每週簽到",
        url: "https://www.swordofjustice.com/h5/20260722/officialwebfasthmt/#/",
        match: "https://www.swordofjustice.com/h5/20260722/*",
        loggedOut: ".part-loginInfo.nologin",
        ready: ".checkin-box"
    }
];

// match pattern → 正規表示式（僅支援本專案用到的 "https://host/path/*" 形式）
function targetMatchesUrl(target, url) {
    const escaped = target.match.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp("^" + escaped).test(url);
}

function findTargetByUrl(url) {
    return TARGETS.find(t => targetMatchesUrl(t, url)) || null;
}

function getTarget(id) {
    return TARGETS.find(t => t.id === id) || null;
}
