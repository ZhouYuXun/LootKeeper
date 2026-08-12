// 一致性守門：targets.js ↔ manifest.json ↔ claim-*.js
// 用法：npm run check
//
// 存在理由：目標的網址同時出現在 targets.js（開分頁用）與 manifest.json
// （content script 注入用）兩處。兩者一旦不同步，擴充功能會「開得了分頁但
// 腳本永遠不注入」——完全靜默，沒有任何錯誤訊息，只會表現成「今天沒領到」。
// v3.0 新增每週簽到時就是撞在這一點上，所以把它變成自動檢查而不是注意事項。
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (msg) => errors.push(msg);

// targets.js 是 classic script（供 importScripts / content_scripts 使用），
// 不能 import，故讀檔後求值取出 TARGETS
function loadTargets() {
    const code = readFileSync(join(ROOT, "targets.js"), "utf8");
    return new Function(`${code}; return TARGETS;`)();
}

const TARGETS = loadTargets();
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

// ── 掃描器自我檢查 ───────────────────────────────────
// 沒有這段，掃不到東西的空清單會讓底下每個迴圈都恆真通過（假綠）
if (!Array.isArray(TARGETS) || TARGETS.length < 2) {
    fail(`掃描器異常：從 targets.js 只讀到 ${TARGETS?.length ?? 0} 個目標，預期至少 2 個`);
}
if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
    fail("掃描器異常：manifest.content_scripts 為空");
}

const allMatches = (manifest.content_scripts || []).flatMap(cs => cs.matches || []);

for (const t of TARGETS) {
    const label = `目標 ${t.id}`;

    for (const field of ["id", "name", "url", "match", "loggedOut", "ready"]) {
        if (!t[field]) fail(`${label}：缺少必填欄位 ${field}`);
    }
    if (!t.url) continue;

    // 1. manifest 必須有涵蓋此目標的 content script
    const entry = (manifest.content_scripts || []).find(cs => (cs.matches || []).includes(t.match));
    if (!entry) {
        fail(`${label}：manifest.content_scripts 沒有 match "${t.match}"（腳本不會注入，且不會有任何錯誤訊息）`);
        continue;
    }

    // 2. match pattern 必須真的匹配自己的 url
    const re = new RegExp("^" + t.match.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"));
    if (!re.test(t.url)) {
        fail(`${label}：match "${t.match}" 匹配不到自己的 url "${t.url}"`);
    }

    // 3. host_permissions 必須涵蓋此網址的來源
    const origin = new URL(t.url).origin;
    const hostOk = (manifest.host_permissions || []).some(h => h.startsWith(origin));
    if (!hostOk) fail(`${label}：host_permissions 未涵蓋 ${origin}`);

    // 4. 注入順序必須是 targets.js → claim-core.js → claim-<id>.js
    const js = entry.js || [];
    const expected = ["targets.js", "claim-core.js", `claim-${t.id}.js`];
    if (js.join(",") !== expected.join(",")) {
        fail(`${label}：content_scripts.js 應為 [${expected.join(", ")}]，實際為 [${js.join(", ")}]`);
    }

    // 5. handler 檔必須存在，且確實註冊了這個 id
    const handlerFile = join(ROOT, `claim-${t.id}.js`);
    if (!existsSync(handlerFile)) {
        fail(`${label}：找不到 claim-${t.id}.js`);
    } else {
        const src = readFileSync(handlerFile, "utf8");
        if (!src.includes(`LK.register("${t.id}"`)) {
            fail(`${label}：claim-${t.id}.js 未呼叫 LK.register("${t.id}", ...)`);
        }
    }
}

// ── 反向檢查：manifest 不該有 targets.js 裡不存在的 match ──
for (const m of allMatches) {
    if (!TARGETS.some(t => t.match === m)) {
        fail(`manifest 有多餘的 content script match "${m}"，targets.js 中沒有對應目標`);
    }
}

// ── manifest 引用的圖示檔必須存在 ────────────────────
const iconPaths = [
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {})
];
for (const p of new Set(iconPaths)) {
    if (!existsSync(join(ROOT, p))) fail(`manifest 引用的圖示不存在：${p}（執行 node tools/gen-icon.mjs 產生）`);
}

// ── 版本號三處必須一致 ───────────────────────────────
// manifest 是唯一真值；package.json 與 README badge 都得跟上。
// 這在開發中實際漏過：改了 manifest 卻忘了 README，使用者看到的版本是舊的。
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const readme = readFileSync(join(ROOT, "README.md"), "utf8");

// manifest 可為 2 段（3.6）或 3 段（3.6.1）；package.json 受 npm 限制固定 3 段，
// 因此「完全相等」或「manifest 是 package 的前綴」都算一致
if (pkg.version !== manifest.version && !pkg.version.startsWith(manifest.version + ".")) {
    fail(`package.json 版本 ${pkg.version} 與 manifest ${manifest.version} 不一致`);
}

const badge = readme.match(/版本-v([\d.]+)-/);
if (!badge) {
    fail("README 找不到版本徽章（預期形如 版本-v3.4-）");
} else if (badge[1] !== manifest.version) {
    fail(`README 徽章版本 v${badge[1]} 與 manifest ${manifest.version} 不一致`);
}

// ── 文件的 HTML 標籤必須配對 ─────────────────────────
// README 大量使用 <details> / <div> 排版，少一個閉合標籤在 GitHub 上
// 會整段塌掉，而 markdown 不會報錯
for (const doc of ["README.md", "MODULE_MAP.md"]) {
    const text = readFileSync(join(ROOT, doc), "utf8");
    for (const tag of ["details", "div", "table"]) {
        const open = (text.match(new RegExp(`<${tag}[ >]`, "g")) || []).length;
        const close = (text.match(new RegExp(`</${tag}>`, "g")) || []).length;
        if (open !== close) fail(`${doc}：<${tag}> 標籤不配對（開 ${open} / 閉 ${close}）`);
    }
}

// ── 結果 ─────────────────────────────────────────────
if (errors.length > 0) {
    console.error("✗ 一致性檢查失敗：\n  " + errors.join("\n  "));
    process.exit(1);
}
console.log(`✓ 一致性檢查通過（${TARGETS.length} 個目標：${TARGETS.map(t => t.id).join("、")}）`);
