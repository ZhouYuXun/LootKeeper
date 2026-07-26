<div align="center">

# LootKeeper

**Chrome / Edge 擴充套件 · 每天自動領取《逆水寒》的禮包與簽到**

![version](https://img.shields.io/badge/版本-v3.5-4caf50?style=flat-square)
![license](https://img.shields.io/badge/授權-自訂非商業-ed8936?style=flat-square)
![chrome](https://img.shields.io/badge/Chrome-支援-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![edge](https://img.shields.io/badge/Edge-支援-0078D7?style=flat-square&logo=microsoftedge&logoColor=white)
![platform](https://img.shields.io/badge/Windows-only-0078D4?style=flat-square&logo=windows&logoColor=white)

</div>

<br>

<p align="center">裝好、登入、開啟背景執行，之後每天清晨自動幫你領完，漏了會補、過期會通知。</p>

<br>

<div align="center">

<table>
<thead>
<tr>
<th align="center">每天自動領取</th>
<th align="center">說明</th>
</tr>
</thead>
<tbody>
<tr><td align="center"><b>VIP 禮包</b></td><td align="center">會員中心的每日禮包，逐一領完</td></tr>
<tr><td align="center"><b>每週簽到</b></td><td align="center">當天那一格，錯過即過期，所以每天都去</td></tr>
</tbody>
</table>

</div>

<br>

<h2 align="center">快速上手</h2>

<p align="center">三步驟，之後不用再管。</p>

<br>

### Step 1 · 安裝擴充套件

從 [GitHub 頁面](https://github.com/ZhouYuXun/LootKeeper) 點綠色「**Code**」→ **Download ZIP**，解壓縮到一個**不會被刪掉**的位置（例如 `Documents\LootKeeper`）。

<br>

<details>
<summary><b>Microsoft Edge</b></summary>

1. 網址列輸入 `edge://extensions` 並按 Enter
2. 開啟左側「**開發人員模式**」
3. 點「**載入解壓縮**」→ 選擇解壓縮後的資料夾

</details>

<br>

<details>
<summary><b>Google Chrome</b></summary>

1. 網址列輸入 `chrome://extensions` 並按 Enter
2. 開啟右上「**開發人員模式**」
3. 點「**載入未封裝項目**」→ 選擇解壓縮後的資料夾

</details>

<br>

<details>
<summary><b>它要了哪些權限，各自用在哪</b></summary>

<div align="center">

<table>
<thead>
<tr>
<th align="center">權限</th>
<th align="center">用途</th>
</tr>
</thead>
<tbody>
<tr><td align="center">分頁 / 視窗</td><td align="center">開啟領取頁面，領完後關掉</td></tr>
<tr><td align="center">鬧鐘 / 儲存空間</td><td align="center">每日排程、設定與執行記錄</td></tr>
<tr><td align="center">通知</td><td align="center">登入過期、有新版時提醒你</td></tr>
<tr><td align="center">Cookie</td><td align="center">算出登入憑證還剩多久<br><b>只取出到期時間，不儲存也不顯示憑證內容</b></td></tr>
</tbody>
</table>

</div>

從 v2.x 升級時瀏覽器會要求重新確認權限，這是正常的，原有設定與記錄會自動遷移。

</details>

<br>

### Step 2 · 登入逆水寒會員中心

在瀏覽器登入**逆水寒會員中心**。未登入時無法領取。

登入有時效，過期後官網會自動把你登出。此時擴充套件會**跳桌面通知**並在記錄頁顯示橫幅，點一下即可回官網重新登入——不必等到發現漏領才察覺。

<br>

### Step 3 · 開啟瀏覽器的「背景執行」

> ⚠️ 不開這個設定，每天自動領取**不會**運作。只用「立即領取」按鈕的話可以跳過。

<br>

<details>
<summary><b>Microsoft Edge</b></summary>

1. 網址列輸入 `edge://settings/system` 並按 Enter
2. 找到「**Microsoft Edge 關閉時，繼續執行背景延伸模組和應用程式**」，切換為**開啟**

> 不同版本字串略有差異，可能顯示為「關閉 Microsoft Edge 時繼續執行背景延伸模組和應用程式」，是同一個選項。

</details>

<br>

<details>
<summary><b>Google Chrome</b></summary>

1. 網址列輸入 `chrome://settings/system` 並按 Enter
2. 找到「**關閉 Google Chrome 後繼續執行背景應用程式**」，切換為**開啟**

</details>

<br>

<p align="center"><b>確認生效：</b>關掉所有瀏覽器視窗後開工作管理員（<code>Ctrl + Shift + Esc</code>），瀏覽器的背景程序應該還在。</p>

<br>

<h2 align="center">使用方式</h2>

<p align="center">點工具列的 LootKeeper 圖示開啟面板：<b>記錄</b>看結果、<b>設定</b>調整、<b>贊助</b>支持作者。</p>

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
<tr><td align="center">領取目標</td><td align="center">全部開啟</td><td align="center">個別開關 VIP 禮包 / 每週簽到，並顯示各自今日狀態</td></tr>
<tr><td align="center">登入狀態</td><td align="center">—</td><td align="center">顯示登入能維持多久（依實際觀測累積），開啟面板即自動查詢</td></tr>
<tr><td align="center">每日自動領取</td><td align="center">開啟</td><td align="center">關閉後僅保留手動領取</td></tr>
<tr><td align="center">每日執行時間</td><td align="center">05:10</td><td align="center">改完按「儲存」立即重新排程</td></tr>
<tr><td align="center">領取後關閉頁面</td><td align="center">關閉</td><td align="center">完成後自動關掉領取分頁</td></tr>
<tr><td align="center">歷史紀錄筆數</td><td align="center">6</td><td align="center">每個目標各佔一筆</td></tr>
<tr><td align="center">檢查更新</td><td align="center">自動</td><td align="center">每 20 小時比對一次，有新版在圖示顯示 <b>NEW</b> 並通知</td></tr>
</tbody>
</table>

</div>

<br>

<h3 align="center">看懂記錄</h3>

<p align="center">🟢 全部成功　·　🟠 部分成功　·　🔴 失敗或需登入　·　⬜ 沒有可領的項目</p>

<p align="center">每筆記錄標示所屬目標，單項標籤為 <b>✓ 成功</b> / <b>已領過</b> / <b>未解鎖</b>。</p>

<br>

<h2 align="center">更新與移除</h2>

<details>
<summary><b>更新到新版</b></summary>

有新版時工具列圖示會出現橘色 **NEW** 標記並跳一次通知（每個版本只通知一次），不必自己去查。

1. 點通知，或到設定分頁 → **檢查更新** → 點「前往下載」
2. 下載新 ZIP，解壓縮並**覆蓋**原資料夾
3. 到擴充套件管理頁，點 LootKeeper 卡片的「**重新載入**」

> 設定與記錄存在瀏覽器儲存空間，更新不會遺失。

</details>

<br>

<details>
<summary><b>讓更新免手動（需要 git）</b></summary>

擴充套件無法自我更新——瀏覽器不允許它改寫自己的檔案，而自架更新伺服器的做法在 Windows 上已被 Chrome 封鎖。但若安裝資料夾是 clone 來的，檔案可以自動保持最新：

```bash
git clone https://github.com/ZhouYuXun/LootKeeper.git
```

再用 Windows 工作排程器每天執行一次 `git -C <資料夾> pull`。**未封裝的擴充套件在瀏覽器啟動時會重新讀取原資料夾**，所以下次開瀏覽器就是新版，連「重新載入」都不用按。

> 代價是不會即時生效，要等瀏覽器重啟。想當下套用仍需手動按「重新載入」。

</details>

<br>

<details>
<summary><b>完整移除</b></summary>

擴充套件管理頁點「**移除**」，再刪掉安裝資料夾。不會有任何殘留。

</details>

<br>

<h2 align="center">常見問題</h2>

<details>
<summary><b>每天自動領取沒有觸發？</b></summary>

依序檢查：

1. 設定中的「**每日自動領取**」是否開啟
2. [背景執行](#step-3--開啟瀏覽器的背景執行)是否開啟（**最常見原因**）
3. 排程時間到的當下，工作管理員裡瀏覽器背景程序是否還在
4. 設定分頁 →「**顯示診斷**」展開後，是否有 `alarm_fired` 紀錄

</details>

<br>

<details>
<summary><b>記錄顯示「需登入」？</b></summary>

官網登入過期了。點記錄頁上方的橘色橫幅（或桌面通知）回官網登入，再按「立即領取」補領即可。

想知道登入還能撐多久，看**設定分頁 → 登入狀態**。

</details>

<br>

<details>
<summary><b>「逾時（35 秒內頁面未回應）」？</b></summary>

頁面載入過慢或網路不穩。稍後手動點「立即領取」重試即可，隔天排程也會自動再試。

</details>

<br>

<details>
<summary><b>手動開啟禮包頁面，套件不會自動領？</b></summary>

套件只在**它自己開啟**的分頁中運作。這是刻意的安全設計，避免誤動你正在看的分頁。

</details>

<br>

<h2 align="center">進階</h2>

<p align="center">一般使用不需要看這一段。</p>

<br>

<details>
<summary><b>診斷面板</b></summary>

設定分頁點「**顯示診斷**」展開，可查詢下次觸發時間、重建排程，並檢視最近 150 筆事件。

常見事件代碼：

- `alarm_fired` — 排程時間到，已觸發
- `sw_boot` — Service Worker 喚醒
- `login_required` — 偵測到登入過期
- `login_span` — 記錄下這次登入維持了多久
- `sidebar_block` / `sidebar_resume` — Edge 側邊欄擋下開分頁 / 之後補領完成（見下方）

</details>

<br>

<details>
<summary><b>「登入能撐多久」是怎麼算出來的</b></summary>

**主要來源是直接觀測**：套件記錄「最後一次確認登入仍有效」到「第一次偵測到需重新登入」的間隔，累積最近 5 次。這個方法不管憑證放在哪、是不是 JWT 都成立。

顯示的是**「至少」值**——計時從套件首次確認登入有效時開始，你實際登入的時刻更早。

<br>

**次要來源是憑證本身**：若登入憑證是 JWT，可以直接解出到期時間。但實測這個站的登入態不放在官網網域的 cookie 裡，找到的只有 localStorage 中的角色 token。若登入態是不透明的 session ID，它身上就沒有編碼到期時間，這條路走不通。

「登入狀態」區塊會提供一顆授權按鈕，可申請讀取 `163.com` / `easebar.com` 以擴大搜尋範圍。安裝時不會索取這個權限，也可隨時在瀏覽器的擴充功能設定收回；若授權後仍顯示讀不到 cookie，代表這條路對此站無效，收回即可。

> 兩種方式都只取出時間，不讀取、不儲存、不顯示憑證內容。

</details>

<br>

<details>
<summary><b>Edge 出現 <code>sidebar_block</code> 怎麼辦？</b></summary>

**狀況：** Edge 在「只剩側邊欄、沒有主視窗」的狀態下會擋下擴充套件建立分頁。排程剛好在這個狀態觸發就會出現。

**自動補救：** 套件會記下待領狀態，下次打開任何一般 Edge 視窗時（12 小時內）自動補領，**不會漏領**。

**徹底解法**（停用側邊欄，建議 Edge 使用者）：

1. **Win + R** → 輸入 `regedit` → Enter
2. 展開到 `HKEY_CURRENT_USER\SOFTWARE\Policies\Microsoft\Edge`
   - 若沒有 `Microsoft` 或 `Edge` 機碼，依序右鍵新增
3. 右側空白處右鍵 → 新增 → **DWORD (32 位元) 值** → 命名 `HubsSidebarEnabled` → 數值資料 `0`
4. 開 `edge://policy` → 點「**重新載入原則**」→ 取消勾選「顯示沒有值的原則」，應看到 `HubsSidebarEnabled = 0`

**恢復：** 刪除該筆值，回 `edge://policy` 點「重新載入原則」。

> 此為 Microsoft 官方原則（[HubsSidebarEnabled](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies#hubssidebarenabled)），不影響 Edge 其他功能。

</details>

<br>

<details>
<summary><b>功能特性一覽</b></summary>

- 🎯 **多目標** — VIP 禮包與每週簽到依序領取，可個別開關
- 🔒 **登入偵測** — 過期時跳通知與橫幅，並可查看憑證剩餘時效
- ⏰ **定時領取** — 每天在設定時間自動開頁領取
- 🔄 **漏領補救** — 排程時瀏覽器沒開，下次啟動自動補領當天
- 🌙 **背景領取** — 視窗全關時也能以最小化視窗執行
- 📋 **執行記錄** — 每個目標各一筆，含每項禮包的詳細狀態
- 🔔 **版本通知** — 自動檢查新版，顯示 NEW 標記與通知
- 🛡️ **逾時保護** — 頁面 35 秒未回應自動關閉並記錄

</details>

<br>

<details>
<summary><b>開發者：新增一個領取目標</b></summary>

架構由 [`targets.js`](targets.js) 的註冊表驅動，新增目標不需要動 background 或 popup：

1. 在 `TARGETS` 加一筆（`id` / `name` / `url` / `match` / `loggedOut` / `ready`）
2. 新增 `claim-<id>.js`，以 `LK.register("<id>", ...)` 註冊領取流程
3. 在 `manifest.json` 的 `content_scripts` 加一組
4. 執行 `npm run check`

第 3 步漏掉時執行期是**完全靜默**的（分頁開得起來，腳本永遠不注入），所以 `npm run check` 會直接擋下。完整說明見 [MODULE_MAP.md](MODULE_MAP.md)。

</details>

<br>

<div align="center">

**LootKeeper** · 作者：墨染楓（瑤光聽雪） · [意見回饋](https://github.com/ZhouYuXun/LootKeeper/issues)

</div>
