// isNewer 版本比對測試
// 用法：npm run check（或 node tools/test-version.mjs）
//
// 存在理由：字串版本比對是經典的 off-by-one 溫床——按字典序 "3.9" > "3.10"，
// 但語意上 3.10 才是新版。這種錯誤的表現是「有新版卻不通知」，完全靜默。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "background.js"), "utf8");

function extract(name) {
    const start = src.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`background.js：找不到 ${name}`);
    const end = src.indexOf("\n}", start);
    if (end === -1) throw new Error(`background.js：${name} 沒有正常結束`);
    return src.slice(start, end + 2);
}

const isNewer = new Function(`${extract("parseVer")}\n${extract("isNewer")}\nreturn isNewer;`)();

const cases = [
    ["次版號進位", "3.1", "3.0", true],
    ["兩位數次版號大於個位數", "3.10", "3.9", true],
    ["反向：3.9 不比 3.10 新", "3.9", "3.10", false],
    ["主版號進位", "10.0", "9.9", true],
    ["完全相同", "3.1", "3.1", false],
    ["遠端較舊", "2.10", "3.0", false],
    ["位數不同但等值", "3", "3.0", false],
    ["位數不同且較新", "3.0.1", "3.0", true],
    ["v2.10 大於 v2.9", "2.10", "2.9", true],
    ["空字串遠端不視為新版", "", "3.1", false]
];

const failures = [];
for (const [name, remote, local, expected] of cases) {
    const got = isNewer(remote, local);
    if (got !== expected) {
        failures.push(`${name}：isNewer("${remote}", "${local}") 預期 ${expected}，實際 ${got}`);
    }
}

// 掃描器自我檢查：確定真的抽到函式而不是空殼
if (typeof isNewer !== "function" || cases.length < 10) {
    failures.push("測試自身異常：函式未取出或案例不足");
}

if (failures.length > 0) {
    console.error("✗ isNewer 測試失敗：\n  " + failures.join("\n  "));
    process.exit(1);
}
console.log(`✓ isNewer 測試通過（${cases.length} 個案例）`);
