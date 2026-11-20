# ROADMAP — Sổ · Web Quản Lý Tiền Cá Nhân

> **Stack đề xuất:** React + TypeScript · Vite · Tailwind CSS v4 · Lucide React · Recharts · LocalStorage (MVP) → Supabase (Phase 3+)

---

## Tổng quan các Phase

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
  Setup       Core       Báo cáo     Cloud       Nâng cao
  (1 tuần)   (2 tuần)   (1 tuần)   (2 tuần)    (ongoing)
```

---

## ⚙️ Phase 0 — Project Setup (Tuần 1)

> Mục tiêu: Dự án chạy được trên máy, đúng design system, chưa có feature nghiệp vụ.

### 0.1 Khởi tạo dự án
- [ ] `pnpm create vite@latest so -- --template react-ts`
- [ ] Cài Tailwind CSS v4 + cấu hình `tailwind.config`
- [ ] Cài Lucide React, Recharts, React Router v7
- [ ] Cài `clsx`, `tailwind-merge` (utility)

### 0.2 Design Tokens
- [ ] Tạo `src/styles/tokens.css` — đưa toàn bộ CSS variables từ DESIGN.md vào
- [ ] Cấu hình Tailwind extend để map tokens → class (ví dụ `bg-surface`, `text-primary`)
- [ ] Nhúng font `Be Vietnam Pro` từ Google Fonts

### 0.3 Component Base
- [ ] `Button` (Primary / Secondary / Ghost / Danger)
- [ ] `Card` wrapper
- [ ] `Badge` / `Tag`
- [ ] `Input` + `Select` cơ bản
- [ ] Dark mode toggle (CSS class strategy)

### 0.4 Layout Shell
- [ ] Desktop: Sidebar (220px) + Main content
- [ ] Mobile: Header + Content + Bottom Nav (5 tab)
- [ ] Responsive breakpoint: `< 768px` → mobile layout

### ✅ Deliverable Phase 0
Mở app thấy layout đúng màu, đúng font, dark/light mode hoạt động, không có lỗi console.

---

## 🧱 Phase 1 — Core Features (Tuần 2–3)

> Mục tiêu: Người dùng có thể thêm/xem/xóa giao dịch, dữ liệu lưu LocalStorage.

### 1.1 Data Layer
- [ ] Định nghĩa TypeScript types:
  ```ts
  Transaction { id, type, amount, category, note, date, createdAt }
  Category    { id, name, icon, color, type }
  ```
- [ ] Hook `useTransactions()` — CRUD + persist to LocalStorage
- [ ] Seed data 10–15 giao dịch mẫu để demo

### 1.2 Dashboard (trang chính)
- [ ] Hero card: **Số dư hiện tại** (font 48px, animation count-up khi mở app lần đầu)
- [ ] 2 card nhỏ: Tổng thu / Tổng chi trong tháng
- [ ] Danh sách 5 giao dịch gần nhất
- [ ] Link "Xem tất cả →"

### 1.3 Trang Giao dịch
- [ ] Danh sách đầy đủ, sort theo ngày (mới nhất lên trên)
- [ ] Group by ngày (header ngày + danh sách giao dịch của ngày đó)
- [ ] Tìm kiếm theo tên, lọc theo danh mục
- [ ] Swipe-to-delete (mobile) / nút xóa hover (desktop)

### 1.4 Modal Thêm / Sửa giao dịch
- [ ] Toggle Chi tiêu / Thu nhập
- [ ] Input số tiền (focus auto-format, hiện bàn phím số trên mobile)
- [ ] Chọn danh mục (grid icon)
- [ ] Trường ghi chú (optional)
- [ ] Date picker (mặc định hôm nay)
- [ ] Animation: slide-up mobile / fade-scale desktop
- [ ] Validation: không để trống số tiền, không âm

### 1.5 Danh mục mặc định
- [ ] Chi tiêu: 🍜 Ăn uống · 🚌 Đi lại · 🛒 Mua sắm · 🏥 Sức khỏe · 📚 Học tập · 🏠 Nhà cửa · 🎮 Giải trí · 💸 Khác
- [ ] Thu nhập: 💼 Lương · 🎁 Quà tặng · 📈 Đầu tư · 💰 Khác

### ✅ Deliverable Phase 1
Dùng được app hàng ngày: thêm/sửa/xóa giao dịch, số dư tự cập nhật, lưu qua F5.

---

## 📊 Phase 2 — Báo cáo & Thống kê (Tuần 4)

> Mục tiêu: Người dùng hiểu được xu hướng chi tiêu của mình.

### 2.1 Trang Báo cáo
- [ ] Tab chọn kỳ: Tuần / Tháng / Quý / Năm
- [ ] Biểu đồ cột (Bar chart): Thu nhập vs Chi tiêu theo tháng (Recharts)
- [ ] Biểu đồ tròn/donut: Phân bổ danh mục chi tiêu
- [ ] Bảng top 5 danh mục chi nhiều nhất
- [ ] So sánh tháng hiện tại vs tháng trước (% thay đổi)

### 2.2 Trang Ngân sách (Budget)
- [ ] Đặt ngân sách theo danh mục (ví dụ: Ăn uống tối đa 2.000.000 ₫/tháng)
- [ ] Progress bar: đã dùng / tổng ngân sách
- [ ] Cảnh báo màu amber khi vượt 80%, đỏ khi vượt 100%

### 2.3 Xuất dữ liệu
- [ ] Export CSV tất cả giao dịch

### ✅ Deliverable Phase 2
Người dùng nhìn vào chart biết ngay tháng này tiêu nhiều nhất vào đâu.

---

## ☁️ Phase 3 — Cloud & Auth (Tuần 5–6)

> Mục tiêu: Dữ liệu không mất khi đổi máy, có thể dùng trên điện thoại + laptop.

### 3.1 Backend — Supabase
- [ ] Tạo project Supabase (miễn phí)
- [ ] Schema: `users`, `transactions`, `categories`, `budgets`
- [ ] Row Level Security (RLS): mỗi user chỉ đọc/ghi data của mình
- [ ] Migrate data từ LocalStorage lên Supabase

### 3.2 Authentication
- [ ] Đăng nhập Email + Password
- [ ] Google OAuth (1 click)
- [ ] Trang onboarding cho user mới (nhập tên, chọn tiền tệ)
- [ ] Persist session (auto login)

### 3.3 Sync
- [ ] Real-time update qua Supabase Realtime (optional)
- [ ] Offline fallback: vẫn hoạt động khi mất mạng, sync khi có lại

### ✅ Deliverable Phase 3
Tạo tài khoản, đăng nhập từ 2 thiết bị khác nhau, dữ liệu đồng bộ.

---

## ✨ Phase 4 — Nâng cao (Ongoing)

> Các tính năng nâng cấp trải nghiệm, làm sau khi core đã ổn.

### 4.1 UX Nâng cao
- [ ] PWA (Progressive Web App) — cài lên màn hình điện thoại như app thật
- [ ] Thông báo nhắc nhở ghi chi tiêu (Push Notification)
- [ ] Nhập nhanh bằng giọng nói (Speech-to-text)

### 4.2 Tính năng Thông minh
- [ ] Gợi ý danh mục tự động dựa theo tên giao dịch (rule-based)
- [ ] Insight hàng tháng: "Tháng này bạn chi ăn uống nhiều hơn 23% tháng trước"
- [ ] Dự báo số dư cuối tháng dựa theo chi tiêu trung bình

### 4.3 Quản lý Tài khoản
- [ ] Nhiều tài khoản (Tiền mặt · Ngân hàng · Ví điện tử)
- [ ] Chuyển tiền giữa các tài khoản
- [ ] Mục tiêu tiết kiệm (Saving Goals) với progress tracking

### 4.4 Chia sẻ
- [ ] Xuất báo cáo PDF đẹp
- [ ] Chia sẻ tóm tắt tháng dạng ảnh (share to story)

---

## 📋 Thứ tự ưu tiên khi bắt đầu

```
Làm ngay (cao nhất)         Làm sau              Làm cuối
─────────────────────       ─────────────        ─────────────────
✅ Phase 0: Setup           📊 Phase 2           ✨ Phase 4
✅ Phase 1: CRUD core       ☁️ Phase 3           (tùy nhu cầu)
```

---

## 🗂️ Cấu trúc thư mục đề xuất

```
src/
├── components/
│   ├── ui/              ← Button, Card, Input, Badge (design system)
│   ├── layout/          ← Sidebar, BottomNav, Header
│   └── features/        ← TransactionCard, BudgetBar, CategoryPicker
├── pages/
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── Reports.tsx
│   ├── Budgets.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useTransactions.ts
│   ├── useCategories.ts
│   └── useBudgets.ts
├── lib/
│   ├── storage.ts       ← LocalStorage helpers
│   ├── formatters.ts    ← format tiền tệ VN, ngày tháng
│   └── supabase.ts      ← (Phase 3)
├── styles/
│   └── tokens.css
└── types/
    └── index.ts
```

---

*ROADMAP.md · Sổ v1.0 · 2026-11-20*
