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

// ── 渲染記錄列表 ──────────────────────────────────────
function renderLog() {
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
            if (entry.error) {
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
            head.innerHTML = `
              <span class="entry-time">${entry.time}</span>
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
        if (res.status === "started") {
            status.className = "success";
            status.textContent = "執行中…";
            setTimeout(() => {
                btn.disabled = false;
                status.textContent = "";
                renderLog();
            }, 3000);
        }
    });
});

// ── 記錄列表滾動 ──────────────────────────────────────
function syncLogScroll(max) {
    document.getElementById("log").classList.toggle("scrollable", max > 5);
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
        const maxLog = data.maxLogEntries !== undefined ? data.maxLogEntries : 3;
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
    const val = parseInt(e.target.value) || 3;
    syncLogScroll(val);
    chrome.storage.local.set({ maxLogEntries: val });
});

// ── 檢查更新 ──────────────────────────────────────────
const RELEASES_API = "https://api.github.com/repos/ZhouYuXun/LootKeeper/releases/latest";

function parseVer(v) {
    return v.replace(/^v/, "").split(".").map(Number);
}
function isNewer(tag, cur) {
    const a = parseVer(tag), b = parseVer(cur);
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

    fetch(RELEASES_API, { headers: { Accept: "application/vnd.github.v3+json" } })
        .then(r => r.json())
        .then(data => {
            const tag = data.tag_name || "";
            const cur = chrome.runtime.getManifest().version;
            if (isNewer(tag, cur)) {
                const url = data.html_url || "https://github.com/ZhouYuXun/LootKeeper/releases";
                statusEl.innerHTML = `發現新版本 <a href="${url}" target="_blank" class="update-link">${tag} 前往下載</a>`;
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

// ── 初始化 ────────────────────────────────────────────
loadSettings();
renderLog();
