<div align="center">

# LootKeeper

**Chrome / Edge 擴充套件 · 每天定時自動領取《逆水寒》會員中心禮包與每週簽到**

![version](https://img.shields.io/badge/版本-v3.4-4caf50?style=flat-square)
![license](https://img.shields.io/badge/授權-自訂非商業-ed8936?style=flat-square)
![chrome](https://img.shields.io/badge/Chrome-支援-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![edge](https://img.shields.io/badge/Edge-支援-0078D7?style=flat-square&logo=microsoftedge&logoColor=white)
![platform](https://img.shields.io/badge/Windows-only-0078D4?style=flat-square&logo=windows&logoColor=white)

</div>

<br>

<h2 align="center">快速上手</h2>

<p align="center">跟著做完這三步，每天自動領取就會開始運作。</p>

<br>

### Step 1 · 下載並安裝擴充套件

從 [GitHub 頁面](https://github.com/ZhouYuXun/LootKeeper) 點綠色「**Code**」→ **Download ZIP**，解壓縮到一個**不會被刪掉**的位置（例如 `Documents\LootKeeper`），然後依下方步驟載入瀏覽器。

> **從 v2.x 升級**：v3 新增兩個權限——**通知**（登入過期時提醒你）與 **Cookie**（用來算出登入憑證的剩餘有效時間，**只取出到期時間，不儲存也不顯示憑證內容**）。瀏覽器會要求你重新確認權限，這是正常的。原有設定與記錄會自動遷移。

<br>

<details>
<summary><b>Microsoft Edge</b></summary>

1. 網址列輸入 `edge://extensions` 並按 Enter
2. 開啟左側「**開發人員模式**」
3. 點「**載入解壓縮**」→ 選擇解壓縮後的資料夾
4. 出現「LootKeeper」卡片即完成

</details>

<br>

<details>
<summary><b>Google Chrome</b></summary>

1. 網址列輸入 `chrome://extensions` 並按 Enter
2. 開啟右上「**開發人員模式**」
3. 點「**載入未封裝項目**」→ 選擇解壓縮後的資料夾
4. 出現「LootKeeper」卡片即完成

</details>

<br>

### Step 2 · 登入逆水寒會員中心

在瀏覽器中登入**逆水寒會員中心**。未登入時擴充套件無法領取，「立即領取」與自動領取都會失敗。

> 官網的登入有時效，過期後會自動登出。v3.0 起偵測到未登入時會跳**桌面通知**並在記錄頁顯示橫幅，點一下即可開啟官網重新登入，不必等到發現漏領才察覺。
>
> 想知道登入還能撐多久：**設定分頁 → 登入狀態**，開啟就會顯示憑證的剩餘有效時間與簽發後的總有效期。只解出到期時間，**不讀取也不儲存憑證內容**。
>
> 官網網域下讀不到登入 cookie（登入態存在網易通行證網域）。若想查出真正的登入到期時間，該區塊會出現一顆授權按鈕，**按下才會向瀏覽器申請讀取 `163.com` / `easebar.com` 的權限**——安裝時不會索取，也可隨時在瀏覽器的擴充功能設定收回。

<br>

### Step 3 · 開啟瀏覽器的「背景執行」

> ⚠️ 不開啟這個設定，每天自動領取**不會**運作。只想用「立即領取」按鈕的話可以跳過。

<br>

<details>
<summary><b>Microsoft Edge</b></summary>

1. 網址列輸入 `edge://settings/system` 並按 Enter
2. 找到「**Microsoft Edge 關閉時，繼續執行背景延伸模組和應用程式**」
3. 切換為**開啟**

> 不同版本字串略有差異，可能顯示為「關閉 Microsoft Edge 時繼續執行背景延伸模組和應用程式」，是同一個選項。

</details>

<br>

<details>
<summary><b>Google Chrome</b></summary>

1. 網址列輸入 `chrome://settings/system` 並按 Enter
2. 找到「**關閉 Google Chrome 後繼續執行背景應用程式**」
3. 切換為**開啟**

</details>

<br>

**確認生效：** 關掉所有瀏覽器視窗後，按 `Ctrl + Shift + Esc` 開啟**工作管理員** →「程序」分頁，應該還能看到 `Microsoft Edge` 或 `Google Chrome` 的背景程序仍在執行。

<br>

<h2 align="center">使用方式</h2>

<p align="center">點擊工具列的 LootKeeper 圖示開啟控制面板。</p>

<br>

<h3 align="center">三個分頁</h3>

<div align="center">

<table>
<thead>
<tr>
<th align="center">分頁</th>
<th align="center">用途</th>
</tr>
</thead>
<tbody>
<tr><td align="center"><b>記錄</b></td><td align="center">看最近幾次的領取結果（每筆標示所屬目標），按「立即領取」可手動觸發</td></tr>
<tr><td align="center"><b>設定</b></td><td align="center">開關個別領取目標、調整排程時間、自動領取開關、版本檢查</td></tr>
<tr><td align="center"><b>贊助</b></td><td align="center">支持作者</td></tr>
</tbody>
</table>

</div>

<br>

<h3 align="center">設定選項</h3>

<div align="center">

<table>
<thead>
<tr>
<th align="center">項目</th>
<th align="center">預設</th>
<th align="center">說明</th>
</tr>
</thead>
<tbody>
<tr><td align="center">領取目標</td><td align="center">全部開啟</td><td align="center">可個別停用「VIP 禮包」或「每週簽到」，並顯示各自的完成狀態</td></tr>
<tr><td align="center">登入狀態</td><td align="center">—</td><td align="center">顯示登入憑證剩餘有效時間與簽發後總有效期，開啟面板即自動查詢</td></tr>
<tr><td align="center">每日自動領取</td><td align="center">開啟</td><td align="center">關閉後僅保留手動領取</td></tr>
<tr><td align="center">每日執行時間</td><td align="center">05:10</td><td align="center">修改後按「儲存」立即重新排程</td></tr>
<tr><td align="center">領取後關閉頁面</td><td align="center">關閉</td><td align="center">完成後自動關閉領取分頁</td></tr>
<tr><td align="center">歷史紀錄筆數</td><td align="center">6</td><td align="center">保留幾筆執行記錄（每個目標各一筆）</td></tr>
<tr><td align="center">檢查更新</td><td align="center">自動</td><td align="center">每 20 小時自動比對遠端版本，有新版會在工具列圖示顯示 <b>NEW</b> 標記並跳桌面通知；也可手動點按立即檢查</td></tr>
</tbody>
</table>

</div>

<br>

<h3 align="center">看懂記錄狀態</h3>

<div align="center">

<table>
<thead>
<tr>
<th align="center">顏色</th>
<th align="center">意思</th>
</tr>
</thead>
<tbody>
<tr><td align="center">🟢 綠色</td><td align="center">全部成功</td></tr>
<tr><td align="center">🟠 橘色</td><td align="center">部分成功</td></tr>
<tr><td align="center">🔴 紅色</td><td align="center">執行失敗，或登入已過期（標示「需登入」）</td></tr>
<tr><td align="center">⬜ 無色</td><td align="center">本次沒有可領取的項目（已領過或未解鎖）</td></tr>
</tbody>
</table>

</div>

<p align="center">單項標籤：<b>✓ 成功</b> / <b>已領過</b> / <b>未解鎖</b></p>

<br>

<h2 align="center">更新與移除</h2>

<details>
<summary><b>更新到新版</b></summary>

有新版時，工具列圖示會出現橘色 **NEW** 標記並跳一次桌面通知（每個版本只通知一次），不必自己去查。

1. 點通知，或到設定分頁 → **檢查更新** → 點「前往下載」
2. 下載新 ZIP，解壓縮並**覆蓋**原資料夾
3. 到擴充套件管理頁，點 LootKeeper 卡片的「**重新載入**」圖示

> 設定與記錄存在瀏覽器儲存空間，更新不會遺失。

</details>

<br>

<details>
<summary><b>用 git 讓更新免手動（進階，需要安裝 git）</b></summary>

擴充套件本身無法自我更新——瀏覽器不允許擴充套件改寫自己的檔案，而自架更新伺服器的做法在 Windows 上已被 Chrome 封鎖。但如果你的安裝資料夾是 git clone 來的，可以讓檔案自動保持最新：

```bash
git clone https://github.com/ZhouYuXun/LootKeeper.git
```

之後用 Windows 工作排程器每天執行一次 `git -C <資料夾> pull` 即可。**未封裝的擴充套件在瀏覽器啟動時會重新從原資料夾讀取檔案**，所以下次開瀏覽器就是新版，連「重新載入」都不用按。

> 注意：更新不會即時生效，要等瀏覽器重新啟動。若當下就想套用，仍需到擴充套件管理頁按「重新載入」。

</details>

<br>

<details>
<summary><b>完整移除</b></summary>

1. 擴充套件管理頁 → 點「**移除**」
2. 刪除安裝資料夾

移除後不會有任何殘留。

</details>

<br>

<h2 align="center">常見問題</h2>

<details>
<summary><b>每天自動領取沒有觸發？</b></summary>

依序檢查：

1. 設定中的「**每日自動領取**」開關是否開啟
2. [背景執行](#step-3--開啟瀏覽器的背景執行)是否開啟（**最常見原因**）
3. 排程時間到的當下，工作管理員裡瀏覽器背景程序是否還在
4. 設定分頁底部「**顯示診斷**」展開後，是否有 `alarm_fired` 紀錄

</details>

<br>

<details>
<summary><b>記錄顯示「需登入」？</b></summary>

官網登入已過期。點記錄頁上方的橘色橫幅（或桌面通知）即可開啟官網重新登入，登入後按「立即領取」補領即可。

想知道登入還能撐多久，看**設定分頁 → 登入狀態**。

> v3.0 以前這種情況會誤報成「找不到禮包圖示」或「導向失敗」，因為未登入時禮包圖示其實仍然存在。現在改為直接判定登入狀態。

</details>

<br>

<details>
<summary><b>「逾時（35 秒內頁面未回應）」？</b></summary>

頁面載入過慢或網路不穩，稍後手動點「立即領取」重試即可。

</details>

<br>

<details>
<summary><b>手動開啟禮包頁面，套件不會自動領？</b></summary>

套件只在**它自己開啟**的分頁中運作，你手動輸入網址打開的分頁不會觸發。這是刻意的安全設計，避免誤動其他分頁。

</details>

<br>

<h2 align="center">進階</h2>

<p align="center">一般使用不需要看這一段。遇到自動領取異常、或想進一步調整 Edge 行為時再展開。</p>

<br>

<details>
<summary><b>診斷面板說明</b></summary>

設定分頁底部點「**顯示診斷**」展開。

<div align="center">

<table>
<thead>
<tr>
<th align="center">元素</th>
<th align="center">用途</th>
</tr>
</thead>
<tbody>
<tr><td align="center">鬧鐘狀態 · 查詢</td><td align="center">顯示下次自動觸發時間</td></tr>
<tr><td align="center">鬧鐘狀態 · 重設</td><td align="center">若時間設定變更後沒套用，可手動重建排程</td></tr>
<tr><td align="center">觸發記錄</td><td align="center">最近 150 筆事件（排程觸發、SW 喚醒、視窗狀態）</td></tr>
<tr><td align="center">清除</td><td align="center">清空觸發記錄</td></tr>
</tbody>
</table>

</div>

常見事件代碼：

- `alarm_fired` — 排程時間到，已觸發
- `sw_boot` — Service Worker 喚醒
- `sidebar_block` — Edge 側邊欄狀態擋下開啟分頁（見下方）
- `sidebar_resume` — 從側邊欄狀態恢復後完成補領

</details>

<br>

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

<br>

<details>
<summary><b>功能特性一覽</b></summary>

- 🎯 **多目標** — VIP 禮包與每週簽到依序領取，可個別開關
- 🔒 **登入偵測** — 登入過期時跳桌面通知與橫幅，並可查看憑證剩餘時效
- ⏰ **定時領取** — 每天在設定時間自動開啟頁面，依序領取
- 🔄 **開機補領** — 排程時間瀏覽器未開啟，下次啟動自動補領當天
- 🌙 **背景領取** — 視窗全關時也會以最小化視窗執行
- 🖱️ **手動觸發** — 隨時點工具列圖示立即領取，無次數限制
- 📋 **執行記錄** — 保留最近 N 次結果，含各禮包詳細狀態
- 🩺 **診斷面板** — 內建排程查詢、觸發紀錄與重設按鈕
- 🔔 **版本通知** — 每 20 小時自動檢查，有新版顯示 NEW 標記與桌面通知
- 🛡️ **逾時保護** — 頁面 35 秒未回應自動關閉並記錄錯誤

</details>

<br>

<div align="center">

**LootKeeper** · 作者：墨染楓（瑤光聽雪） · [意見回饋](https://github.com/ZhouYuXun/LootKeeper/issues)

</div>
