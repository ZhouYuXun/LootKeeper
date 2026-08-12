importScripts("targets.js");

const FALLBACK_CLOSE_MS = 35000;
const DEFAULT_CLAIM_LOG_MAX = 6;

// ── 模組層級領取狀態（SW 重啟後重設，不可依賴持久性） ──────────────
// 佇列本身存在 chrome.storage.session，SW 重啟後仍可續跑
let claimInProgress = false;
let claimFallbackTimer = null;
let claimKeepalive = null;

// 使用「本地時區」日期，不可用 toISOString()（那是 UTC）。
// v2.x 用的是 UTC：台北時間 00:00–08:00 之間執行時，會被算成前一天，
// 導致「昨天 09:00 手動領過 → 今天 05:10 排程被判定為今日已完成而跳過」。
// 單一 VIP 禮包漏一天還能補領，但每日簽到漏一天就永久過期，故必須修正。
function today() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

// ── 診斷日誌 ──────────────────────────────────────────
const DIAG_LOG_MAX = 150;
// 序列化寫入鏈：避免並發 read-modify-write 互相覆蓋
// 返回 Promise 讓 event handler 可 await，延長 SW 生命週期直到 diag 落盤
let _diagWriteChain = Promise.resolve();
function diag(type, note = "") {
    const entry = {
        t: new Date().toLocaleString("zh-TW", { hour12: false }),
        type,
        note
    };
    _diagWriteChain = _diagWriteChain.then(async () => {
        const data = await chrome.storage.local.get("diagLog");
        const log = data.diagLog || [];
        log.unshift(entry);
        if (log.length > DIAG_LOG_MAX) log.length = DIAG_LOG_MAX;
        await chrome.storage.local.set({ diagLog: log });
    }).catch(() => {});  // 吞錯避免鏈斷掉
    return _diagWriteChain;
}

// ── 舊版資料遷移 ──────────────────────────────────────
// v2.x：lastClaim 為字串、pendingClaim 為數字，皆假設只有單一領取目標
async function migrateStorage() {
    const data = await chrome.storage.local.get(["lastClaim", "pendingClaim"]);
    const patch = {};

    if (typeof data.lastClaim === "string") {
        patch.lastClaim = { vip: data.lastClaim };
    }
    if (typeof data.pendingClaim === "number") {
        patch.pendingClaim = { at: data.pendingClaim, queue: ["vip"] };
    }

    if (Object.keys(patch).length > 0) {
        await chrome.storage.local.set(patch);
        await diag("migrated", `v2 → v3 資料遷移：${Object.keys(patch).join(", ")}`);
    }
}

// ── 目標啟用狀態 ──────────────────────────────────────
async function getEnabledTargets() {
    const data = await chrome.storage.local.get("targetsEnabled");
    const enabled = data.targetsEnabled || {};
    // 未設定過的目標預設啟用，讓新版新增的目標自動生效
    return TARGETS.filter(t => enabled[t.id] !== false);
}

// 今日尚未完成的啟用目標
async function getDueTargets() {
    const enabled = await getEnabledTargets();
    const data = await chrome.storage.local.get("lastClaim");
    const last = data.lastClaim || {};
    return enabled.filter(t => last[t.id] !== today());
}

// 取得當下視窗統計（normal / popup / panel / app / devtools）
async function _snapshotWindows() {
    const wins = await chrome.windows.getAll({});
    const counts = {};
    (wins || []).forEach(w => { counts[w.type] = (counts[w.type] || 0) + 1; });
    const total = wins ? wins.length : 0;
    const summary = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(",") || "無";
    return { total, summary };
}

// ── 登入時效量測 ──────────────────────────────────────
// 目的：驗證「登入態撐不到一天」的假設，並直接顯示實際到期時刻。
//
// 網站登入 cookie 是 HttpOnly，網頁 JS 讀不到，但擴充功能的 cookies API
// 讀得到「值」——若值是 JWT，就能解出伺服器認定的 exp。
//
// 安全界線：cookie 值與 token 內容是憑證，只取出時間欄位（exp / iat），
// 絕不寫入 storage、diagLog 或畫面。

