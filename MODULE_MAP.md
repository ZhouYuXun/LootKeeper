# MODULE_MAP

> 各檔案的職責、如何擴充、資料結構。改動架構後請同步更新。
> 使用者導向的說明在 [README.md](README.md)。

## 設計主軸

整套系統由 [`targets.js`](targets.js) 的**目標註冊表**驅動。排程、佇列、記錄、開關、
狀態顯示全部從註冊表推導，因此新增一個領取目標**不必動 background 或 popup**。

## 可重用模組

| 模組 | 提供什麼 | 誰在用 |
| --- | --- | --- |
| `targets.js` | 目標註冊表 `TARGETS`，以及 `findTargetByUrl` / `getTarget` / `targetMatchesUrl` | `background.js`（`importScripts`）、所有 content script（注入順序第一位） |
| `claim-core.js` | content script 骨架：`LK.register`、`waitForAny`、`waitForElement`、`sleep`、`diagStep`，以及「授權驗證 → 等待渲染 → 登入判定 → 執行流程 → 回報」的生命週期 | `claim-vip.js`、`claim-checkin.js` |

## 檔案職責

| 檔案 | 職責 |
| --- | --- |
| `manifest.json` | MV3 宣告。每個目標一組 `content_scripts`，`js` 順序固定為 `targets.js → claim-core.js → claim-<id>.js` |
| `background.js` | Service worker：每日排程、序列化領取佇列、分頁生命週期、診斷日誌、登入偵測與通知、登入時效量測、版本檢查、v2→v3 資料遷移 |
| `claim-vip.js` | VIP 禮包流程（`.gift-card--claimable` / `--claimed` / `--locked`） |
| `claim-checkin.js` | 每週簽到流程（`.btn-checkin` / `.btn-checkin.un`、`.day.yqd` / `.ygq`） |
| `popup.html` / `popup.js` | 控制面板：記錄、目標開關、登入狀態、排程設定、診斷面板 |

## 守門與工具

`npm run check` 依序跑語法檢查、一致性檢查與兩支單元測試，**推送前必須綠燈**。

| 工具 | 守住什麼 |
| --- | --- |
| `tools/check-consistency.mjs` | `targets.js` ↔ `manifest.json` ↔ handler 檔的一致性 |
| `tools/test-jwt.mjs` | `decodeJwtTimes` 正確，且兩份實作不漂移 |
| `tools/test-version.mjs` | `isNewer` 版本比對（`3.10` > `3.9` 這類陷阱） |
| `tools/gen-icon.mjs` | 產生圖示（`npm run icons`，無外部相依） |

各守門的存在理由都寫在該檔開頭。共通點是它們擋的都是**靜默失敗**——不會拋錯、
不會有紅字，只會表現成「今天沒領到」或「有新版卻沒通知」。

> **刻意的重複**：`decodeJwtTimes` 在 `background.js` 與 `claim-core.js` 各有一份。
> service worker 與 content script 是兩個執行環境、兩個 classic script，無法共用模組。
> 由 `tools/test-jwt.mjs` 守住兩者行為一致。

## 新增一個領取目標

1. **`targets.js`** — 在 `TARGETS` 加一筆：`id` / `name` / `url` / `match` / `loggedOut` / `ready`
2. **`claim-<id>.js`** — 以 `LK.register("<id>", async ({ waitForElement, waitForAny, sleep, diagStep }) => [...])` 註冊
   回傳 `results` 陣列，每筆 `{ name, status, note }`，`status` 為 `success` / `skipped` / `not_found`
3. **`manifest.json`** — `content_scripts` 加一組，`matches` 用同一個 match pattern，`js` 用上述固定順序
4. **`npm run check`**

漏掉第 3 步在執行期是**完全靜默**的：分頁開得起來，腳本永遠不注入，沒有任何錯誤訊息。
v3.0 新增簽到時就撞在這裡，所以第 4 步會直接擋下。

## 資料結構

### `chrome.storage.local`

| 鍵 | 結構 | 備註 |
| --- | --- | --- |
| `lastClaim` | `{ [targetId]: "YYYY-MM-DD" }` | **本地時區**日期，不可用 `toISOString()`。v2.x 為單一字串，由 `migrateStorage()` 遷移 |
| `targetsEnabled` | `{ [targetId]: boolean }` | 未設定的目標視為啟用，新版新增的目標自動生效 |
| `loginRequired` | `{ [targetId]: true }` | 驅動 popup 橫幅與桌面通知 |
| `pendingClaim` | `{ at: number, queue: string[] }` | Edge sidebar 限制下的待執行佇列。v2.x 為時間戳數字 |
| `claimLog` | `[{ time, target, targetName, results, error, loginRequired }]` | 每個目標一筆 |
| `diagLog` | `[{ t, type, note }]` | 上限 150 筆 |
| `updateInfo` | `{ remote, hasUpdate, checkedAt, notifiedFor, error }` | 版本比對只在 background，popup 純顯示 |
| `loginSpans` | `{ okSince: number\|null, spans: [{ from, to, hours }] }` | 登入維持時間觀測，最多 5 筆。`hours` 是**下限**（計時起點是首次確認登入有效，非實際登入時刻） |
| `authProbe` | `{ at, cookies: [{ name, domain, cookieExpHours, jwtExpHours, jwtLifetimeHours }], web: [{ key, jwtExpHours, jwtLifetimeHours }] }` | 登入時效量測。**只存時間，絕不存憑證值** |

### `chrome.storage.session`

`lkAuthorizedTab`（授權分頁 id）、`lkActiveTarget`（當前目標）、`lkQueue`（剩餘佇列）。
放 session 是為了讓 service worker 被回收重啟後，領取佇列仍能接續執行。

## 安全界線

- **憑證值不落地**：cookie 與 token 只解出 `exp` / `iat` 兩個時間欄位，不寫入 storage、不寫入診斷記錄、不顯示於畫面
- **只動自己開的分頁**：content script 會先向 background 驗證分頁授權（`lkAuthorizedTab`），使用者自行開啟的頁面不會被操作
- **登入網域為可選權限**：`163.com` / `easebar.com` 不在安裝時索取，由 popup 在使用者點擊時申請。清單只存在 background 的 `LOGIN_ORIGINS`，popup 以 `getLoginOrigins` 取回，避免兩處漂移
