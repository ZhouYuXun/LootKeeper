// ── 分頁切換 ──────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.tab;
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("tab-" + target).classList.add("active");
        if (target === "log") renderLog();
    });
});

// ── 記錄 badge ────────────────────────────────────────
function getBadge(status) {
    switch (status) {
        case "success":   return { cls: "badge-success", label: "✓ 成功" };
        case "skipped":   return { cls: "badge-skipped", label: "已領過" };
        case "not_found": return { cls: "badge-locked",  label: "未解鎖" };
        default:          return { cls: "badge-unknown",  label: status };
    }
}

// ── 登入過期橫幅 ──────────────────────────────────────
// 登入態無法由擴充功能自行續期，只能明確告知使用者去登入
function renderLoginBanner() {
    chrome.runtime.sendMessage({ type: "getTargets" }, (res) => {
        const banner = document.getElementById("loginBanner");
        if (chrome.runtime.lastError || !res) { banner.style.display = "none"; return; }

        const need = res.targets.filter(t => t.loginRequired);
        if (need.length === 0) { banner.style.display = "none"; return; }

        banner.style.display = "";
        banner.innerHTML = `<strong>⚠ 登入已過期</strong>　${need.map(t => t.name).join("、")} 無法領取。
          點此開啟官網重新登入。`;
        banner.onclick = () => chrome.tabs.create({ url: need[0].url });
    });
}

// ── 渲染記錄列表 ──────────────────────────────────────
function renderLog() {
    renderLoginBanner();
    chrome.storage.local.get("claimLog", (data) => {
        const lastRunEl = document.getElementById("lastRun");
        const latest = data.claimLog?.[0];
        if (latest) {
            lastRunEl.innerHTML = `最後執行：<span>${latest.time}</span>`;
        } else {
            lastRunEl.innerHTML = "最後執行：<span>尚無記錄</span>";
        }

        const logs = data.claimLog || [];
        const container = document.getElementById("log");
        container.innerHTML = "";

        if (logs.length === 0) {
            container.innerHTML = '<div class="empty">尚無領取記錄</div>';
            return;
        }

        logs.forEach(entry => {
            const successCount = entry.results?.filter(r => r.status === "success").length ?? 0;
            const total = entry.results?.length ?? 0;

            let entryClass = "", summaryClass = "", summaryText = "";
            if (entry.loginRequired) {
                entryClass = "has-error"; summaryClass = "summary-error"; summaryText = "需登入";
            } else if (entry.error) {
                entryClass = "has-error"; summaryClass = "summary-error"; summaryText = "失敗";
            } else if (successCount === total && total > 0) {
                entryClass = "has-success"; summaryClass = "summary-success"; summaryText = `${successCount} / ${total} 成功`;
            } else if (successCount > 0) {
                entryClass = "has-partial"; summaryClass = "summary-partial"; summaryText = `${successCount} / ${total} 成功`;
            } else {
                summaryClass = "summary-partial"; summaryText = `0 / ${total} 成功`;
            }

            const div = document.createElement("div");
            div.className = `entry ${entryClass}`;

            const head = document.createElement("div");
            head.className = "entry-head";
            head.title = "點擊重新整理";
            // v2.x 的舊記錄沒有 target 欄位，略過標籤即可
            const targetTag = entry.targetName
                ? `<span class="entry-target">${escapeHtml(entry.targetName)}</span>`
                : "";
            head.innerHTML = `
              <span class="entry-time">${targetTag}${entry.time}</span>
              <span class="entry-summary ${summaryClass}">${summaryText}</span>
            `;
            head.addEventListener("click", renderLog);
            div.appendChild(head);

            const body = document.createElement("div");
            body.className = "entry-body";

            if (entry.error) {
                body.innerHTML = `<div class="error-msg">⚠ ${entry.error}</div>`;
            } else {
                entry.results.forEach(r => {
                    const { cls, label } = getBadge(r.status);
                    const row = document.createElement("div");
                    row.className = "gift-row";
                    row.innerHTML = `
                      <span class="gift-name">${r.name}</span>
                      <span class="gift-right">
                        <span class="badge ${cls}">${label}</span>
                        <span class="gift-note">${r.note}</span>
                      </span>
                    `;
                    body.appendChild(row);
                });
            }

            div.appendChild(body);
            container.appendChild(div);
        });
    });
}