// 解析 JWT 的時間欄位；不是 JWT 則回傳 null
// 只讀 payload 的 exp / iat，不保留其餘任何 claim
function decodeJwtTimes(value) {
    if (typeof value !== "string") return null;
    const parts = value.split(".");
    if (parts.length !== 3) return null;
    try {
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
        const payload = JSON.parse(atob(pad));
        if (typeof payload.exp !== "number") return null;
        return {
            exp: payload.exp,
            iat: typeof payload.iat === "number" ? payload.iat : null
        };
    } catch {
        return null;
    }
}

const hoursFrom = (sec) => Number(((sec - Date.now() / 1000) / 3600).toFixed(1));

// 網易通行證登入網域，列為可選權限：安裝時不索取，
// 使用者在設定頁按下按鈕才申請，隨時可在瀏覽器收回
const LOGIN_ORIGINS = ["https://*.163.com/*", "https://*.easebar.com/*"];

async function hasLoginDomainPermission() {
    try {
        return await chrome.permissions.contains({ origins: LOGIN_ORIGINS });
    } catch {
        return false;
    }
}

// quiet=true 時不寫診斷記錄：popup 每次開啟都會自動查詢一次，
// 若每次都記一筆會把 150 筆的診斷日誌洗光
async function probeAuth(tag, quiet = false) {
    const result = {
        at: new Date().toLocaleString("zh-TW", { hour12: false }),
        cookies: [],
        web: []
    };

    result.extended = await hasLoginDomainPermission();

    // 官網網域讀不到登入 cookie（登入態在網易通行證網域），
    // 因此登入網域列為可選權限，使用者授權後才一併查詢
    const filters = [{ domain: "swordofjustice.com" }];
    if (result.extended) filters.push({ domain: "163.com" }, { domain: "easebar.com" });

    const seen = new Set();
    result.scanned = [];
    for (const filter of filters) {
        try {
            const cookies = await chrome.cookies.getAll(filter);
            result.scanned.push({ domain: filter.domain, count: (cookies || []).length });
            for (const c of cookies || []) {
                const id = `${c.domain}|${c.name}`;
                if (seen.has(id)) continue;
                seen.add(id);
                const jwt = decodeJwtTimes(c.value);
                result.cookies.push({
                    name: c.name,
                    domain: c.domain,
                    cookieExpHours: c.expirationDate ? hoursFrom(c.expirationDate) : null,
                    jwtExpHours: jwt ? hoursFrom(jwt.exp) : null,
                    jwtLifetimeHours: jwt?.iat ? Number(((jwt.exp - jwt.iat) / 3600).toFixed(1)) : null
                });
            }
        } catch (e) {
            result.scanned.push({ domain: filter.domain, count: -1 });
            await diag("auth_probe_fail", `${tag} / ${filter.domain}：${e?.message || e}`);
        }
    }

    const { loginSpans } = await chrome.storage.local.get("loginSpans");
    result.loginSpans = loginSpans || { okSince: null, spans: [] };

    // 保留上次由 content script 掃出的 web storage 結果（cookie 單獨查詢時不清掉）
    const prev = await chrome.storage.local.get("authProbe");
    result.web = prev.authProbe?.web || [];
    await chrome.storage.local.set({ authProbe: result });

    if (quiet) return result;

    // 掃描明細寫進診斷：區分「沒授權所以沒掃」與「掃了但這個網域真的沒有 cookie」
    const scanText = result.scanned.map(s =>
        `${s.domain}=${s.count < 0 ? "無權限" : s.count}`).join(" ");
    const jwtHit = result.cookies.find(c => c.jwtExpHours !== null);
    const summary = jwtHit
        ? `${jwtHit.name} JWT 剩 ${jwtHit.jwtExpHours}h（有效期 ${jwtLifetimeText(jwtHit)}）`
        : result.cookies.length === 0
            ? `無 Cookie（登入網域${result.extended ? "已授權" : "未授權"}）掃描：${scanText}`
            : `${result.cookies.length} 個 Cookie 但無 JWT｜掃描：${scanText}`;
    await diag("auth_probe", `${tag}：${summary}`);
    return result;
}

function jwtLifetimeText(item) {
    return item.jwtLifetimeHours === null ? "未知" : `${item.jwtLifetimeHours}h`;
}

// ── 版本更新檢查 ──────────────────────────────────────
// 自架 CRX 自動更新在 Windows 上已被 Chrome 封死（2024 起逐步收緊），
// 因此更新一律是「偵測到新版 → 告知使用者」，實際更新由使用者操作。
const REMOTE_MANIFEST = "https://raw.githubusercontent.com/ZhouYuXun/LootKeeper/main/manifest.json";
const UPDATE_CHECK_INTERVAL_MS = 20 * 60 * 60 * 1000; // 20 小時，略短於每日排程

