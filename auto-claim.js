function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function waitForText(text, timeout = 8000) {
    return new Promise(resolve => {
        const start = Date.now();
        (function check() {
            const el = [...document.querySelectorAll("uni-text")]
                .find(e => e.innerText.trim() === text);
            if (el) return resolve(el);
            if (Date.now() - start > timeout) return resolve(null);
            requestAnimationFrame(check);
        })();
    });
}

function waitForElement(selector, timeout = 8000) {
    return new Promise(resolve => {
        const start = Date.now();
        (function check() {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            if (Date.now() - start > timeout) return resolve(null);
            requestAnimationFrame(check);
        })();
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
        chrome.runtime.sendMessage({ type: "claimDone", log });
        return;
    }
    (giftIcon.closest(".privilege-item") || giftIcon).click();

    // 等待禮包卡片出現（SPA 渲染完成）
    const firstCard = await waitForElement(".gift-card");
    if (!firstCard) {
        log.error = "進入禮包頁面逾時，可能導向失敗";
        chrome.runtime.sendMessage({ type: "claimDone", log });
        return;
    }
    await sleep(500); // 等待所有卡片完整渲染

    // 逐一處理每張禮包卡片
    const cards = [...document.querySelectorAll(".gift-card")];
    for (const card of cards) {
        const name = card.querySelector(".gift-type-name")?.innerText.trim() || "未知禮包";

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
            log.results.push({ name, status: "skipped", note: "今日已領過" });
        } else if (card.classList.contains("gift-card--locked")) {
            log.results.push({ name, status: "not_found", note: "尚未解鎖" });
        } else {
            log.results.push({ name, status: "not_found", note: `狀態未知 (${[...card.classList].join(" ")})` });
        }
    }

    chrome.runtime.sendMessage({ type: "claimDone", log });
}

window.addEventListener("load", () => {
    chrome.runtime.sendMessage({ type: "checkAuth" }, (res) => {
        if (res?.authorized) setTimeout(autoClaim, 2000);
    });
});
