// decodeJwtTimes 行為測試
// 用法：npm run check（或 node tools/test-jwt.mjs）
//
// 存在理由：background.js（service worker）與 claim-core.js（content script）
// 是兩個執行環境、兩個 classic script，無法共用模組，因此 decodeJwtTimes
// 必然有兩份實作。這支測試同時驗證「兩份都正確」與「兩份行為一致」，
// 避免日後改了一邊忘了另一邊——那種漂移在執行期只會表現成「時間顯示不一樣」。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 取出檔案中的 decodeJwtTimes 函式原始碼並求值
// 依賴的排版慣例：函式以 "function decodeJwtTimes" 開頭，以行首單獨的 "}" 結尾
function extract(file) {
    const src = readFileSync(join(ROOT, file), "utf8");
    const start = src.indexOf("function decodeJwtTimes");
    if (start === -1) throw new Error(`${file}：找不到 decodeJwtTimes`);
    const end = src.indexOf("\n}", start);
    if (end === -1) throw new Error(`${file}：decodeJwtTimes 沒有正常結束`);
    const code = src.slice(start, end + 2);
    return new Function(`${code}; return decodeJwtTimes;`)();
}

const impls = {
    "background.js": extract("background.js"),
    "claim-core.js": extract("claim-core.js")
};

// 合成 JWT（payload 只含時間欄位，非真實憑證；簽章欄位為佔位字串）
const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64")
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (payload) => `eyJhbGciOiJIUzI1NiJ9.${b64url(payload)}.c2lnbmF0dXJl`;

const EXP = 1800000000, IAT = 1799956800; // 相差 12 小時

const cases = [
    ["標準 JWT（含 iat）", jwt({ exp: EXP, iat: IAT }), { exp: EXP, iat: IAT }],
    ["只有 exp", jwt({ exp: EXP }), { exp: EXP, iat: null }],
    ["需要 base64 補位", jwt({ exp: EXP, iat: IAT, sub: "abcd" }), { exp: EXP, iat: IAT }],
    ["exp 非數字 → 不視為 JWT", jwt({ exp: "soon" }), null],
    ["沒有 exp → 不視為 JWT", jwt({ sub: "x" }), null],
    ["段數不足", "aaa.bbb", null],
    ["非 base64 內容", "aaa.@@@@.ccc", null],
    ["空字串", "", null],
    ["null", null, null],
    ["數字", 12345, null]
];

const failures = [];
for (const [name, input, expected] of cases) {
    for (const [file, fn] of Object.entries(impls)) {
        let got;
        try {
            got = fn(input);
        } catch (e) {
            failures.push(`${file} / ${name}：拋出例外 ${e.message}`);
            continue;
        }
        const ok = expected === null
            ? got === null
            : got !== null && got.exp === expected.exp && got.iat === expected.iat;
        if (!ok) {
            failures.push(`${file} / ${name}：預期 ${JSON.stringify(expected)}，實際 ${JSON.stringify(got)}`);
        }
    }
}

// 掃描器自我檢查：兩份實作都要真的被取出來測到
if (Object.keys(impls).length !== 2) {
    failures.push(`只取出 ${Object.keys(impls).length} 份實作，預期 2 份`);
}

if (failures.length > 0) {
    console.error("✗ decodeJwtTimes 測試失敗：\n  " + failures.join("\n  "));
    process.exit(1);
}
console.log(`✓ decodeJwtTimes 測試通過（${cases.length} 個案例 × ${Object.keys(impls).length} 份實作）`);
