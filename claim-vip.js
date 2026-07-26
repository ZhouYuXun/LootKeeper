// ── VIP 禮包領取流程 ──────────────────────────────────
// 頁面：https://www.swordofjustice.com/h5/20260424/vip/index.html#/
// 狀態 class：.gift-card--claimable / --claimed / --locked
LK.register("vip", async ({ waitForElement, sleep, diagStep }) => {
    const results = [];

    // 點進禮包分頁（用 class 定位，不依賴文字）
    const giftIcon = await waitForElement(".privilege-icon--gift");
    if (!giftIcon) {
        diagStep("gift_icon_fail", "等待 .privilege-icon--gift 逾時");
        throw new Error("找不到禮包圖示，頁面結構可能已變更");
    }
    diagStep("gift_icon_click", "點擊禮包圖示");
    (giftIcon.closest(".privilege-item") || giftIcon).click();

    // 等待禮包卡片出現（SPA 渲染完成）
    const firstCard = await waitForElement(".gift-card");
    if (!firstCard) {
        diagStep("gift_page_fail", "等待 .gift-card 逾時");
        throw new Error("進入禮包頁面逾時，可能導向失敗");
    }
    await sleep(500); // 等待所有卡片完整渲染

    const cards = [...document.querySelectorAll(".gift-card")];
    diagStep("gift_cards_found", `共 ${cards.length} 張卡片`);

    for (const card of cards) {
        const name = card.querySelector(".gift-type-name")?.textContent.trim() || "未知禮包";

        if (card.classList.contains("gift-card--claimable")) {
            const btn = card.querySelector(".btn-claim");
            if (btn) {
                btn.click();
                await sleep(800);
                results.push({ name, status: "success", note: "成功點擊領取" });
            } else {
                results.push({ name, status: "skipped", note: "找不到領取按鈕" });
            }
        } else if (card.classList.contains("gift-card--claimed")) {
            results.push({ name, status: "skipped", note: "已領過" });
        } else if (card.classList.contains("gift-card--locked")) {
            results.push({ name, status: "not_found", note: "尚未解鎖" });
        } else {
            results.push({ name, status: "not_found", note: `狀態未知 (${[...card.classList].join(" ")})` });
        }
    }

    return results;
});