function parseVer(v) {
    return String(v).split(".").map(n => parseInt(n, 10) || 0);
}
function isNewer(remote, local) {
    const a = parseVer(remote), b = parseVer(local);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] || 0) > (b[i] || 0)) return true;
        if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
}

async function setUpdateBadge(hasUpdate) {
    try {
        await chrome.action.setBadgeText({ text: hasUpdate ? "NEW" : "" });
        if (hasUpdate) {
            await chrome.action.setBadgeBackgroundColor({ color: "#e67e00" });
        }
    } catch { /* action API 在極少數狀態下不可用，不影響其他功能 */ }
}

// force=true 為使用者主動點擊，忽略節流
async function checkUpdate(force = false) {
    const local = chrome.runtime.getManifest().version;
    const stored = await chrome.storage.local.get(["updateInfo"]);
    const info = stored.updateInfo || {};

    if (!force && info.checkedAt && Date.now() - info.checkedAt < UPDATE_CHECK_INTERVAL_MS) {
        return { ...info, local, cached: true };
    }

    try {
        const res = await fetch(REMOTE_MANIFEST, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const remoteManifest = await res.json();
        const remote = remoteManifest.version || "";
        const hasUpdate = isNewer(remote, local);

        // notifiedFor 必須帶著走：漏掉的話這次 set 就把「已通知過」的記錄洗掉，
        // 同一版本每隔一次檢查（約 40 小時）就會重複通知
        const next = { remote, hasUpdate, checkedAt: Date.now(), error: null, notifiedFor: info.notifiedFor };
        await chrome.storage.local.set({ updateInfo: next });
        await setUpdateBadge(hasUpdate);

        // 同一個版本只通知一次，避免每天重複打擾
        if (hasUpdate && info.notifiedFor !== remote) {
            next.notifiedFor = remote;
            await chrome.storage.local.set({ updateInfo: next });
            try {
                await chrome.notifications.create("lk-update", {
                    type: "basic",
                    iconUrl: "icon128.png",
                    title: `LootKeeper：有新版本 v${remote}`,
                    message: "點此前往 GitHub 下載更新。",
                    priority: 1
                });
            } catch (e) {
                await diag("notify_fail", e?.message || String(e));
            }
        }
        await diag("update_check", hasUpdate ? `發現新版 v${remote}（目前 v${local}）` : `已是最新版 v${local}`);
        return { ...next, local, cached: false };
    } catch (e) {
        const next = { ...info, error: e?.message || String(e), checkedAt: Date.now() };
        await chrome.storage.local.set({ updateInfo: next });
        await diag("update_check_fail", next.error);
        return { ...next, local, cached: false };
    }
}

// ── 登入維持時間觀測 ──────────────────────────────────
// 這個站的登入態不放 cookie，若又是不透明的 session ID，憑證身上根本沒有
// 編碼到期時間——那不是權限問題，是原理上讀不到。
//
// 因此改用直接觀測：記錄「最後一次確認還登入著」到「第一次偵測到需重新登入」
// 的間隔。不管憑證放哪、是不是 JWT 都成立。
//
// 注意這是**下限**：okSince 是我們第一次「看到」還登入著的時間，
// 使用者實際登入的時刻更早，因此顯示時必須講明是「至少」。
const LOGIN_SPAN_MAX = 5;

async function recordLoginAlive() {
    const { loginSpans } = await chrome.storage.local.get("loginSpans");
    const s = loginSpans || { okSince: null, spans: [] };
    if (s.okSince) return; // 已在計時中
    s.okSince = Date.now();
    await chrome.storage.local.set({ loginSpans: s });
}

async function recordLoginEnded() {
    const { loginSpans } = await chrome.storage.local.get("loginSpans");
    const s = loginSpans || { okSince: null, spans: [] };
    if (s.okSince) {
        const hours = Number(((Date.now() - s.okSince) / 3600000).toFixed(1));
        s.spans.unshift({ from: s.okSince, to: Date.now(), hours });
        if (s.spans.length > LOGIN_SPAN_MAX) s.spans.length = LOGIN_SPAN_MAX;
        await diag("login_span", `本次登入至少維持 ${hours}h`);
    }
    s.okSince = null;
    await chrome.storage.local.set({ loginSpans: s });
}

// ── 未登入通知 ────────────────────────────────────────
async function notifyLoginRequired(target) {
    const data = await chrome.storage.local.get("loginRequired");
    const flags = data.loginRequired || {};
    flags[target.id] = true;
    await chrome.storage.local.set({ loginRequired: flags });

    try {
        await chrome.notifications.create(`lk-login-${target.id}`, {
            type: "basic",
            iconUrl: "icon128.png",
            title: "LootKeeper：登入已過期",
            message: `「${target.name}」需要重新登入官網才能領取。`,
            priority: 2
        });
    } catch (e) {
        // 通知失敗不影響領取流程本身（例如使用者關閉了系統通知）
        await diag("notify_fail", e?.message || String(e));
    }
}

async function clearLoginRequired(targetId) {
    const data = await chrome.storage.local.get("loginRequired");
    const flags = data.loginRequired || {};
    if (!flags[targetId]) return;
    delete flags[targetId];
    await chrome.storage.local.set({ loginRequired: flags });
    chrome.notifications.clear(`lk-login-${targetId}`, () => { chrome.runtime.lastError; });
}

// ── 排程 ──────────────────────────────────────────────
// 讀取自訂時間後排程；若 dailyEnabled 為 false 則清除排程
// 1 秒內的重複呼叫合併為單次執行，避免 reload 時 3 個入口同時觸發
let _scheduleDailyPromise = null;
function scheduleDaily() {
    if (_scheduleDailyPromise) return _scheduleDailyPromise;
    _scheduleDailyPromise = _scheduleDailyInner().finally(() => {
        setTimeout(() => { _scheduleDailyPromise = null; }, 1000);
    });
    return _scheduleDailyPromise;
}
async function _scheduleDailyInner() {
    const data = await chrome.storage.local.get(["claimTime", "dailyEnabled"]);
    const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;

    if (!enabled) {
        await chrome.alarms.clear("dailyClaim");
        await diag("schedule_off", "dailyEnabled=false，已清除鬧鐘");
        return;
    }

    const { hour = 5, minute = 10 } = data.claimTime || {};
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }
    await chrome.alarms.create("dailyClaim", {
        when: target.getTime(),
        periodInMinutes: 24 * 60
    });
    await diag("scheduled", `下次觸發：${target.toLocaleString("zh-TW", { hour12: false })}`);

    // 立刻回讀 alarm 確認 Chrome 真的接受排程
    const alarm = await chrome.alarms.get("dailyClaim");
    if (!alarm) {
        await diag("alarm_armed_fail", "create 後立即 get 不到，Chrome 未接受排程");
        return;
    }
    const deltaSec = Math.round((alarm.scheduledTime - Date.now()) / 1000);
    await diag("alarm_armed", `Chrome 排定：${new Date(alarm.scheduledTime).toLocaleString("zh-TW", { hour12: false })}，${deltaSec}s 後觸發`);
}

