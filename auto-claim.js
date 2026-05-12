// 向 background 寫入診斷步驟（fire-and-forget）
function diagStep(type, note = "") {
    chrome.runtime.sendMessage({ type: "diagStep", diagType: type, note });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 使用 MutationObserver 取代 requestAnimationFrame polling
// 在背景 tab / 最小化視窗中 RAF 被降速至 1fps，Observer 則即時觸發
function waitForElement(selector, timeout = 8000) {
    return new Promise(resolve => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const timer = setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);

        const observer = new MutationObserver(() => {
            const found = document.querySelector(selector);
            if (found) {
                clearTimeout(timer);
                observer.disconnect();
                resolve(found);
            }
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}

async function autoClaim() {
    const log = {
        time: new Date().toLocaleString("zh-TW", { hour12: false }),
        results: [],
        error: null
    };

    // 點進禮包分頁（用 class 定位，不依賴文字）
    const giftIcon = await waitForElement(".privilege-icon--gift");
    if (!giftIcon) {
        log.error = "找不到禮包圖示，頁面可能未正常載入或需要重新登入";
        diagStep("gift_icon_fail", "等待 .privilege-icon--gift 逾時");
        chrome.runtime.sendMessage({ type: "claimDone", log });
        return;
    }
    diagStep("gift_icon_click", "點擊禮包圖示");
    (giftIcon.closest(".privilege-item") || giftIcon).click();

    // 等待禮包卡片出現（SPA 渲染完成）
    const firstCard = await waitForElement(".gift-card");
    if (!firstCard) {
        log.error = "進入禮包頁面逾時，可能導向失敗";
        diagStep("gift_page_fail", "等待 .gift-card 逾時");
        chrome.runtime.sendMessage({ type: "claimDone", log });
        return;
    }
    await sleep(500); // 等待所有卡片完整渲染

    // 逐一處理每張禮包卡片
    const cards = [...document.querySelectorAll(".gift-card")];
    diagStep("gift_cards_found", `共 ${cards.length} 張卡片`);

    for (const card of cards) {
        const name = card.querySelector(".gift-type-name")?.textContent.trim() || "未知禮包";

        if (card.classList.contains("gift-card--claimable")) {
            const btn = card.querySelector(".btn-claim");
            if (btn) {
                btn.click();
                await sleep(800);
                log.results.push({ name, status: "success", note: "成功點擊領取" });
            } else {
                log.results.push({ name, status: "skipped", note: "找不到領取按鈕" });
            }
        } else if (card.classList.contains("gift-card--claimed")) {
            log.results.push({ name, status: "skipped", note: "已領過" });
        } else if (card.classList.contains("gift-card--locked")) {
            log.results.push({ name, status: "not_found", note: "尚未解鎖" });
        } else {
            log.results.push({ name, status: "not_found", note: `狀態未知 (${[...card.classList].join(" ")})` });
        }
    }

    chrome.runtime.sendMessage({ type: "claimDone", log });
}

function init() {
    // 通知 background content script 已載入（診斷用）
    chrome.runtime.sendMessage({ type: "contentLoaded" });

    // SW cold start 競態：第一次 sendMessage 可能在 onMessage listener 註冊前送達
    // 失敗則 500ms 後重試一次
    const tryCheckAuth = (retries) => {
        chrome.runtime.sendMessage({ type: "checkAuth" }, (res) => {
            const err = chrome.runtime.lastError;
            if (err || !res) {
                if (retries > 0) setTimeout(() => tryCheckAuth(retries - 1), 500);
                return;
            }
            if (res.authorized) setTimeout(autoClaim, 2000);
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
