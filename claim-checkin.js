// ── 每週簽到流程 ──────────────────────────────────────
// 頁面：https://www.swordofjustice.com/h5/20260722/officialwebfasthmt/#/
//
// 每日一格、當天沒領即過期（Vue 來源：class {yqd: status, ygq: weekDay > checkin_index && !status}）
// 因此掛在每日排程上執行即可，不需要獨立的每週鬧鐘。
//
// 按鈕狀態（唯一動作點）：
//   .btn-checkin        今日可簽到，帶 click handler
//   .btn-checkin.un     今日已簽到，無 handler
// 格子狀態：.day.yqd 已簽到 / .day.ygq 已過期 / 無修飾 = 未簽到
LK.register("checkin", async ({ waitForElement, waitForAny, sleep, diagStep }) => {
    const results = [];

    const weekSummary = () => {
        const days = [...document.querySelectorAll(".checkin-box .day")];
        const signed = days.filter(d => d.classList.contains("yqd")).length;
        const expired = days.filter(d => d.classList.contains("ygq")).length;
        return { total: days.length, signed, expired };
    };

    const btn = await waitForElement(".btn-checkin");
    if (!btn) {
        diagStep("checkin_btn_fail", "等待 .btn-checkin 逾時");
        throw new Error("找不到簽到按鈕，頁面結構可能已變更");
    }

    const before = weekSummary();
    diagStep("checkin_week", `本週已簽 ${before.signed}/${before.total}，已過期 ${before.expired}`);

    // .un 代表今日已簽到，按鈕沒有 click handler，點了也不會有反應
    if (btn.classList.contains("un")) {
        results.push({
            name: "今日簽到",
            status: "skipped",
            note: `已簽到（本週 ${before.signed}/${before.total}）`
        });
        return results;
    }

    diagStep("checkin_click", "點擊簽到按鈕");
    btn.click();

    // 驗證真的簽到成功：按鈕轉為 .un，或已簽到格數增加
    const { selector } = await waitForAny([".btn-checkin.un"], 6000);
    await sleep(300);
    const after = weekSummary();

    if (selector || after.signed > before.signed) {
        results.push({
            name: "今日簽到",
            status: "success",
            note: `簽到成功（本週 ${after.signed}/${after.total}）`
        });
    } else {
        // 點了但狀態沒變：可能後端拒絕、需要選角色，或結構已變更
        results.push({
            name: "今日簽到",
            status: "not_found",
            note: `已點擊但狀態未變（本週 ${after.signed}/${after.total}），請手動確認`
        });
        diagStep("checkin_unconfirmed", `點擊後 6 秒內未轉為已簽到`);
    }

    return results;
});