function saveLog(entry) {
    chrome.storage.local.get(["claimLog", "maxLogEntries"], (data) => {
        const max = data.maxLogEntries !== undefined ? data.maxLogEntries : DEFAULT_CLAIM_LOG_MAX;
        const logs = data.claimLog || [];
        logs.unshift(entry);
        if (logs.length > max) logs.length = max;
        chrome.storage.local.set({ claimLog: logs });
    });
}

// ── 佇列 ──────────────────────────────────────────────
// 多目標一律序列化執行：一個目標的分頁處理完才開下一個。
// 併發雖然較快，但會讓 keepalive、逾時保護、授權分頁驗證全部複雜化，
// 而每日只跑一次、每次數十秒，序列化的代價可以忽略。
async function _setQueue(ids) {
    await chrome.storage.session.set({ lkQueue: ids });
}
async function _shiftQueue() {
    const data = await chrome.storage.session.get("lkQueue");
    const queue = data.lkQueue || [];
    const next = queue.shift() || null;
    await chrome.storage.session.set({ lkQueue: queue });
    return next;
}

// 回傳是否真的啟動，讓 popup 能顯示正確狀態而不是永遠顯示「執行中」
async function runClaim(targetIds, reason) {
    if (claimInProgress) {
        await diag("run_blocked", "claimInProgress=true，跳過");
        return { started: false, reason: "busy", count: 0 };
    }
    const ids = (targetIds || []).filter(id => getTarget(id));
    if (ids.length === 0) {
        await diag("run_empty", `${reason}：無待領取目標`);
        return { started: false, reason: "empty", count: 0 };
    }

    claimInProgress = true;
    await _setQueue(ids);
    await diag("run_start", `${reason}，佇列：${ids.join(" → ")}`);
    await probeAuth("領取前");
    _runNext();
    return { started: true, reason: null, count: ids.length };
}

