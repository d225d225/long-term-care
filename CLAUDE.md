# CLAUDE.md — 工作記錄

## 2026-05-19 青銀共融活動專案

---

### GitHub Repo

| 項目 | 內容 |
|------|------|
| 網址 | https://github.com/d225d225/long-term-care |
| 帳號 | d225d225 |
| Pages | https://d225d225.github.io/long-term-care/ |
| 備註 | GitHub 不支援中文 repo 名稱，「長照服務」改為 `long-term-care` |

---

### Repo 檔案清單

| 檔案 | 說明 |
|------|------|
| `README.md` | Repo 說明首頁，含心得網站連結 |
| `115年度青銀共融活動企劃.md` | 原始活動企劃書 |
| `家長同意書.md` | 家長同意書 / 報名表（含 QR Code、心得連結） |
| `index.html` | 學生心得投稿網站（根目錄，GitHub Pages 入口） |
| `site/index.html` | 同上，備用路徑 |
| `teacher.html` | 教師管理後台 |
| `tests/package.json` | Jest 測試套件設定 |
| `tests/__tests__/student.test.js` | 學生頁測試（53 個案例） |
| `tests/__tests__/teacher.test.js` | 教師頁測試（53 個案例） |

---

### 活動資訊

| 項目 | 內容 |
|------|------|
| 活動名稱 | 115年度青銀共融「一日照服小幫手」體驗活動 |
| 日期 | 民國 115 年 6 月 10 日（星期三） |
| 參加人數 | **35 人** |
| 集合 | 13:30 永平之光（帶書包） |
| 抵達機構 | 14:05 恆安住宿長照機構 |
| 簽到量體溫 | 14:05－14:20 |
| 服務 | 14:30－16:30 |
| 返校放學 | 16:30 出發，16:55 抵校直接放學 |
| 主辦 | 恆安住宿長照機構 |
| 協辦 | 永平高中 |

---

### 學生心得網站（index.html）功能

- 填寫姓名、班級、服務組別、**電子郵件**、心得（最多 500 字）
- 送出後老師給予評語時寄送 Email 通知
- 心得牆即時顯示，可依環境組 / 聊天組篩選
- 老師評語以**紅色字體**顯示
- 已評語卡片顯示**盧盧印章**（傾斜圓形紅色印章，含動畫）
- Firebase Firestore 儲存（需設定），未設定時 fallback 到 localStorage

---

### 教師管理後台（teacher.html）功能

- 密碼登入（預設：`teacher2025`，可在 CONFIG 區修改）
- 統計列：總數 / 已評語 / 待評語 / 環境組 / 聊天組
- 多重篩選：狀態 + 組別 + 關鍵字搜尋
- 點擊卡片展開，查看完整心得內容
- 填寫評語並儲存，學生頁即時更新
- 老師評語以**紅色字體**顯示
- 已評語卡片顯示**盧盧印章**（含蓋章彈跳動畫）
- 寄送 EmailJS 通知信，包含學生**原始心得全文** + 老師評語

---

### 家長同意書 / 報名表（家長同意書.md）

- 活動資訊完整列表
- 心得填寫連結 + QR Code（掃描直接開啟）
- 服務組別志願勾選（環境組 / 聊天組，最終由學務處安排）
- 獎勵：服務時數 4 hr（繳心得升 5 hr）、愛校時數 4 hr（繳心得升 5 hr）
- 國泰人壽團體學生平安保險說明

---

### 技術架構

| 功能 | 技術 | 備註 |
|------|------|------|
| 資料儲存 | Firebase Firestore | 需建立專案填入 config |
| 電子郵件通知 | EmailJS | 免費 200 封/月，需設定帳號 |
| 網站部署 | GitHub Pages | 已啟用，約 1-2 分鐘生效 |
| 測試 | Jest + jsdom | `cd tests && npm install && npm test` |

### Firebase Config 位置
- `index.html` 頂部 `FIREBASE_CONFIG` 區塊
- `teacher.html` 頂部 `FIREBASE_CONFIG` 區塊

### EmailJS Config 位置（teacher.html）
- `EMAILJS_PUBLIC_KEY`
- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID`

### EmailJS 模板變數
```
{{student_name}}      學生姓名
{{student_email}}     學生 Email
{{student_class}}     班級座號
{{student_group}}     服務組別（環境組／聊天組）
{{student_text}}      學生原始心得全文
{{teacher_comment}}   老師評語
{{activity_name}}     活動名稱
```

---

### 測試套件（106 個案例，全數通過）

```bash
cd ~/Downloads/心得分享網站/tests
npm install
npm test
```

| 測試類別 | 案例數 |
|----------|--------|
| esc() HTML 跳脫 + XSS 防護 | 10 |
| Email 格式驗證 | 10 |
| 表單欄位驗證 | 10 |
| 心得牆篩選邏輯 | 5 |
| localStorage 讀寫 | 5 |
| 心得牆渲染（印章、紅字、XSS）| 8 |
| 心得提交完整流程 | 4 |
| 登入驗證 | 5 |
| 統計計算 | 8 |
| 篩選與搜尋 | 14 |
| 評語儲存 | 8 |
| Email 參數（含 student_text）| 9 |
| 盧盧印章渲染 | 9 |
| localStorage 評語整合 | 2 |

---

### 待辦事項

- [ ] 填入 Firebase 專案 config（index.html + teacher.html）
- [ ] 填入 EmailJS 設定（teacher.html）
- [ ] 確認學務處公告心得截止日，補入家長同意書
- [ ] 修改教師密碼（teacher.html CONFIG 區）