// ── 清空記錄 ──────────────────────────────────────────
document.getElementById("clearLogBtn").addEventListener("click", () => {
    chrome.storage.local.remove("claimLog", () => renderLog());
});

// ── 立即領取 ──────────────────────────────────────────
document.getElementById("claimBtn").addEventListener("click", () => {
    const btn = document.getElementById("claimBtn");
    const status = document.getElementById("status");
    btn.disabled = true;
    status.className = "";
    status.textContent = "確認中…";

    chrome.runtime.sendMessage({ type: "manualClaim" }, (res) => {
        if (chrome.runtime.lastError || !res) {
            btn.disabled = false;
            status.className = "";
            status.textContent = "";
            return;
        }
        if (res.status !== "started") {
            btn.disabled = false;
            status.className = "";
            status.textContent = res.reason === "busy" ? "已在執行中" : "無啟用的目標";
            setTimeout(() => { status.textContent = ""; }, 2500);
            return;
        }
        {
            status.className = "success";
            status.textContent = `執行中…（${res.count} 項）`;
            // 多目標序列化執行，等待時間依目標數放大
            setTimeout(() => {
                btn.disabled = false;
                status.textContent = "";
                renderLog();
                renderTargets();
            }, 3000 + res.count * 3000);
        }
    });
});

// ── 記錄列表滾動 ──────────────────────────────────────
function syncLogScroll(max) {
    document.getElementById("log").classList.toggle("scrollable", max > 5);
}

// ── 設定：領取目標清單 ────────────────────────────────
// 清單由 background 依 targets.js 動態產生，新增目標不必改這裡
function renderTargets() {
    chrome.runtime.sendMessage({ type: "getTargets" }, (res) => {
        const box = document.getElementById("targetList");
        if (chrome.runtime.lastError || !res) {
            box.innerHTML = '<div class="empty">讀取失敗</div>';
            return;
        }
        box.innerHTML = "";
        res.targets.forEach(t => {
            let stateCls = "pending", stateText = "今日尚未領取";
            if (t.loginRequired) {
                stateCls = "login"; stateText = "需重新登入";
            } else if (t.doneToday) {
                stateCls = "done"; stateText = "今日已完成";
            } else if (!t.enabled) {
                stateCls = "pending"; stateText = "已停用";
            }

            const row = document.createElement("div");
            row.className = "target-row";

            const name = document.createElement("span");
            name.className = "target-name";
            name.innerHTML = `${escapeHtml(t.name)}<small>${t.lastClaim ? "上次：" + escapeHtml(t.lastClaim) : "尚無記錄"}</small>`;

            const right = document.createElement("div");
            right.className = "target-right";

            const state = document.createElement("span");
            state.className = `target-state ${stateCls}`;
            state.textContent = stateText;

            const sel = document.createElement("select");
            sel.className = "setting-select";
            sel.innerHTML = '<option value="on">開啟</option><option value="off">關閉</option>';
            sel.value = t.enabled ? "on" : "off";
            sel.addEventListener("change", (e) => {
                chrome.runtime.sendMessage(
                    { type: "setTargetEnabled", targetId: t.id, enabled: e.target.value === "on" },
                    () => renderTargets()
                );
            });

            right.appendChild(state);
            right.appendChild(sel);
            row.appendChild(name);
            row.appendChild(right);
            box.appendChild(row);
        });
    });
}