// 取出佇列下一個目標並開分頁；佇列空則收尾
async function _runNext() {
    const nextId = await _shiftQueue();
    if (!nextId) {
        claimInProgress = false;
        await chrome.storage.session.remove(["lkActiveTarget", "lkQueue"]);
        await diag("queue_done", "所有目標處理完畢");
        return;
    }

    const target = getTarget(nextId);
    await chrome.storage.session.set({ lkActiveTarget: nextId });

    // 只計算 "normal" 視窗類型，排除 popup/sidebar/devtools 等不能 tabs.create 的視窗
    const wins = await chrome.windows.getAll({ windowTypes: ["normal"] });
    const normalCount = wins ? wins.length : 0;
    await diag("target_start", `${target.name}（normal視窗=${normalCount}）`);

    if (normalCount === 0) {
        _createMinimizedWindow(target, "無normal視窗");
        return;
    }

    chrome.tabs.create({ url: target.url, active: false }, (tab) => {
        if (chrome.runtime.lastError || !tab) {
            const errMsg = chrome.runtime.lastError?.message || "tab=null";
            if (SIDEBAR_RESTRICT_RE.test(errMsg)) {
                // Edge sidebar 限制：windows.create 也會被擋，直接進入待執行流程
                _handleSidebarRestriction(target);
                return;
            }
            diag("tab_fallback", `tabs.create失敗，改建立新視窗：${errMsg}`);
            _createMinimizedWindow(target, "tabs.create失敗fallback");
            return;
        }
        _setupClaimTab(tab, target);
    });
}

// ── 結束單一目標（清理狀態後續跑佇列） ────────────────
async function _finishClaim(tabId, log, errorMsg, forceClose) {
    if (claimFallbackTimer) { clearTimeout(claimFallbackTimer); claimFallbackTimer = null; }
    if (claimKeepalive) { clearInterval(claimKeepalive); claimKeepalive = null; }
    await chrome.storage.session.remove("lkAuthorizedTab");

    // 逾時等情況下 content script 沒回傳 log，改由 session 補上目標歸屬
    const sess = await chrome.storage.session.get("lkActiveTarget");
    const targetId = log?.target || sess.lkActiveTarget || null;
    const target = getTarget(targetId);

    if (errorMsg) {
        saveLog({
            time: new Date().toLocaleString("zh-TW", { hour12: false }),
            target: targetId,
            targetName: target?.name || "未知目標",
            results: [],
            error: errorMsg,
            loginRequired: false
        });
        // 失敗不寫 lastClaim，讓 checkMissedClaim 在下次喚醒時重試
    } else if (log) {
        saveLog(log);

        if (log.loginRequired && target) {
            // 登入過期不算完成，不寫 lastClaim；改為通知使用者處理
            await recordLoginEnded();
            await notifyLoginRequired(target);
            await probeAuth("登入過期時");
        } else if (targetId) {
            // 頁面有回應且非未登入 = 當下確實還登入著
            await recordLoginAlive();
            // 唯一寫入點：實際完成領取（即使 log.error 也代表頁面有回應，當日不再重試）
            const data = await chrome.storage.local.get("lastClaim");
            const last = data.lastClaim || {};
            last[targetId] = today();
            await chrome.storage.local.set({ lastClaim: last });
            await clearLoginRequired(targetId);
        }
    }

    const data = await chrome.storage.local.get("autoClose");
    const shouldClose = forceClose || (data.autoClose !== undefined ? data.autoClose : false);
    if (shouldClose) {
        await diag("tab_close", `tabId=${tabId}`);
        chrome.tabs.remove(tabId, () => { chrome.runtime.lastError; });
    } else {
        await diag("tab_keep", `tabId=${tabId}`);
    }

    _runNext();
}

