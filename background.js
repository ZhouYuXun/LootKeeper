const GIFT_URL = "https://www.swordofjustice.com/h5/20260424/vip/index.html#/";
const FALLBACK_CLOSE_MS = 25000;
const DEFAULT_MAX_LOG = 3;
const _BUILD_SIGNATURE = "LK-MRF-20260502-7f3a";

let claimInProgress = false;

function today() {
    return new Date().toISOString().slice(0, 10);
}

// 讀取自訂時間後排程；若 dailyEnabled 為 false 則清除排程
function scheduleDaily() {
    chrome.storage.local.get(["claimTime", "dailyEnabled"], (data) => {
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;

        if (!enabled) {
            chrome.alarms.clear("dailyClaim");
            return;
        }

        const { hour = 5, minute = 10 } = data.claimTime || {};
        const now = new Date();
        const target = new Date();
        target.setHours(hour, minute, 0, 0);
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }
        chrome.alarms.create("dailyClaim", {
            when: target.getTime(),
            periodInMinutes: 24 * 60
        });
    });
}

function saveLog(entry) {
    chrome.storage.local.get(["claimLog", "maxLogEntries"], (data) => {
        const max = data.maxLogEntries !== undefined ? data.maxLogEntries : DEFAULT_MAX_LOG;
        const logs = data.claimLog || [];
        logs.unshift(entry);
        if (logs.length > max) logs.length = max;
        chrome.storage.local.set({ claimLog: logs });
    });
}

function runClaim() {
    if (claimInProgress) return;
    claimInProgress = true;
    chrome.tabs.create({ url: GIFT_URL }, (tab) => {
        if (chrome.runtime.lastError || !tab) {
            claimInProgress = false;
            return;
        }
        const tabId = tab.id;
        chrome.storage.session.set({ lkAuthorizedTab: tabId });
        let closed = false;

        // MV3 SW 30 秒閒置會被終止；每 20 秒呼叫一次 Chrome API 重置計時器，
        // 確保 SW 在分頁載入完成並收到 claimDone 之前不被殺掉
        const keepAlive = setInterval(
            () => chrome.storage.session.get("lkAuthorizedTab", () => {}),
            20000
        );

        function stopKeepAlive() {
            clearInterval(keepAlive);
        }

        function closeTab() {
            if (closed) return;
            closed = true;
            claimInProgress = false;
            chrome.storage.session.remove("lkAuthorizedTab");
            chrome.tabs.remove(tabId, () => { chrome.runtime.lastError; });
        }

        const listener = (msg, sender) => {
            if (msg.type === "claimDone" && sender.tab?.id === tabId) {
                chrome.runtime.onMessage.removeListener(listener);
                clearTimeout(fallbackTimer);
                stopKeepAlive();
                if (msg.log) saveLog(msg.log);

                // 依設定決定是否關閉分頁
                chrome.storage.local.get("autoClose", (data) => {
                    const shouldClose = data.autoClose !== undefined ? data.autoClose : false;
                    if (shouldClose) closeTab();
                    else {
                        closed = true;
                        claimInProgress = false;
                        chrome.storage.session.remove("lkAuthorizedTab");
                    }
                });
            }
        };
        chrome.runtime.onMessage.addListener(listener);

        // 逾時強制關閉（不論 autoClose 設定，避免分頁殭屍）
        const fallbackTimer = setTimeout(() => {
            chrome.runtime.onMessage.removeListener(listener);
            stopKeepAlive();
            if (!closed) {
                claimInProgress = false;
                saveLog({
                    time: new Date().toLocaleString("zh-TW", { hour12: false }),
                    results: [],
                    error: "逾時（25 秒內頁面未回應）"
                });
                closeTab();
            }
        }, FALLBACK_CLOSE_MS);
    });
}

// 來自 popup / content script 的訊息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "manualClaim") {
        runClaim();
        sendResponse({ status: "started" });
    } else if (msg.type === "reschedule") {
        scheduleDaily();
        sendResponse({ status: "ok" });
    } else if (msg.type === "checkAuth") {
        chrome.storage.session.get("lkAuthorizedTab", (data) => {
            sendResponse({ authorized: data.lkAuthorizedTab === sender.tab?.id });
        });
        return true; // 非同步回應需保持 channel 開啟
    }
});

chrome.runtime.onInstalled.addListener(() => {
    scheduleDaily();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyClaim") {
        chrome.storage.local.get(["dailyEnabled", "lastClaim"], (data) => {
            const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
            if (!enabled) return;
            if (data.lastClaim === today()) return;
            chrome.storage.local.set({ lastClaim: today() });
            runClaim();
        });
    }
});

chrome.runtime.onStartup.addListener(() => {
    scheduleDaily();
    chrome.storage.local.get(["lastClaim", "dailyEnabled"], (data) => {
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
        if (!enabled) return;
        if (data.lastClaim !== today()) {
            chrome.storage.local.set({ lastClaim: today() });
            runClaim();
        }
    });
});