// ── 設定：載入 ────────────────────────────────────────
function loadSettings() {
    chrome.storage.local.get(["claimTime", "autoClose", "dailyEnabled", "maxLogEntries"], (data) => {
        const t = data.claimTime || { hour: 5, minute: 10 };
        document.getElementById("hourInput").value   = String(t.hour).padStart(2, "0");
        document.getElementById("minuteInput").value = String(t.minute).padStart(2, "0");

        const autoClose = data.autoClose !== undefined ? data.autoClose : false;
        document.getElementById("autoCloseToggle").value = autoClose ? "on" : "off";
        const dailyEnabled = data.dailyEnabled !== undefined ? data.dailyEnabled : true;
        document.getElementById("dailyToggle").value = dailyEnabled ? "on" : "off";
        syncTimeRowVisibility(dailyEnabled);
        // 預設 6：兩個目標各產生一筆記錄，3 筆只夠看一天半
        const maxLog = data.maxLogEntries !== undefined ? data.maxLogEntries : 6;
        document.getElementById("maxLogInput").value = String(maxLog);
        syncLogScroll(maxLog);
    });
}

// ── 設定：儲存時間 ────────────────────────────────────
document.getElementById("saveTimeBtn").addEventListener("click", () => {
    const hour   = Math.min(23, Math.max(0, parseInt(document.getElementById("hourInput").value)   || 0));
    const minute = Math.min(59, Math.max(0, parseInt(document.getElementById("minuteInput").value) || 0));
    const timeStatus = document.getElementById("timeStatus");

    chrome.storage.local.set({ claimTime: { hour, minute } }, () => {
        chrome.runtime.sendMessage({ type: "reschedule" });
        timeStatus.textContent = "已儲存";
        setTimeout(() => { timeStatus.textContent = ""; }, 2000);
    });
});

// ── 設定：領取後關閉頁面 ──────────────────────────────
document.getElementById("autoCloseToggle").addEventListener("change", (e) => {
    chrome.storage.local.set({ autoClose: e.target.value === "on" });
});

// ── 設定：每日自動領取 ────────────────────────────────
function syncTimeRowVisibility(enabled) {
    document.getElementById("timeRow").style.display = enabled ? "" : "none";
}

document.getElementById("dailyToggle").addEventListener("change", (e) => {
    const enabled = e.target.value === "on";
    syncTimeRowVisibility(enabled);
    chrome.storage.local.set({ dailyEnabled: enabled }, () => {
        chrome.runtime.sendMessage({ type: "reschedule" });
    });
});

// ── 設定：歷史紀錄筆數 ────────────────────────────────
document.getElementById("maxLogInput").addEventListener("change", (e) => {
    const val = parseInt(e.target.value) || 6;
    syncLogScroll(val);
    chrome.storage.local.set({ maxLogEntries: val });
});

// ── 檢查更新 ──────────────────────────────────────────
const REMOTE_MANIFEST = "https://raw.githubusercontent.com/ZhouYuXun/LootKeeper/main/manifest.json";

function parseVer(v) {
    return String(v).split(".").map(Number);
}
function isNewer(remote, local) {
    const a = parseVer(remote), b = parseVer(local);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] || 0) > (b[i] || 0)) return true;
        if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
}

function checkUpdate() {
    const btn = document.getElementById("checkUpdateBtn");
    const statusEl = document.getElementById("updateStatus");
    btn.disabled = true;
    statusEl.className = "update-status";
    statusEl.textContent = "檢查中…";

    fetch(REMOTE_MANIFEST)
        .then(r => r.json())
        .then(data => {
            const remote = data.version || "";
            const local = chrome.runtime.getManifest().version;
            if (isNewer(remote, local)) {
                const ver = document.createTextNode(`發現新版本 v${remote} · `);
                const link = document.createElement("a");
                link.href = "https://github.com/ZhouYuXun/LootKeeper";
                link.target = "_blank";
                link.className = "update-link";
                link.textContent = "前往下載";
                statusEl.textContent = "";
                statusEl.appendChild(ver);
                statusEl.appendChild(link);
                statusEl.className = "update-status has-update";
            } else {
                statusEl.textContent = "已是最新版本";
                statusEl.className = "update-status up-to-date";
            }
        })
        .catch(() => {
            statusEl.textContent = "網路錯誤，請稍後再試";
            statusEl.className = "update-status error";
        })
        .finally(() => { btn.disabled = false; });
}