// Edge "standalone sidebar mode" 限制偵測（Edge 特有 bug，Microsoft 已知議題）
// 此模式下 tabs.create 與 windows.create 都會被禁止，無 API workaround
const SIDEBAR_RESTRICT_RE = /restricted in standalone sidebar mode/i;
// 12 小時：短於 dailyClaim 週期，避免 pending 跨日仍嘗試恢復
const PENDING_CLAIM_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// 把當前目標與剩餘佇列一起存起來，待有 normal 視窗時整批恢復
async function _handleSidebarRestriction(target) {
    const data = await chrome.storage.session.get("lkQueue");
    const queue = [target.id, ...(data.lkQueue || [])];
    claimInProgress = false;
    await chrome.storage.local.set({ pendingClaim: { at: Date.now(), queue } });
    await diag("sidebar_block", `Edge sidebar 模式禁止建立視窗，待 normal 視窗開啟後自動補領：${queue.join(" → ")}`);
}

// 建立最小化新視窗（windowless fallback / sidebar fallback 共用）
function _createMinimizedWindow(target, reason) {
    chrome.windows.create({ url: target.url, state: "minimized" }, (win) => {
        if (chrome.runtime.lastError || !win?.tabs?.[0]) {
            const errMsg = chrome.runtime.lastError?.message || "win=null";
            if (SIDEBAR_RESTRICT_RE.test(errMsg)) {
                _handleSidebarRestriction(target);
                return;
            }
            diag("tab_fail", `windows.create失敗(${reason})：${errMsg}`);
            claimInProgress = false;
            return;
        }
        _setupClaimTab(win.tabs[0], target);
    });
}

function _setupClaimTab(tab, target) {
    const tabId = tab.id;
    diag("tab_ok", `${target.name} tabId=${tabId}`);
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

// ── 待執行領取檢查：當 normal 視窗出現或 SW 喚醒時觸發 ──
function checkPendingClaim(triggerReason) {
    chrome.storage.local.get("pendingClaim", (data) => {
        const pending = data.pendingClaim;
        if (!pending) return;
        // 舊格式（數字時間戳）在 migrateStorage 之前也可能被讀到，容錯處理
        const at = typeof pending === "number" ? pending : pending.at;
        const queue = typeof pending === "number" ? ["vip"] : (pending.queue || []);

        if (Date.now() - at > PENDING_CLAIM_MAX_AGE_MS) {
            chrome.storage.local.remove("pendingClaim");
            diag("pending_expired", "pendingClaim 超過 12 小時，已清除");
            return;
        }
        // 確認當前確實有 normal 視窗
        chrome.windows.getAll({ windowTypes: ["normal"] }, (wins) => {
            if (!wins || wins.length === 0) return;
            if (claimInProgress) return;
            chrome.storage.local.remove("pendingClaim");
            diag("sidebar_resume", `${triggerReason}，恢復領取`);
            setTimeout(() => runClaim(queue, "sidebar 恢復"), 800);
        });
    });
}

// 監聽新視窗事件：使用者開啟 normal 視窗時自動恢復待執行的領取
chrome.windows.onCreated.addListener((window) => {
    if (window.type !== "normal") return;
    checkPendingClaim(`偵測到 normal 視窗 (id=${window.id})`);
});

// ── 漏觸發補救：檢查今日是否該領取卻未領取 ────────────
// MV3 alarm 在 Chrome 背景模式 / 電腦睡眠 / SW 過度回收下可能不可靠
// 任何時候 SW 被喚醒，都檢查一次當日預定時間是否已過但仍有目標未完成
async function checkMissedClaim() {
    const data = await chrome.storage.local.get(["claimTime", "dailyEnabled"]);
    const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
    if (!enabled) return;
    if (claimInProgress) return;

    const due = await getDueTargets();
    if (due.length === 0) return;

    const { hour = 5, minute = 10 } = data.claimTime || {};
    const now = new Date();
    const scheduledToday = new Date();
    scheduledToday.setHours(hour, minute, 0, 0);
    if (now.getTime() < scheduledToday.getTime()) return;

    const scheduledStr = scheduledToday.toLocaleTimeString("zh-TW", { hour12: false });
    await diag("missed_recover", `應於 ${scheduledStr} 領取但未完成：${due.map(t => t.name).join("、")}`);
    // lastClaim 由 _finishClaim 在實際完成時寫入；失敗則下次喚醒再試
    runClaim(due.map(t => t.id), "漏觸發補救");
}

// ── 確保鬧鐘存在 ──────────────────────────────────────
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
        // 舊版升級遷移：移除 v2.9 以前的 heartbeat 鬧鐘殘留
        chrome.alarms.clear("heartbeat");
    });
}

