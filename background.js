const GIFT_URL = "https://www.swordofjustice.com/h5/20260424/vip/index.html#/";
const FALLBACK_CLOSE_MS = 25000;
const DEFAULT_MAX_LOG = 3;

const authorizedTabs = new Set();

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
        chrome.alarms.clear("dailyClaim", () => {
            chrome.alarms.create("dailyClaim", {
                when: target.getTime(),
                periodInMinutes: 24 * 60
            });
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
    chrome.tabs.create({ url: GIFT_URL }, (tab) => {
        const tabId = tab.id;
        authorizedTabs.add(tabId);
        let closed = false;

        function closeTab() {
            if (closed) return;
            closed = true;
            authorizedTabs.delete(tabId);
            chrome.tabs.remove(tabId, () => { chrome.runtime.lastError; });
        }

        const listener = (msg, sender) => {
            if (msg.type === "claimDone" && sender.tab?.id === tabId) {
                chrome.runtime.onMessage.removeListener(listener);
                if (msg.log) saveLog(msg.log);

                // 依設定決定是否關閉分頁
                chrome.storage.local.get("autoClose", (data) => {
                    const shouldClose = data.autoClose !== undefined ? data.autoClose : true;
                    if (shouldClose) closeTab();
                    else authorizedTabs.delete(tabId);
                });
            }
        };
        chrome.runtime.onMessage.addListener(listener);

        // 逾時強制關閉（不論 autoClose 設定，避免分頁殭屍）
        setTimeout(() => {
            chrome.runtime.onMessage.removeListener(listener);
            if (!closed) {
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
        sendResponse({ authorized: authorizedTabs.has(sender.tab?.id) });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    scheduleDaily();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyClaim") {
        chrome.storage.local.get("dailyEnabled", (data) => {
            const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
            if (!enabled) return;
            chrome.storage.local.set({ lastClaim: today() });
            runClaim();
        });
    }
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["lastClaim", "dailyEnabled"], (data) => {
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
        if (!enabled) return;
        if (data.lastClaim !== today()) {
            chrome.storage.local.set({ lastClaim: today() });
            runClaim();
        }
    });
});
