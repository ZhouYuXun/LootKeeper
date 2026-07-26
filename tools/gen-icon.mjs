// 生成擴充功能圖示（無外部相依，純 zlib + PNG 編碼）
// 用法：node tools/gen-icon.mjs
// 產出：icon16.png / icon48.png / icon128.png
//
// 圖示為程式生成的暫定版本（深色底 + 金色寶箱），
// 若日後改用美術稿，直接覆蓋這三個檔並刪除本腳本即可。
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const BG = [27, 42, 56];      // 深藍灰
const GOLD = [232, 182, 76];  // 金
const GOLD_DARK = [176, 130, 44];
const LOCK = [60, 44, 18];

function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
        c = (crc ^ buf[n]) & 0xff;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc = c ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixelAt) {
    const raw = Buffer.alloc(size * (size * 4 + 1));
    let p = 0;
    for (let y = 0; y < size; y++) {
        raw[p++] = 0; // filter: none
        for (let x = 0; x < size; x++) {
            const [r, g, b, a] = pixelAt(x, y, size);
            raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8;   // bit depth
    ihdr[9] = 6;   // color type: RGBA
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

// 以 0..1 正規化座標作畫，讓三種尺寸共用同一份設計
function design(x, y, size) {
    const u = (x + 0.5) / size, v = (y + 0.5) / size;

    // 圓角底：超出圓角半徑的角落切成透明
    const dx = Math.abs(u - 0.5), dy = Math.abs(v - 0.5);
    const corner = Math.max(dx - 0.34, 0) ** 2 + Math.max(dy - 0.34, 0) ** 2;
    if (dx > 0.5 || dy > 0.5 || corner > 0.1 ** 2) return [0, 0, 0, 0];

    const inChest = u > 0.2 && u < 0.8 && v > 0.3 && v < 0.74;
    if (!inChest) return [...BG, 255];

    // 箱蓋（上緣圓弧）
    const lidBottom = 0.46;
    if (v < lidBottom) {
        const t = (v - 0.3) / (lidBottom - 0.3);
        const halfWidth = 0.3 * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2));
        if (Math.abs(u - 0.5) > halfWidth) return [...BG, 255];
        return [...GOLD, 255];
    }

    // 鎖扣橫帶
    if (v < 0.53) return [...GOLD_DARK, 255];

    // 箱身 + 中央鎖孔
    const lock = Math.abs(u - 0.5) < 0.055 && v > 0.55 && v < 0.66;
    return lock ? [...LOCK, 255] : [...GOLD, 255];
}

for (const size of [16, 48, 128]) {
    const out = join(ROOT, `icon${size}.png`);
    writeFileSync(out, encodePng(size, design));
    console.log(`已產生 ${out}`);
}