// ── SW 啟動時自我檢查（每次 SW 喚醒都會執行） ─────────
// sw_boot 自己寫 lastAlive，提供「距上次喚醒」訊號協助排查
(async () => {
    const { total, summary } = await _snapshotWindows();
    const data = await chrome.storage.local.get("lastAlive");
    const gap = data.lastAlive ? Math.round((Date.now() - data.lastAlive) / 1000) : -1;
    const alarm = await chrome.alarms.get("dailyClaim");
    const alarmInfo = alarm
        ? `下次=${new Date(alarm.scheduledTime).toLocaleString("zh-TW", { hour12: false })}`
        : "下次=無";
    await chrome.storage.local.set({ lastAlive: Date.now() });
    await diag(
        "sw_boot",
        `視窗：${summary}（共${total}），距上次喚醒：${gap >= 0 ? gap + "s" : "首次"}，${alarmInfo}`
    );
})();

let startupChecksDone = false;
async function runStartupChecks() {
    if (startupChecksDone) return;
    startupChecksDone = true;
    await migrateStorage();
    ensureAlarmsExist();
    checkMissedClaim();
    checkPendingClaim("SW 啟動");

    // badge 不跨 SW 重啟，依儲存的結果重新套用
    const { updateInfo } = await chrome.storage.local.get("updateInfo");
    if (updateInfo?.hasUpdate) setUpdateBadge(true);
    checkUpdate(); // 自帶 20 小時節流
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
            chrome.storage.session.remove(["lkAuthorizedTab", "lkActiveTarget", "lkQueue"]);
            return;
        }

        // 分頁仍存在，再次確認 session 未被其他流程清除（防止與 claimDone 競爭）
        chrome.storage.session.get("lkAuthorizedTab", (data2) => {
            if (!data2.lkAuthorizedTab || claimInProgress) return;

            diag("sw_recover", `tabId=${orphanTabId}，SW重啟，重建監聽與逾時保護`);
            claimInProgress = true;

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
            diag("claim_done", `${msg.log?.targetName || "?"}：results=${msg.log?.results?.length ?? 0}，error=${msg.log?.error ?? "無"}`);
            _finishClaim(senderTabId, msg.log, null, false);
        });
    } else if (msg.type === "diagStep") {
        // content script 傳來的步驟診斷
        diag(msg.diagType, msg.note || "");
    } else if (msg.type === "manualClaim") {
        // 手動觸發忽略 lastClaim，使用者明確要求就跑
        (async () => {
            const enabled = await getEnabledTargets();
            const ids = msg.targetId ? [msg.targetId] : enabled.map(t => t.id);
            const res = await runClaim(ids, "手動觸發");
            sendResponse({
                status: res.started ? "started" : "skipped",
                reason: res.reason,
                count: res.count
            });
        })();
        return true;
    } else if (msg.type === "getTargets") {
        (async () => {
            const data = await chrome.storage.local.get(["targetsEnabled", "lastClaim", "loginRequired"]);
            const flags = data.targetsEnabled || {};
            const last = data.lastClaim || {};
            const login = data.loginRequired || {};
            sendResponse({
                targets: TARGETS.map(t => ({
                    id: t.id,
                    name: t.name,
                    url: t.url,
                    enabled: flags[t.id] !== false,
                    lastClaim: last[t.id] || null,
                    doneToday: last[t.id] === today(),
                    loginRequired: !!login[t.id]
                }))
            });
        })();
        return true;
    } else if (msg.type === "setTargetEnabled") {
        (async () => {
            const data = await chrome.storage.local.get("targetsEnabled");
            const flags = data.targetsEnabled || {};
            flags[msg.targetId] = msg.enabled;
            await chrome.storage.local.set({ targetsEnabled: flags });
            sendResponse({ status: "ok" });
        })();
        return true;
    } else if (msg.type === "probeAuth") {
        (async () => {
            const result = await probeAuth(msg.quiet ? "自動查詢" : "手動查詢", !!msg.quiet);
            sendResponse({ status: "ok", result });
        })();
        return true;
    } else if (msg.type === "getLoginOrigins") {
        // 由 background 統一持有清單，popup 不另存一份，避免兩處漂移
        sendResponse({ origins: LOGIN_ORIGINS });
    } else if (msg.type === "checkUpdate") {
        (async () => sendResponse(await checkUpdate(!!msg.force)))();
        return true;
    } else if (msg.type === "getAuthProbe") {
        chrome.storage.local.get("authProbe", (data) => sendResponse(data.authProbe || null));
        return true;
    } else if (msg.type === "authProbeWeb") {
        // 來自 content script 的 web storage 掃描結果（只含 key 與時間，不含值）
        (async () => {
            const prev = await chrome.storage.local.get("authProbe");
            const probe = prev.authProbe || { at: null, cookies: [], web: [] };
            probe.web = msg.items || [];
            probe.at = new Date().toLocaleString("zh-TW", { hour12: false });
            await chrome.storage.local.set({ authProbe: probe });
            if (probe.web.length > 0) {
                const w = probe.web[0];
                await diag("auth_probe", `頁面儲存：${w.key} JWT 剩 ${w.jwtExpHours}h`);
            }
        })();
    } else if (msg.type === "reschedule" || msg.type === "forceReschedule") {
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
    } else if (msg.type === "armTestAlarm") {
        // 排 90 秒後一次性 alarm，僅供診斷「無視窗背景模式」是否能喚醒 SW
        (async () => {
            const when = Date.now() + 90 * 1000;
            await chrome.alarms.create("testWake", { when });
            await diag("test_arm", `90s 後觸發：${new Date(when).toLocaleString("zh-TW", { hour12: false })}`);
            sendResponse({ status: "armed", when });
        })();
        return true;
    } else if (msg.type === "checkAuth") {
        const tabId = sender.tab?.id;
        chrome.storage.session.get("lkAuthorizedTab", (data) => {
            const authorized = data.lkAuthorizedTab === tabId;
            diag("check_auth", `tabId=${tabId}，authorized=${authorized}`);
            sendResponse({ authorized });
        });
        return true;
    } else if (msg.type === "contentLoaded") {
        diag("content_loaded", `tabId=${sender.tab?.id}，target=${msg.targetId || "未知"}`);
    }
});

