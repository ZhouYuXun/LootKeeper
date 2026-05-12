const GIFT_URL = "https://www.swordofjustice.com/h5/20260424/vip/index.html#/";
const FALLBACK_CLOSE_MS = 35000;
const DEFAULT_MAX_LOG = 3;

// ── 模組層級領取狀態（SW 重啟後重設，不可依賴持久性） ──────────────
let claimInProgress = false;
let claimTabId = null;
let claimFallbackTimer = null;
let claimKeepalive = null;

function today() {
    return new Date().toISOString().slice(0, 10);
}

// ── 診斷日誌 ──────────────────────────────────────────
const DIAG_LOG_MAX = 150;
function diag(type, note = "") {
    const entry = {
        t: new Date().toLocaleString("zh-TW", { hour12: false }),
        type,
        note
    };
    chrome.storage.local.get("diagLog", (data) => {
        const log = data.diagLog || [];
        log.unshift(entry);
        if (log.length > DIAG_LOG_MAX) log.length = DIAG_LOG_MAX;
        chrome.storage.local.set({ diagLog: log });
    });
}

// 取得當下視窗統計（normal / popup / panel / app / devtools）
function _snapshotWindows(cb) {
    chrome.windows.getAll({}, (wins) => {
        const counts = {};
        (wins || []).forEach(w => { counts[w.type] = (counts[w.type] || 0) + 1; });
        const total = wins ? wins.length : 0;
        const summary = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(",") || "無";
        cb({ total, summary });
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

// ── 結束領取流程（清理所有狀態） ──────────────────────
function _finishClaim(tabId, log, errorMsg, forceClose) {
    if (claimFallbackTimer) { clearTimeout(claimFallbackTimer); claimFallbackTimer = null; }
    if (claimKeepalive) { clearInterval(claimKeepalive); claimKeepalive = null; }
    claimInProgress = false;
    claimTabId = null;
    chrome.storage.session.remove("lkAuthorizedTab");

    if (errorMsg) {
        saveLog({
            time: new Date().toLocaleString("zh-TW", { hour12: false }),
            results: [],
            error: errorMsg
        });
        // 失敗不寫 lastClaim，讓 checkMissedClaim 在心跳時重試
    } else if (log) {
        saveLog(log);
        // 唯一寫入點：實際完成領取（即使 log.error 也代表頁面有回應，當日不再重試）
        chrome.storage.local.set({ lastClaim: today() });
    }

    chrome.storage.local.get("autoClose", (data) => {
        const shouldClose = forceClose || (data.autoClose !== undefined ? data.autoClose : false);
        if (shouldClose) {
            diag("tab_close", `tabId=${tabId}`);
            chrome.tabs.remove(tabId, () => { chrome.runtime.lastError; });
        } else {
            diag("tab_keep", `tabId=${tabId}`);
        }
    });
}

// Edge "standalone sidebar mode" 限制偵測（Edge 特有 bug，Microsoft 已知議題）
// 此模式下 tabs.create 與 windows.create 都會被禁止，無 API workaround
const SIDEBAR_RESTRICT_RE = /restricted in standalone sidebar mode/i;
// 12 小時：短於 dailyClaim 週期，避免 pending 跨日仍嘗試恢復
const PENDING_CLAIM_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function _handleSidebarRestriction(errMsg) {
    diag("sidebar_block", `Edge sidebar 模式禁止建立視窗，待 normal 視窗開啟後自動補領`);
    claimInProgress = false;
    chrome.storage.local.set({ pendingClaim: Date.now() });
}

// 建立最小化新視窗（windowless fallback / sidebar fallback 共用）
function _createMinimizedWindow(reason) {
    chrome.windows.create({ url: GIFT_URL, state: "minimized" }, (win) => {
        if (chrome.runtime.lastError || !win?.tabs?.[0]) {
            const errMsg = chrome.runtime.lastError?.message || "win=null";
            if (SIDEBAR_RESTRICT_RE.test(errMsg)) {
                _handleSidebarRestriction(errMsg);
                return;
            }
            diag("tab_fail", `windows.create失敗(${reason})：${errMsg}`);
            claimInProgress = false;
            return;
        }
        _setupClaimTab(win.tabs[0]);
    });
}

function runClaim() {
    if (claimInProgress) {
        diag("run_blocked", "claimInProgress=true，跳過");
        return;
    }
    claimInProgress = true;

    // 只計算 "normal" 視窗類型，排除 popup/sidebar/devtools 等不能 tabs.create 的視窗
    chrome.windows.getAll({ windowTypes: ["normal"] }, (wins) => {
        const normalCount = wins ? wins.length : 0;
        diag("run_start", `normal視窗=${normalCount}`);

        if (normalCount === 0) {
            _createMinimizedWindow("無normal視窗");
            return;
        }

        // 有 normal 視窗時在背景建立分頁
        chrome.tabs.create({ url: GIFT_URL, active: false }, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                const errMsg = chrome.runtime.lastError?.message || "tab=null";
                if (SIDEBAR_RESTRICT_RE.test(errMsg)) {
                    // Edge sidebar 限制：windows.create 也會被擋，直接進入待執行流程
                    _handleSidebarRestriction(errMsg);
                    return;
                }
                diag("tab_fallback", `tabs.create失敗，改建立新視窗：${errMsg}`);
                _createMinimizedWindow("tabs.create失敗fallback");
                return;
            }
            _setupClaimTab(tab);
        });
    });
}

// 待執行領取檢查：當 normal 視窗出現或 SW 喚醒時觸發
function checkPendingClaim(triggerReason) {
    chrome.storage.local.get("pendingClaim", (data) => {
        if (!data.pendingClaim) return;
        const age = Date.now() - data.pendingClaim;
        if (age > PENDING_CLAIM_MAX_AGE_MS) {
            chrome.storage.local.remove("pendingClaim");
            diag("pending_expired", `pendingClaim 超過 12 小時，已清除`);
            return;
        }
        // 確認當前確實有 normal 視窗
        chrome.windows.getAll({ windowTypes: ["normal"] }, (wins) => {
            if (!wins || wins.length === 0) return;
            if (claimInProgress) return;
            chrome.storage.local.remove("pendingClaim");
            diag("sidebar_resume", `${triggerReason}，恢復領取`);
            setTimeout(() => runClaim(), 800);
        });
    });
}

// 監聽新視窗事件：使用者開啟 normal 視窗時自動恢復待執行的領取
chrome.windows.onCreated.addListener((window) => {
    if (window.type !== "normal") return;
    checkPendingClaim(`偵測到 normal 視窗 (id=${window.id})`);
});

function _setupClaimTab(tab) {
    const tabId = tab.id;
    claimTabId = tabId;
    diag("tab_ok", `tabId=${tabId}`);
    chrome.storage.session.set({ lkAuthorizedTab: tabId });

    // MV3 SW 30 秒閒置會被終止；每 20 秒呼叫一次 Chrome API 重置計時器
    claimKeepalive = setInterval(
        () => chrome.storage.session.get("lkAuthorizedTab", () => {}),
        20000
    );

    claimFallbackTimer = setTimeout(() => {
        diag("fallback", `tabId=${tabId}，${FALLBACK_CLOSE_MS / 1000} 秒未收到 claimDone`);
        _finishClaim(tabId, null, `逾時（${FALLBACK_CLOSE_MS / 1000} 秒內頁面未回應）`, true);
    }, FALLBACK_CLOSE_MS);
}

// ── 漏觸發補救：檢查今日是否該領取卻未領取 ────────────
// MV3 alarm 在 Chrome 背景模式 / 電腦睡眠 / SW 過度回收下可能不可靠
// 任何時候 SW 被喚醒，都檢查一次當日預定時間是否已過但 lastClaim 未更新
function checkMissedClaim() {
    chrome.storage.local.get(["claimTime", "dailyEnabled", "lastClaim"], (data) => {
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
        if (!enabled) return;
        if (data.lastClaim === today()) return;
        if (claimInProgress) return;

        const { hour = 5, minute = 10 } = data.claimTime || {};
        const now = new Date();
        const scheduledToday = new Date();
        scheduledToday.setHours(hour, minute, 0, 0);

        if (now.getTime() >= scheduledToday.getTime()) {
            const scheduledStr = scheduledToday.toLocaleTimeString("zh-TW", { hour12: false });
            diag("missed_recover", `應於 ${scheduledStr} 領取但未執行，現補領`);
            // lastClaim 由 _finishClaim 在實際完成時寫入；失敗則下次心跳再試
            runClaim();
        }
    });
}

// ── 確保鬧鐘存在（含心跳備援鬧鐘） ────────────────────
function ensureAlarmsExist() {
    chrome.storage.local.get("dailyEnabled", (data) => {
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
        if (enabled) {
            chrome.alarms.get("dailyClaim", (alarm) => {
                if (!alarm) {
                    diag("alarm_missing", "dailyClaim 鬧鐘不存在，重新排程");
                    scheduleDaily();
                }
            });
        }
        // 心跳鬧鐘：每 30 分鐘喚醒 SW 一次以執行 checkMissedClaim
        // 作為 dailyClaim 在 MV3 中不可靠時的備援
        chrome.alarms.get("heartbeat", (alarm) => {
            if (!alarm) {
                chrome.alarms.create("heartbeat", { periodInMinutes: 30 });
                diag("heartbeat_create", "建立心跳鬧鐘（每 30 分鐘）");
            }
        });
    });
}

// ── SW 啟動時自我檢查（每次 SW 喚醒都會執行） ─────────
// 此 diag 是判斷 alarm 是否能在「Chrome 視窗關閉」狀態下喚醒 SW 的關鍵訊號
_snapshotWindows(({ total, summary }) => {
    chrome.storage.local.get("lastAlive", (data) => {
        const gap = data.lastAlive ? Math.round((Date.now() - data.lastAlive) / 1000) : -1;
        diag("sw_boot", `視窗：${summary}（共${total}），距上次存活：${gap >= 0 ? gap + "s" : "首次"}`);
    });
});

let startupChecksDone = false;
function runStartupChecks() {
    if (startupChecksDone) return;
    startupChecksDone = true;
    ensureAlarmsExist();
    checkMissedClaim();
    checkPendingClaim("SW 啟動");
}
runStartupChecks();

// ── SW 重啟恢復：檢查是否有殘留的授權分頁 ─────────────
// 此程式碼在 SW 每次啟動時執行，以恢復因 SW 終止而中斷的領取流程
chrome.storage.session.get("lkAuthorizedTab", (data) => {
    if (!data.lkAuthorizedTab) return;
    const orphanTabId = data.lkAuthorizedTab;

    chrome.tabs.get(orphanTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
            // 分頁已不存在，清除殘留 session
            diag("sw_cleanup", `tabId=${orphanTabId} 已不存在，清除殘留`);
            chrome.storage.session.remove("lkAuthorizedTab");
            return;
        }

        // 分頁仍存在，再次確認 session 未被其他流程清除（防止與 claimDone 競爭）
        chrome.storage.session.get("lkAuthorizedTab", (data2) => {
            if (!data2.lkAuthorizedTab || claimInProgress) return;

            diag("sw_recover", `tabId=${orphanTabId}，SW重啟，重建監聽與逾時保護`);
            claimInProgress = true;
            claimTabId = orphanTabId;

            claimKeepalive = setInterval(
                () => chrome.storage.session.get("lkAuthorizedTab", () => {}),
                20000
            );

            claimFallbackTimer = setTimeout(() => {
                diag("fallback_recover", `tabId=${orphanTabId}，SW重啟後 ${FALLBACK_CLOSE_MS / 1000} 秒逾時`);
                _finishClaim(orphanTabId, null, "逾時（SW 重啟後未收到頁面回應）", true);
            }, FALLBACK_CLOSE_MS);
        });
    });
});

