<div align="center">

# LootKeeper

**Chrome / Edge 擴充套件 · 每天定時自動領取《逆水寒》會員中心禮包**

![version](https://img.shields.io/badge/版本-v2.10-4caf50?style=flat-square)
![license](https://img.shields.io/badge/授權-自訂非商業-ed8936?style=flat-square)
![chrome](https://img.shields.io/badge/Chrome-支援-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![edge](https://img.shields.io/badge/Edge-支援-0078D7?style=flat-square&logo=microsoftedge&logoColor=white)
![platform](https://img.shields.io/badge/Windows-only-0078D4?style=flat-square&logo=windows&logoColor=white)

</div>

---

## 快速上手（3 步驟）

> 跟著做完這三步，每天自動領取就會開始運作。

### Step 1 · 安裝擴充套件

1. 前往 [GitHub 頁面](https://github.com/ZhouYuXun/LootKeeper)，點綠色「**Code**」→ **Download ZIP**
2. 解壓縮到一個**不會被刪掉**的位置（例如 `Documents\LootKeeper`）
3. 載入到瀏覽器（依使用的瀏覽器展開）：

<details>
<summary><b>Microsoft Edge</b></summary>

1. 網址列輸入 `edge://extensions` 並按 Enter
2. 開啟左側「**開發人員模式**」
3. 點「**載入解壓縮**」→ 選擇解壓縮後的資料夾
4. 出現「LootKeeper」卡片即完成

</details>

<details>
<summary><b>Google Chrome</b></summary>

1. 網址列輸入 `chrome://extensions` 並按 Enter
2. 開啟右上「**開發人員模式**」
3. 點「**載入未封裝項目**」→ 選擇解壓縮後的資料夾
4. 出現「LootKeeper」卡片即完成

</details>

### Step 2 · 登入逆水寒會員中心

在瀏覽器中登入**逆水寒會員中心**，**未登入時擴充套件無法領取**。

### Step 3 · 開啟「背景執行」

> ⚠️ 不開啟這個設定，每天自動領取**不會**運作。只想用「立即領取」按鈕的話可以跳過。

依使用的瀏覽器展開：

<details>
<summary><b>Microsoft Edge</b></summary>

1. 網址列輸入 `edge://settings/system` 並按 Enter
2. 找到「**Microsoft Edge 關閉時，繼續執行背景延伸模組和應用程式**」
3. 切換為**開啟**

> 不同版本字串略有差異，可能顯示為「關閉 Microsoft Edge 時繼續執行背景延伸模組和應用程式」，是同一個選項。

</details>

<details>
<summary><b>Google Chrome</b></summary>

1. 網址列輸入 `chrome://settings/system` 並按 Enter
2. 找到「**關閉 Google Chrome 後繼續執行背景應用程式**」
3. 切換為**開啟**

</details>

**確認生效：** 關掉所有瀏覽器視窗後，按 `Ctrl + Shift + Esc` 開啟**工作管理員** →「程序」分頁，應該還能看到 `Microsoft Edge` 或 `Google Chrome` 的背景程序仍在執行。

---

## 使用方式

點擊工具列的 LootKeeper 圖示開啟控制面板。

### 三個分頁

| 分頁 | 用途 |
|------|------|
| **記錄** | 看最近幾次的領取結果，按「立即領取」可手動觸發 |
| **設定** | 調整排程時間、自動領取開關、版本檢查 |
| **贊助** | 支持作者 |

### 設定選項

| 項目 | 預設 | 說明 |
|------|------|------|
| 每日自動領取 | 開啟 | 關閉後僅保留手動領取 |
| 每日執行時間 | 05:10 | 修改後按「儲存」立即重新排程 |
| 領取後關閉頁面 | 關閉 | 完成後自動關閉禮包分頁 |
| 歷史紀錄筆數 | 3 | 保留幾筆執行記錄 |
| 檢查更新 | — | 比對遠端版本，有新版顯示下載連結 |

### 看懂記錄狀態

| 顏色 | 意思 |
|------|------|
| 🟢 綠色 | 全部成功 |
| 🟠 橘色 | 部分成功 |
| 🔴 紅色 | 執行失敗 |
| ⬜ 無色 | 本次沒有可領取的項目（已領過或未解鎖） |

單項標籤：**✓ 成功** / **已領過** / **未解鎖**

---

## 更新與移除

<details>
<summary><b>更新到新版</b></summary>

1. 設定分頁 → **檢查更新** → 若有新版點「前往下載」
2. 下載新 ZIP，解壓縮並**覆蓋**原資料夾
3. 到擴充套件管理頁，點 LootKeeper 卡片的「**重新載入**」圖示

> 設定與記錄存在瀏覽器儲存空間，更新不會遺失。

</details>

<details>
<summary><b>完整移除</b></summary>

1. 擴充套件管理頁 → 點「**移除**」
2. 刪除安裝資料夾

移除後不會有任何殘留。

</details>

---

## 常見問題

<details>
<summary><b>每天自動領取沒有觸發？</b></summary>

依序檢查：

1. 設定中的「**每日自動領取**」開關是否開啟
2. [背景執行](#step-3--開啟背景執行)是否開啟（**最常見原因**）
3. 排程時間到的當下，工作管理員裡瀏覽器背景程序是否還在
4. 設定分頁底部「**顯示診斷**」展開後，是否有 `alarm_fired` 紀錄

</details>

<details>
<summary><b>「找不到禮包圖示」？</b></summary>

最常見是未登入逆水寒會員中心，請先在瀏覽器登入再試。

</details>

<details>
<summary><b>「逾時（35 秒內頁面未回應）」？</b></summary>

頁面載入過慢或網路不穩，稍後手動點「立即領取」重試即可。

</details>

<details>
<summary><b>手動開啟禮包頁面，套件不會自動領？</b></summary>

套件只在**它自己開啟**的分頁中運作，你手動輸入網址打開的分頁不會觸發。這是刻意的安全設計，避免誤動其他分頁。

</details>

---

## 進階

> 一般使用不需要看這一段。遇到自動領取異常、或想進一步調整 Edge 行為時再展開。

<details>
<summary><b>診斷面板說明</b></summary>

設定分頁底部點「**顯示診斷**」展開。

| 元素 | 用途 |
|------|------|
| 鬧鐘狀態 · 查詢 | 顯示下次自動觸發時間 |
| 鬧鐘狀態 · 重設 | 若時間設定變更後沒套用，可手動重建排程 |
| 觸發記錄 | 最近 150 筆事件（排程觸發、SW 喚醒、視窗狀態） |
| 清除 | 清空觸發記錄 |

常見事件代碼：

- `alarm_fired` — 排程時間到，已觸發
- `sw_boot` — Service Worker 喚醒
- `sidebar_block` — Edge 側邊欄狀態擋下開啟分頁（見下方）
- `sidebar_resume` — 從側邊欄狀態恢復後完成補領

</details>

<details>
<summary><b>Edge 出現 <code>sidebar_block</code> 怎麼辦？</b></summary>

**狀況：** Edge 在「只剩側邊欄、沒有主視窗」的狀態下，會擋下擴充套件建立新分頁。若排程剛好在這個狀態觸發，就會出現 `sidebar_block`。

**自動補救：** 套件會記下待領狀態，下次你打開任何一般 Edge 視窗時（12 小時內）自動補領，**不會漏領**。

**徹底解法**（停用側邊欄，建議 Edge 使用者）：

1. **Win + R** → 輸入 `regedit` → Enter
2. 展開到 `HKEY_CURRENT_USER\SOFTWARE\Policies\Microsoft\Edge`
   - 若沒有 `Microsoft` 或 `Edge` 機碼，依序右鍵新增
3. 右側空白處右鍵 → 新增 → **DWORD (32 位元) 值** → 命名 `HubsSidebarEnabled` → 數值資料 `0`
4. 開 `edge://policy`，點左上角「**重新載入原則**」
5. 取消勾選「顯示沒有值的原則」，應看到 `HubsSidebarEnabled = 0`

**恢復：** 刪除 `HubsSidebarEnabled` 那筆值，回到 `edge://policy` 點「重新載入原則」即可。

> 此為 Microsoft 官方原則（[HubsSidebarEnabled](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies#hubssidebarenabled)），不影響 Edge 其他功能。

</details>

<details>
<summary><b>功能特性一覽</b></summary>

- ⏰ **定時領取** — 每天在設定時間自動開啟禮包頁面，依序領取
- 🔄 **開機補領** — 排程時間瀏覽器未開啟，下次啟動自動補領當天
- 🌙 **背景領取** — 視窗全關時也會以最小化視窗執行
- 🖱️ **手動觸發** — 隨時點工具列圖示立即領取，無次數限制
- 📋 **執行記錄** — 保留最近 N 次結果，含各禮包詳細狀態
- 🩺 **診斷面板** — 內建排程查詢、觸發紀錄與重設按鈕
- 🔔 **版本通知** — 設定頁可手動檢查新版
- 🛡️ **逾時保護** — 頁面 35 秒未回應自動關閉並記錄錯誤

</details>

---

<div align="center">

**LootKeeper** · 作者：墨染楓（瑤光聽雪） · [意見回饋](https://github.com/ZhouYuXun/LootKeeper/issues)

</div>