document.getElementById("checkUpdateBtn").addEventListener("click", checkUpdate);

// ── 診斷日誌 ──────────────────────────────────────────
const DIAG_TYPE_STYLE = {
    alarm_fired:        { color: "#1a7a1a", icon: "🔔" },
    alarm_skip:         { color: "#888",    icon: "⏭" },
    run_start:          { color: "#1a7a1a", icon: "▶" },
    run_blocked:        { color: "#e67e00", icon: "⛔" },
    run_empty:          { color: "#888",    icon: "∅" },
    target_start:       { color: "#1a7a1a", icon: "🎯" },
    queue_done:         { color: "#1a7a1a", icon: "🏁" },
    migrated:           { color: "#555",    icon: "🔄" },
    login_required:     { color: "#c00",    icon: "🔒" },
    auth_probe:         { color: "#0a6",    icon: "🍪" },
    auth_probe_fail:    { color: "#c00",    icon: "🍪" },
    notify_fail:        { color: "#e67e00", icon: "🔕" },
    page_timeout:       { color: "#c00",    icon: "⏳" },
    handler_missing:    { color: "#c00",    icon: "❓" },
    handler_error:      { color: "#c00",    icon: "💥" },
    checkin_week:       { color: "#555",    icon: "📆" },
    checkin_click:      { color: "#555",    icon: "👆" },
    checkin_btn_fail:   { color: "#c00",    icon: "🔍" },
    checkin_unconfirmed:{ color: "#e67e00", icon: "⚠" },
    tab_ok:             { color: "#1a7a1a", icon: "🌐" },
    tab_fail:           { color: "#c00",    icon: "❌" },
    tab_fallback:       { color: "#e67e00", icon: "↩" },
    sidebar_block:      { color: "#e67e00", icon: "⏸" },
    sidebar_resume:     { color: "#1a7a1a", icon: "▶" },
    pending_expired:    { color: "#888",    icon: "🗑" },
    tab_close:          { color: "#555",    icon: "🚪" },
    tab_keep:           { color: "#555",    icon: "📌" },
    check_auth:         { color: "#555",    icon: "🔑" },
    content_loaded:     { color: "#555",    icon: "📄" },
    gift_icon_click:    { color: "#555",    icon: "👆" },
    gift_icon_fail:     { color: "#c00",    icon: "🔍" },
    gift_page_fail:     { color: "#c00",    icon: "🔍" },
    gift_cards_found:   { color: "#1a7a1a", icon: "🎁" },
    claim_done:         { color: "#1a7a1a", icon: "✅" },
    claim_done_unauth:  { color: "#e67e00", icon: "⚠" },
    fallback:           { color: "#c00",    icon: "⏱" },
    fallback_recover:   { color: "#c00",    icon: "⏱" },
    sw_recover:         { color: "#e67e00", icon: "♻" },
    sw_cleanup:         { color: "#888",    icon: "🧹" },
    missed_recover:     { color: "#e67e00", icon: "⏰" },
    alarm_missing:      { color: "#c00",    icon: "⚠" },
    sw_boot:            { color: "#1a7a1a", icon: "⚡" },
    alarm_armed:        { color: "#1a7a1a", icon: "🔐" },
    alarm_armed_fail:   { color: "#c00",    icon: "🔓" },
    test_arm:           { color: "#1a7a1a", icon: "🧪" },
    test_fired:         { color: "#1a7a1a", icon: "🧪" },
    scheduled:          { color: "#555",    icon: "📅" },
    schedule_off:       { color: "#888",    icon: "🔕" },
    startup:            { color: "#555",    icon: "🚀" },
    installed:          { color: "#555",    icon: "📦" },
};

