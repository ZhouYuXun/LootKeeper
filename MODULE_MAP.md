# MODULE_MAP

> 本檔說明各檔案的職責與如何擴充。改動架構後請同步更新。

## ♻️ 可重用基礎模組

| 模組 | 提供什麼 | 使用者 |
| --- | --- | --- |
| `targets.js` | 領取目標註冊表 `TARGETS`，以及 `findTargetByUrl` / `getTarget` / `targetMatchesUrl` | background.js（`importScripts`）、所有 content script（注入順序第一位） |
| `claim-core.js` | content script 共用骨架：`LK.register`、`waitForAny`、`waitForElement`、`sleep`、`diagStep`，以及「授權驗證 → 等待渲染 → 登入判定 → 執行流程 → 回報」的完整生命週期 | `claim-vip.js`、`claim-checkin.js` |
| `tools/check-consistency.mjs` | 靜態守門：targets.js ↔ manifest.json ↔ handler 檔的一致性 | `npm run check` |
| `tools/gen-icon.mjs` | 無外部相依的 PNG 產生器 | `npm run icons` |

## 檔案職責

| 檔案 | 職責 |
| --- | --- |
| `manifest.json` | MV3 宣告。每個目標一組 `content_scripts`，`js` 順序固定為 `targets.js → claim-core.js → claim-<id>.js` |
| `background.js` | Service worker。排程（`dailyClaim` alarm）、序列化領取佇列、分頁生命週期、診斷日誌、登入通知、cookie 到期量測、v2→v3 資料遷移 |
| `claim-core.js` | 見上表 |
| `claim-vip.js` | VIP 禮包流程（`.gift-card--claimable` / `--claimed` / `--locked`） |
| `claim-checkin.js` | 每週簽到流程（`.btn-checkin` / `.btn-checkin.un`、`.day.yqd` / `.ygq`） |
| `popup.html` / `popup.js` | 控制面板：記錄、目標開關、排程設定、診斷面板 |

## 新增一個領取目標

1. 在 `targets.js` 的 `TARGETS` 加一筆：`id` / `name` / `url` / `match` / `loggedOut` / `ready`
2. 新增 `claim-<id>.js`，以 `LK.register("<id>", async ({ waitForElement, waitForAny, sleep, diagStep }) => [...])` 註冊；回傳 `results` 陣列，每筆為 `{ name, status, note }`，`status` 為 `success` / `skipped` / `not_found`
3. 在 `manifest.json` 的 `content_scripts` 加一組，`matches` 用同一個 match pattern，`js` 用上述固定順序
4. 執行 `npm run check` —— 漏掉第 3 步時它會直接指出（這種漏失在執行期是**完全靜默**的：分頁開得起來，腳本永遠不注入）

background.js、popup.js **不需要任何改動**：排程、佇列、記錄、開關、狀態顯示全部由註冊表驅動。

## 資料結構（chrome.storage.local）

| 鍵 | 結構 | 備註 |
| --- | --- | --- |
| `lastClaim` | `{ [targetId]: "YYYY-MM-DD" }` | **本地時區**日期。v2.x 為單一字串，由 `migrateStorage()` 遷移 |
| `targetsEnabled` | `{ [targetId]: boolean }` | 未設定的目標視為啟用，新版新增目標自動生效 |
| `loginRequired` | `{ [targetId]: true }` | 驅動 popup 橫幅與桌面通知 |
| `pendingClaim` | `{ at: number, queue: string[] }` | Edge sidebar 限制下的待執行佇列。v2.x 為時間戳數字 |
| `claimLog` | `[{ time, target, targetName, results, error, loginRequired }]` | 每個目標一筆 |
| `diagLog` | `[{ t, type, note }]` | 上限 150 筆 |

`chrome.storage.session`：`lkAuthorizedTab`（授權分頁 id）、`lkActiveTarget`（當前目標）、`lkQueue`（剩餘佇列，SW 重啟後仍可續跑）。