// 點擊「登入過期」通知即開啟該目標頁面，讓使用者直接登入
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === "lk-update") {
        chrome.tabs.create({ url: chrome.runtime.getManifest().homepage_url, active: true });
        chrome.notifications.clear(notificationId, () => { chrome.runtime.lastError; });
        return;
    }
    const targetId = notificationId.replace(/^lk-login-/, "");
    const target = getTarget(targetId);
    if (!target) return;
    chrome.tabs.create({ url: target.url, active: true });
    chrome.notifications.clear(notificationId, () => { chrome.runtime.lastError; });
});

chrome.runtime.onInstalled.addListener((details) => {
    diag("installed", `reason=${details.reason}`);
    migrateStorage();
    // top-level runStartupChecks() 已涵蓋 ensureAlarmsExist；
    // 此處單獨 ensureAlarmsExist() 處理 reload 時 alarm 可能被清空的情況
    // scheduleDaily 自身有 1 秒去重鎖，多次呼叫只執行一次
    ensureAlarmsExist();
});

// async handler：await diag 讓 SW 保持運行直到日誌落盤
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "dailyClaim") {
        const drift = Math.round((Date.now() - alarm.scheduledTime) / 1000);
        const { summary } = await _snapshotWindows();
        await diag(
            "alarm_fired",
            `預定=${new Date(alarm.scheduledTime).toLocaleString("zh-TW", { hour12: false })}，` +
            `延遲=${drift}s，視窗：${summary}`
        );
        const data = await chrome.storage.local.get("dailyEnabled");
        const enabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
        if (!enabled) {
            await diag("alarm_skip", "dailyEnabled=false");
            return;
        }
        const due = await getDueTargets();
        runClaim(due.map(t => t.id), "每日排程");
    } else if (alarm.name === "testWake") {
        const drift = Math.round((Date.now() - alarm.scheduledTime) / 1000);
        const { summary } = await _snapshotWindows();
        await diag("test_fired", `延遲=${drift}s，視窗：${summary} — 證明 SW 可在無視窗時被喚醒`);
    }
});

chrome.runtime.onStartup.addListener(() => {
    diag("startup", "瀏覽器啟動");
    // 排程由 runStartupChecks() → ensureAlarmsExist() 自動補建；
    // 漏觸發補救由 checkMissedClaim() 處理。
});