// 將 "2026/5/11 13:28:33" 簡化為 "13:28:33"
function shortTime(t) {
    if (!t) return "";
    const parts = String(t).split(" ");
    return parts[parts.length - 1] || t;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function renderDiag() {
    chrome.storage.local.get("diagLog", (data) => {
        const container = document.getElementById("diagContainer");
        const logs = data.diagLog || [];
        if (logs.length === 0) {
            container.innerHTML = '<div class="diag-empty">尚無診斷記錄</div>';
            return;
        }
        container.innerHTML = "";
        logs.forEach(entry => {
            const style = DIAG_TYPE_STYLE[entry.type] || { color: "#888", icon: "•" };
            const hasNote = !!(entry.note && entry.note.length > 0);
            const row = document.createElement("div");
            row.className = "diag-row" + (hasNote ? "" : " no-note");
            row.title = entry.t; // 完整時間放 tooltip
            row.innerHTML = `
              <span class="diag-icon">${style.icon}</span>
              <span class="diag-type" style="color:${style.color}">${escapeHtml(entry.type)}</span>
              <span class="diag-time">${escapeHtml(shortTime(entry.t))}</span>
              ${hasNote ? `<span class="diag-note">${escapeHtml(entry.note)}</span>` : ""}
            `;
            container.appendChild(row);
        });
    });
}

document.getElementById("diagToggleBtn").addEventListener("click", () => {
    const panel = document.getElementById("diagPanel");
    const btn = document.getElementById("diagToggleBtn");
    const hidden = panel.style.display === "none";
    panel.style.display = hidden ? "" : "none";
    btn.textContent = hidden ? "隱藏診斷" : "顯示診斷";
    if (hidden) {
        renderDiag();
        chrome.runtime.sendMessage({ type: "getAuthProbe" }, (probe) => {
            if (!chrome.runtime.lastError) renderAuthProbe(probe);
        });
    }
});

document.getElementById("clearDiagBtn").addEventListener("click", () => {
    chrome.storage.local.remove("diagLog", () => renderDiag());
});

document.getElementById("queryAlarmBtn").addEventListener("click", () => {
    const el = document.getElementById("alarmStatusText");
    el.style.color = "#888";
    el.textContent = "查詢中…";
    chrome.runtime.sendMessage({ type: "getAlarmStatus" }, (res) => {
        if (chrome.runtime.lastError || !res) {
            el.style.color = "#c00";
            el.textContent = "查詢失敗：" + (chrome.runtime.lastError?.message || "無回應");
            return;
        }
        if (!res.exists) {
            el.style.color = "#c00";
            el.textContent = "❌ 鬧鐘不存在（dailyClaim alarm missing）";
        } else {
            el.style.color = "#1a7a1a";
            el.textContent = `✓ 下次：${res.scheduledTime}　週期：${res.periodInMinutes} 分`;
        }
    });
});

document.getElementById("testWakeBtn").addEventListener("click", () => {
    const el = document.getElementById("alarmStatusText");
    el.style.color = "#888";
    el.textContent = "排定 90 秒測試…";
    chrome.runtime.sendMessage({ type: "armTestAlarm" }, (res) => {
        if (chrome.runtime.lastError || !res) {
            el.style.color = "#c00";
            el.textContent = "排定失敗：" + (chrome.runtime.lastError?.message || "無回應");
            return;
        }
        const at = new Date(res.when).toLocaleTimeString("zh-TW", { hour12: false });
        el.style.color = "#1a7a1a";
        el.textContent = `已排 ${at}，請關所有視窗等待，回來看是否有 test_fired`;
    });
});

document.getElementById("forceRescheduleBtn").addEventListener("click", () => {
    const el = document.getElementById("alarmStatusText");
    el.style.color = "#888";
    el.textContent = "重設中…";
    chrome.runtime.sendMessage({ type: "forceReschedule" }, (res) => {
        if (chrome.runtime.lastError || !res) {
            el.style.color = "#c00";
            el.textContent = "重設失敗：" + (chrome.runtime.lastError?.message || "無回應");
            return;
        }
        el.style.color = "#1a7a1a";
        el.textContent = "已重設，點擊「查詢」確認新時間";
    });
});

// 讀取登入 cookie 剩餘時效，寫入診斷記錄
// 用於驗證「登入態撐不到一天」的假設，只記錄名稱與剩餘時數
// ── 登入時效顯示 ──────────────────────────────────────
// 三個數字意義不同：cookie 何時被瀏覽器丟掉、token 何時被伺服器判定失效、
// token 簽發到失效的總長度（直接回答「有效期是不是小於一天」）
function fmtHours(h) {
    if (h === null || h === undefined) return "—";
    if (h < 0) return `已過期 ${Math.abs(h).toFixed(1)}h`;
    if (h < 1) return `${Math.round(h * 60)} 分`;
    if (h > 48) return `${(h / 24).toFixed(1)} 天`;
    return `${h} 小時`;
}

function renderAuthProbe(probe) {
    const box = document.getElementById("authProbe");
    if (!probe || (probe.cookies.length === 0 && probe.web.length === 0)) {
        box.innerHTML = '<div class="auth-empty">尚無資料，請按「登入時效」查詢（需先登入官網）</div>';
        return;
    }

    // 以最早到期者作為結論：那才是實際失效時間
    const all = [
        ...probe.cookies.map(c => ({ label: c.name, exp: c.jwtExpHours, life: c.jwtLifetimeHours, cookieExp: c.cookieExpHours })),
        ...probe.web.map(w => ({ label: w.key, exp: w.jwtExpHours, life: w.jwtLifetimeHours, cookieExp: null }))
    ];
    const jwts = all.filter(i => i.exp !== null && i.exp !== undefined);

    let headline;
    if (jwts.length === 0) {
        headline = '<span class="auth-warn">找不到 JWT 格式的憑證</span>　登入態可能是伺服器端 session（無法從本機讀出到期時間）';
    } else {
        const soonest = jwts.reduce((a, b) => (a.exp <= b.exp ? a : b));
        const cls = soonest.exp < 0 ? "auth-bad" : soonest.exp < 6 ? "auth-warn" : "auth-ok";
        headline = `登入憑證 <b>${escapeHtml(soonest.label)}</b> <span class="${cls}">剩 ${fmtHours(soonest.exp)}</span>`
            + (soonest.life !== null ? `　·　簽發後有效期 <b>${fmtHours(soonest.life)}</b>` : "");
    }

    const rows = all.map(i => `
      <div class="auth-row">
        <span class="auth-key">${escapeHtml(i.label)}</span>
        <span class="auth-val">token ${fmtHours(i.exp)}　/　cookie ${i.cookieExp === null ? "session" : fmtHours(i.cookieExp)}</span>
      </div>`).join("");

    box.innerHTML = `<div class="auth-headline">${headline}</div>${rows}
      <div class="auth-time">查詢時間：${escapeHtml(probe.at || "—")}</div>`;
}

document.getElementById("probeCookieBtn").addEventListener("click", () => {
    const box = document.getElementById("authProbe");
    box.innerHTML = '<div class="auth-empty">讀取中…</div>';
    chrome.runtime.sendMessage({ type: "probeAuth" }, (res) => {
        if (chrome.runtime.lastError || !res) {
            box.innerHTML = '<div class="auth-empty">讀取失敗：' +
                escapeHtml(chrome.runtime.lastError?.message || "無回應") + "</div>";
            return;
        }
        renderAuthProbe(res.result);
        renderDiag();
    });
});

// ── 初始化 ────────────────────────────────────────────
document.getElementById("currentVersion").textContent =
    "v" + chrome.runtime.getManifest().version;
loadSettings();
renderTargets();
renderLog();