// ── 來自 popup / content script 的訊息 ────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "claimDone") {
        // 透過 session storage 驗證，不依賴 closure，SW 重啟後仍可正確處理
        const senderTabId = sender.tab?.id;
        chrome.storage.session.get("lkAuthorizedTab", (data) => {
            if (data.lkAuthorizedTab !== senderTabId) {
                diag("claim_done_unauth", `tabId=${senderTabId}，非授權分頁，忽略`);
                return;
            }
            diag("claim_done", `tabId=${senderTabId}，results=${msg.log?.results?.length ?? 0}，error=${msg.log?.error ?? "無"}`);
            _finishClaim(senderTabId, msg.log, null, false);
        });
    } else if (msg.type === "diagStep") {
        // content script 傳來的步驟診斷
        diag(msg.diagType, msg.note || "");
    } else if (msg.type === "manualClaim") {
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
    ensureAlarmsExist();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "dailyClaim") {
        const drift = Math.round((Date.now() - alarm.scheduledTime) / 1000);
        _snapshotWindows(({ summary }) => {
            diag(
                "alarm_fired",
                `預定=${new Date(alarm.scheduledTime).toLocaleString("zh-TW", { hour12: false })}，` +
                `延遲=${drift}s，視窗：${summary}`
            );
        });
        chrome.storage.local.get("dailyEnabled", (data) => {
            const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
            if (!enabled) {
                diag("alarm_skip", "dailyEnabled=false");
                return;
            }
            // 鬧鐘響＝使用者意圖的權威觸發，不檢查 lastClaim。
            // lastClaim 由 _finishClaim 在實際完成時寫入；失敗則下次心跳再試
            runClaim();
        });
    } else if (alarm.name === "heartbeat") {
        // 心跳：證明 SW 仍能被 chrome.alarms 喚醒（背景模式診斷核心訊號）
        // 寫入 lastAlive 供下次 sw_boot 計算間隔
        chrome.storage.local.set({ lastAlive: Date.now() });
        _snapshotWindows(({ summary }) => {
            diag("heartbeat", `視窗：${summary}`);
        });
        checkMissedClaim();
    }
});

chrome.runtime.onStartup.addListener(() => {
    diag("startup", "瀏覽器啟動");
    // 排程由 runStartupChecks() → ensureAlarmsExist() 自動補建；
    // 漏觸發補救由 checkMissedClaim() 處理。
});
