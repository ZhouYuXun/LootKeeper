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

const BG = [22, 35, 48];      // 深藍灰（底部）
const BG_TOP = [38, 58, 76];  // 深藍灰（頂部，做出淡漸層）
const GOLD = [232, 182, 76];  // 金
const GOLD_LIT = [255, 226, 150]; // 蓋面打亮
const GOLD_DARK = [168, 122, 40];
const LOCK = [52, 38, 14];

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

// 每個像素取 SS×SS 個子樣本再平均 = 反鋸齒。
// 沒有這一步，所有斜邊與圓角都會是階梯狀，在 16px 尤其明顯。
const SS = 4;

function encodePng(size, pixelAt) {
    const raw = Buffer.alloc(size * (size * 4 + 1));
    let p = 0;
    for (let y = 0; y < size; y++) {
        raw[p++] = 0; // filter: none
        for (let x = 0; x < size; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const [sr, sg, sb, sa] = pixelAt(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size);
                    // 以 alpha 加權累加，避免透明像素把顏色拉向黑色
                    r += sr * sa; g += sg * sa; b += sb * sa; a += sa;
                }
            }
            const n = SS * SS;
            raw[p++] = a ? Math.round(r / a) : 0;
            raw[p++] = a ? Math.round(g / a) : 0;
            raw[p++] = a ? Math.round(b / a) : 0;
            raw[p++] = Math.round(a / n);
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

// 以 0..1 正規化座標作畫，讓三種尺寸共用同一份設計。
// x/y 帶小數（超取樣子樣本），所有邊界都用連續函式判斷，交給取樣做平滑。
function design(x, y, size) {
    const u = x / size, v = y / size;

    // 圓角矩形（signed distance）：半徑 0.16，四角平滑
    const R = 0.16, HALF = 0.5 - 0.02;
    const qx = Math.max(Math.abs(u - 0.5) - (HALF - R), 0);
    const qy = Math.max(Math.abs(v - 0.5) - (HALF - R), 0);
    if (Math.hypot(qx, qy) > R) return [0, 0, 0, 0];

    // 底色由上而下微微加深，避免整片死板的單色
    const bg = BG.map((c, i) => Math.round(c + (BG_TOP[i] - c) * (1 - v)));

    // 箱身：圓角矩形
    const bodyTop = 0.46, bodyBottom = 0.74, bodyHalf = 0.28;
    const inBody =
        Math.abs(u - 0.5) < bodyHalf && v > bodyTop && v < bodyBottom &&
        Math.hypot(
            Math.max(Math.abs(u - 0.5) - (bodyHalf - 0.04), 0),
            Math.max(Math.abs(v - (bodyTop + bodyBottom) / 2) - ((bodyBottom - bodyTop) / 2 - 0.04), 0)
        ) <= 0.04;

    // 箱蓋：半橢圓，底邊與箱身上緣相接
    const lidTop = 0.28;
    const ry = bodyTop - lidTop;
    const inLid =
        v <= bodyTop && v >= lidTop &&
        ((u - 0.5) / bodyHalf) ** 2 + ((v - bodyTop) / ry) ** 2 <= 1;

    if (!inBody && !inLid) return [...bg, 255];

    // 蓋與身交界的深色扣帶
    if (v > bodyTop - 0.035 && v < bodyTop + 0.045) return [...GOLD_DARK, 255];

    // 鎖孔：圓頭 + 下方梯形，置中於扣帶下方
    const kx = u - 0.5, ky = v - 0.565;
    const inKeyhole =
        Math.hypot(kx, ky) < 0.038 ||
        (Math.abs(kx) < 0.018 + (v - 0.565) * 0.12 && v > 0.565 && v < 0.655);
    if (inKeyhole) return [...LOCK, 255];

    // 蓋面上緣打亮，做出金屬弧度
    if (inLid) {
        const shine = Math.max(0, 1 - ((v - lidTop) / ry) * 1.6) * 0.35;
        return [...GOLD.map((c, i) => Math.round(c + (GOLD_LIT[i] - c) * shine)), 255];
    }
    return [...GOLD, 255];
}

for (const size of [16, 48, 128]) {
    const out = join(ROOT, `icon${size}.png`);
    writeFileSync(out, encodePng(size, design));
    console.log(`已產生 ${out}`);
}
