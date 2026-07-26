// ── content script 共用核心 ───────────────────────────
// 由 targets.js 決定當前頁面屬於哪個目標，再交給對應的 claim-*.js 處理流程。
// 各 claim-*.js 以 LK.register(id, fn) 註冊自己，本檔負責：
//   授權驗證 → 等待頁面骨架 → 登入狀態判定 → 執行流程 → 回報 background

const LK = {
    handlers: {},
    register(id, fn) { this.handlers[id] = fn; }
};

// 向 background 寫入診斷步驟（fire-and-forget）
function diagStep(type, note = "") {
    chrome.runtime.sendMessage({ type: "diagStep", diagType: type, note });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 等待多個選擇器中任一命中，回傳命中的選擇器與元素
// 用於「頁面骨架 vs 未登入畫面」這種互斥狀態的競賽判定
// 使用 MutationObserver 取代 requestAnimationFrame polling：
// 在背景 tab / 最小化視窗中 RAF 被降速至 1fps，Observer 則即時觸發
function waitForAny(selectors, timeout = 8000) {
    return new Promise(resolve => {
        const list = selectors.filter(Boolean);
        const hit = () => {
            for (const sel of list) {
                const el = document.querySelector(sel);
                if (el) return { selector: sel, el };
            }
            return null;
        };

        const found = hit();
        if (found) return resolve(found);

        const timer = setTimeout(() => {
            observer.disconnect();
            resolve({ selector: null, el: null });
        }, timeout);

        const observer = new MutationObserver(() => {
            const f = hit();
            if (f) {
                clearTimeout(timer);
                observer.disconnect();
                resolve(f);
            }
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}

function waitForElement(selector, timeout = 8000) {
    return waitForAny([selector], timeout).then(r => r.el);
}

async function runTarget(target) {
    const log = {
        time: new Date().toLocaleString("zh-TW", { hour12: false }),
        target: target.id,
        targetName: target.name,
        results: [],
        error: null,
        loginRequired: false
    };

    // 骨架與未登入畫面競賽：先到者決定分支
    // 兩者皆未出現才是真正的載入失敗，不再把未登入誤報成導向失敗
    const { selector } = await waitForAny([target.loggedOut, target.ready], 12000);

    if (!selector) {
        log.error = "頁面載入逾時，未出現預期內容";
        diagStep("page_timeout", `${target.id}：ready 與 loggedOut 皆未命中`);
        return log;
    }

    // 兩者同時存在時 waitForAny 依陣列順序優先回報未登入；
    // 但若骨架先渲染、登入區塊稍晚才掛上，先到的會是 ready。
    // 未登入的簽到頁仍會渲染出可點的 .btn-checkin，誤判就會空點一次，
    // 因此骨架命中後再等一次頁面落定，重新確認登入狀態。
    let loggedOut = selector === target.loggedOut;
    if (!loggedOut) {
        await sleep(800);
        loggedOut = !!document.querySelector(target.loggedOut);
    }

    if (loggedOut) {
        log.loginRequired = true;
        log.error = "登入已過期，請重新登入官網後再試";
        diagStep("login_required", `${target.id}：命中 ${target.loggedOut}`);
        return log;
    }

    const handler = LK.handlers[target.id];
    if (!handler) {
        log.error = `未註冊的領取流程：${target.id}`;
        diagStep("handler_missing", target.id);
        return log;
    }

    try {
        log.results = (await handler({ waitForElement, waitForAny, sleep, diagStep })) || [];
    } catch (e) {
        log.error = `流程錯誤：${e?.message || e}`;
        diagStep("handler_error", `${target.id}：${e?.message || e}`);
    }
    return log;
}

async function boot() {
    const target = findTargetByUrl(location.href);
    if (!target) return; // 非註冊目標頁，不做任何事

    const log = await runTarget(target);
    chrome.runtime.sendMessage({ type: "claimDone", log });
}

function init() {
    const target = findTargetByUrl(location.href);
    chrome.runtime.sendMessage({ type: "contentLoaded", targetId: target?.id || null });

    // SW cold start 競態：第一次 sendMessage 可能在 onMessage listener 註冊前送達
    // 失敗則 500ms 後重試一次
    const tryCheckAuth = (retries) => {
        chrome.runtime.sendMessage({ type: "checkAuth" }, (res) => {
            const err = chrome.runtime.lastError;
            if (err || !res) {
                if (retries > 0) setTimeout(() => tryCheckAuth(retries - 1), 500);
                return;
            }
            if (res.authorized) setTimeout(boot, 2000);
        });
    };
    tryCheckAuth(1);
}

// 防禦性 readyState 守衛：避免在極端情況下 load 事件已觸發才注入 script
if (document.readyState === "complete") {
    init();
} else {
    window.addEventListener("load", init);
}
