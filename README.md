<div align="center">

# LootKeeper

**Chrome / Edge 擴充套件 · 每天定時自動領取遊戲 VIP 禮包**

![version](https://img.shields.io/badge/版本-v1.1-4caf50?style=flat-square)
![license](https://img.shields.io/badge/授權-自訂非商業-ed8936?style=flat-square)
![chrome](https://img.shields.io/badge/Chrome-支援-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![edge](https://img.shields.io/badge/Edge-支援-0078D7?style=flat-square&logo=microsoftedge&logoColor=white)
![platform](https://img.shields.io/badge/Windows-only-0078D4?style=flat-square&logo=windows&logoColor=white)

</div>

---

## 功能

- ⏰ **定時領取** — 每天在設定時間自動開啟禮包頁面，依序領取所有可領取禮包
- 🔄 **開機補領** — 排程時間瀏覽器未開啟，下次啟動時自動補領當天
- 🖱️ **手動觸發** — 隨時點擊工具列圖示立即領取，無次數限制
- 📋 **執行記錄** — 保留最近 N 次結果，含各禮包的詳細領取狀態
- 🛡️ **逾時保護** — 頁面 25 秒未回應自動關閉並記錄錯誤

> ⚠️ 必須先在瀏覽器**登入遊戲帳號**，擴充套件才能正常運作。

---

## 安裝

### 1. 下載 ZIP

前往 [Releases 頁面](https://github.com/ZhouYuXun/LootKeeper/releases)，點擊最新版本下方 **Assets** 區塊中的 `.zip` 檔案下載。

> 不要使用 GitHub 首頁綠色「Code」按鈕裡的「Download ZIP」，那個下載的是原始碼而非發行版。

### 2. 解壓縮

將下載的 ZIP 解壓縮到一個**固定位置**（例如 `Documents\LootKeeper`）。

> **重要：** 解壓後的資料夾不可刪除，瀏覽器會持續從此路徑讀取套件。
> 若需搬移，請參閱[移動安裝資料夾](#移動安裝資料夾)。

### 3. 載入擴充套件

<details>
<summary><b>Google Chrome</b></summary>
<br>

1. 網址列輸入 `chrome://extensions` 並按 Enter
2. 右上角開啟「**開發人員模式**」
3. 點擊「**載入未封裝項目**」→ 選擇解壓縮後的資料夾
4. 頁面出現「LootKeeper」卡片即完成

</details>

<details>
<summary><b>Microsoft Edge</b></summary>
<br>

1. 網址列輸入 `edge://extensions` 並按 Enter
2. 左側開啟「**開發人員模式**」
3. 點擊「**載入解壓縮**」→ 選擇解壓縮後的資料夾
4. 頁面出現「LootKeeper」卡片即完成

</details>

---

## 初次設定

自動排程需要瀏覽器在背景持續運作，建議完成以下兩項設定。

### 背景執行

<details>
<summary><b>Chrome</b> — 設定 → 系統</summary>
<br>

開啟「**關閉 Google Chrome 後繼續執行背景應用程式**」

</details>

<details>
<summary><b>Edge</b> — 設定 → 系統與效能</summary>
<br>

開啟「**關閉 Microsoft Edge 時繼續執行背景延伸模組和應用程式**」

</details>

### 開機自動啟動

雙擊 **`setup.bat`**（若出現 UAC 提示，請右鍵 → 以系統管理員身分執行）。

腳本會自動偵測已安裝的 Chrome / Edge，建立 Windows 工作排程，使瀏覽器隨開機在背景啟動。完成後重開機即生效。

> 兩項設定都完成後，即使關機也能確保隔天定時執行。

---

## 使用方式

點擊工具列套件圖示開啟控制面板。

### 控制面板

| 元件 | 說明 |
|------|------|
| **立即領取** | 手動觸發，無次數限制 |
| **記錄 tab** | 顯示最近 N 次執行結果 |
| **🗑 清空** | 清除所有執行記錄 |
| **設定 tab** | 調整自動化行為 |
| **贊助 tab** | 支持作者 |

### 設定選項

| 項目 | 預設 | 說明 |
|------|------|------|
| **每日自動領取** | 開啟 | 關閉後停止排程，僅保留手動領取 |
| **每日執行時間** | 05:10 | 開啟自動領取後可調整；修改後按「儲存」立即重新排程 |
| **領取後關閉頁面** | 關閉 | 完成後自動關閉禮包分頁 |
| **歷史紀錄筆數** | 3 | 保留幾筆記錄（1–50）；超過 5 筆時出現捲軸 |

### 記錄狀態

| 卡片左側 | 單項標籤 | 意思 |
|----------|----------|------|
| 🟢 綠色 | | 全部成功 |
| 🟠 橘色 | | 部分成功 |
| 🔴 紅色 | | 執行失敗 |
| ⬜ 無色 | | 本次無可領取項目（全已領過或未解鎖） |
| | ✓ 成功 | 該禮包領取完成 |
| | 已領過 | 今日已領，自動跳過 |
| | 未解鎖 | 該禮包尚未解鎖 |

---

## 更新擴充套件

### 方式一：設定頁面直接更新（建議）

1. 點擊擴充套件圖示 → **設定 tab** → **檢查更新**
2. 發現新版後點擊「**立即更新**」→ 瀏覽器詢問是否開啟外部程式，點擊確定
3. cmd 視窗自動執行下載與覆蓋，完成後關閉
4. 回到設定頁點擊「**重新載入套件**」→ 完成

> **前提**：需先重新執行一次 `setup.bat` 以啟用此功能（已執行過的使用者也需重跑一次）。
> 若移動過安裝資料夾，同樣需重跑 `setup.bat`。

### 方式二：手動執行腳本

直接雙擊安裝資料夾內的 **`update.bat`**，腳本會自動查詢最新版本、下載、解壓並覆蓋檔案，最後開啟瀏覽器擴充套件管理頁。只需在管理頁點擊「LootKeeper」卡片的「**重新載入**」圖示即完成。

### 方式二：手動更新

1. 點擊擴充套件圖示 → **設定 tab** → **檢查更新**
2. 若有新版本，點擊連結前往 Releases 頁面下載最新 `.zip`
3. 將新版 ZIP 內容**覆蓋**到原本的安裝資料夾（直接覆蓋，不需刪除舊檔案）
4. 前往 `chrome://extensions` 或 `edge://extensions`，點擊「LootKeeper」卡片的「**重新載入**」圖示

> 所有設定與記錄保存於瀏覽器儲存空間，更新不會遺失資料。

---

## 移動安裝資料夾

直接搬移資料夾會導致套件顯示錯誤並停用，請依下列步驟重新安裝：

1. 前往擴充套件管理頁面，移除「LootKeeper」
2. 將資料夾搬移至新位置
3. 重新「載入未封裝項目」，選擇新路徑下的資料夾
4. 若原本有設定開機自動啟動，重新執行 `setup.bat`

---

## 完整移除

1. 前往擴充套件頁面，點擊「**移除**」
2. 雙擊 `remove.bat` 清除開機啟動排程
3. 刪除安裝資料夾

移除後不會有任何殘留。

---

## 常見問題

<details>
<summary>安裝後沒有自動領取？</summary>
<br>

請確認已完成「初次設定」的背景執行與開機自動啟動兩項設定，且控制面板中「每日自動領取」開關已開啟。

</details>

<details>
<summary>手動開啟禮包頁面，自動領取不觸發？</summary>
<br>

套件僅在**自己開啟的分頁**中執行，直接輸入網址不會觸發。這是刻意的安全設計，避免誤動其他分頁。

</details>

<details>
<summary>記錄顯示「找不到禮包圖示」？</summary>
<br>

最常見原因是尚未登入遊戲帳號，請先在瀏覽器完成登入再試。

</details>

<details>
<summary>記錄顯示「逾時（25 秒內頁面未回應）」？</summary>
<br>

頁面載入過慢或網路不穩。可稍後點擊「立即領取」手動重試。

</details>

<details>
<summary>搬移資料夾後套件顯示錯誤？</summary>
<br>

請參閱上方[移動安裝資料夾](#移動安裝資料夾)的步驟。

</details>

---

<div align="center">

**LootKeeper** · 作者：墨染楓（瑤光聽雪）

</div>
