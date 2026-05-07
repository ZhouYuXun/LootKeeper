const GIFT_URL = "https://www.swordofjustice.com/h5/20260424/vip/index.html#/";
const FALLBACK_CLOSE_MS = 25000;
const DEFAULT_MAX_LOG = 3;
const _BUILD_SIGNATURE = "LK-MRF-20260502-7f3a";

let claimInProgress = false;

function today() {
    return new Date().toISOString().slice(0, 10);
}

// ── 診斷日誌 ──────────────────────────────────────────
function diag(type, note = "") {
    const entry = {
        t: new Date().toLocaleString("zh-TW", { hour12: false }),
        type,
        note
    };
    chrome.storage.local.get("diagLog", (data) => {
        const log = data.diagLog || [];
        log.unshift(entry);
        if (log.length > 50) log.length = 50;
        chrome.storage.local.set({ diagLog: log });
    });
}

// 讀取自訂時間後排程；若 dailyEnabled 為 false 則清除排程
function scheduleDaily() {
    chrome.storage.local.get(["claimTime", "dailyEnabled"], (data) => {
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;

        if (!enabled) {
            chrome.alarms.clear("dailyClaim");
            diag("schedule_off", "dailyEnabled=false，已清除鬧鐘");
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
        diag("scheduled", `下次觸發：${target.toLocaleString("zh-TW", { hour12: false })}`);
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
    if (claimInProgress) {
        diag("run_blocked", "claimInProgress=true，跳過");
        return;
    }
    claimInProgress = true;

    chrome.windows.getAll({}, (wins) => {
        const winCount = wins ? wins.length : 0;
        diag("run_start", `視窗數=${winCount}，開始建立分頁`);

        if (winCount === 0) {
            // 沒有視窗時建立最小化視窗，確保 content script 能正常注入
            chrome.windows.create({ url: GIFT_URL, state: "minimized" }, (win) => {
                if (chrome.runtime.lastError || !win?.tabs?.[0]) {
                    diag("tab_fail", `windows.create失敗：${chrome.runtime.lastError?.message || "win=null"}`);
                    claimInProgress = false;
                    return;
                }
                _setupClaimTab(win.tabs[0]);
            });
        } else {
            // 有視窗時在背景建立分頁，不搶奪焦點
            chrome.tabs.create({ url: GIFT_URL, active: false }, (tab) => {
                if (chrome.runtime.lastError || !tab) {
                    diag("tab_fail", chrome.runtime.lastError?.message || "tab=null");
                    claimInProgress = false;
                    return;
                }
                _setupClaimTab(tab);
            });
        }
    });
}

function _setupClaimTab(tab) {
    const tabId = tab.id;
    diag("tab_ok", `tabId=${tabId}`);
    chrome.storage.session.set({ lkAuthorizedTab: tabId });
    let closed = false;

    // MV3 SW 30 秒閒置會被終止；每 20 秒呼叫一次 Chrome API 重置計時器
    const keepAlive = setInterval(
        () => chrome.storage.session.get("lkAuthorizedTab", () => {}),
        20000
    );

    function stopKeepAlive() { clearInterval(keepAlive); }

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
            diag("claim_done", `results=${msg.log?.results?.length ?? 0}，error=${msg.log?.error ?? "無"}`);
            if (msg.log) saveLog(msg.log);

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

    const fallbackTimer = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        stopKeepAlive();
        if (!closed) {
            diag("fallback", "25 秒未收到 claimDone");
            claimInProgress = false;
            saveLog({
                time: new Date().toLocaleString("zh-TW", { hour12: false }),
                results: [],
                error: "逾時（25 秒內頁面未回應）"
            });
            closeTab();
        }
    }, FALLBACK_CLOSE_MS);
}

// 來自 popup / content script 的訊息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "manualClaim") {
        runClaim();
        sendResponse({ status: "started" });
    } else if (msg.type === "reschedule") {
        scheduleDaily();
        sendResponse({ status: "ok" });
    } else if (msg.type === "getAlarmStatus") {
        chrome.alarms.get("dailyClaim", (alarm) => {
            sendResponse({
                exists: !!alarm,
                scheduledTime: alarm ? new Date(alarm.scheduledTime).toLocaleString("zh-TW", { hour12: false }) : null,
                periodInMinutes: alarm?.periodInMinutes ?? null
            });
        });
        return true;
    } else if (msg.type === "forceReschedule") {
        scheduleDaily();
        sendResponse({ status: "ok" });
    } else if (msg.type === "checkAuth") {
        const tabId = sender.tab?.id;
        chrome.storage.session.get("lkAuthorizedTab", (data) => {
            const authorized = data.lkAuthorizedTab === tabId;
            diag("check_auth", `tabId=${tabId}，authorized=${authorized}`);
            sendResponse({ authorized });
        });
        return true;
    } else if (msg.type === "contentLoaded") {
        diag("content_loaded", `tabId=${sender.tab?.id}，url=${sender.tab?.url?.slice(0, 60)}`);
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    diag("installed", `reason=${details.reason}`);
    scheduleDaily();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyClaim") {
        diag("alarm_fired", `scheduledTime=${new Date(alarm.scheduledTime).toLocaleString("zh-TW", { hour12: false })}`);
        chrome.storage.local.get(["dailyEnabled", "lastClaim"], (data) => {
            const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
            if (!enabled) {
                diag("alarm_skip", "dailyEnabled=false");
                return;
            }
            if (data.lastClaim === today()) {
                diag("alarm_skip", `lastClaim=${data.lastClaim} 已是今天`);
                return;
            }
            chrome.storage.local.set({ lastClaim: today() });
            runClaim();
        });
    }
});

chrome.runtime.onStartup.addListener(() => {
    diag("startup", "瀏覽器啟動");
    scheduleDaily();
    chrome.storage.local.get(["lastClaim", "dailyEnabled"], (data) => {
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
        if (!enabled) return;
        if (data.lastClaim !== today()) {
            diag("startup_claim", `lastClaim=${data.lastClaim}，補領`);
            chrome.storage.local.set({ lastClaim: today() });
            runClaim();
        } else {
            diag("startup_skip", `lastClaim=${data.lastClaim} 已是今天`);
        }
    });
});
