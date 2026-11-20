# Vàng — Ứng dụng Quản lý Tài chính Cá nhân cho Sinh viên

> Tối giản kiểu Linear / Revolut · **"Số tiền là nhân vật chính"** · Next.js App Router + TypeScript + Supabase + Gemini AI Receipt Scanner + PWA

---

## 📸 Ảnh chụp màn hình (Portfolio)

> *(Đặt ảnh chụp màn hình thật vào thư mục `public/screenshots/` trước khi publish GitHub)*

| Dashboard Desktop (Light / Dark) | Mobile + Quick-Add (`Ctrl+K`) | Báo cáo tháng & Quét hóa đơn |
|---|---|---|
| ![Dashboard](public/screenshots/dashboard-desktop.png) | ![Mobile](public/screenshots/dashboard-mobile.png) | ![Reports](public/screenshots/reports-and-scan.png) |

---

## ✨ Tính năng nổi bật

- **Safe-to-Spend (Mức tiêu an toàn hôm nay):**
  $$\text{Safe-to-Spend} = \frac{\text{Số dư ví khả dụng} - \text{Hóa đơn chưa trả} - \text{Tiết kiệm đã khóa}}{\text{Số ngày còn lại trong tháng (UTC+7)}}$$
- **Quick-Add tiếng Việt (`Ctrl/Cmd+K`):** Parser thuần quy tắc hiểu `35k`, `1tr5`, `1.5tr`, `50 nghìn`, `hôm qua`, tự đoán danh mục & ví, hiện preview tag chỉnh sửa rồi `Enter` lưu ngay.
- **Quét hóa đơn bằng AI:** Chụp bằng camera hoặc chọn ảnh (tối đa 5MB), nén server-side xuống ≤ 1600px bằng `sharp`, trích xuất JSON bằng Gemini (`gemini-3.5-flash-lite`) kiểm định qua **Zod**, điền sẵn vào form để người dùng xác nhận (mặc định **không lưu ảnh**).
- **Quản lý nhiều ví & Chuyển tiền nội bộ:** Chuyển tiền giữa ví không làm sai lệch tổng thu/chi.
- **Ngân sách & Hóa đơn định kỳ:** Cảnh báo vàng ở 80%, đỏ khi vượt 100%; bấm **"Đã trả"** tự tạo giao dịch và trừ ví.
- **Mục tiêu tiết kiệm:** Dự báo ngày hoàn thành theo tốc độ tiết kiệm thực tế 60 ngày gần nhất.
- **Sổ nợ & Chia tiền nhóm:** Ghi ai nợ ai, chia đều hoặc chia theo món + phí ship, đánh dấu đã trả.
- **Báo cáo tháng thông minh:** So sánh tháng trước, Top 3 khoản tốn nhất, lời nhắc theo quy tắc (không dùng AI).
- **Xuất / Nhập & Quyền riêng tư:** Xuất CSV (UTF-8 BOM cho Excel tiếng Việt), sao lưu/khôi phục toàn bộ JSON, chế độ ẩn số dư (Privacy Mode), và nút xóa tài khoản + toàn bộ dữ liệu.
- **Hiệu năng & Truy cập:** Lighthouse Accessibility **100/100** (WCAG AA Light & Dark), Best Practices **100/100**, SEO **100/100**, CLS **0**, cài đặt PWA trên iOS & Android.

---

## 🧱 Tech Stack

| Lớp | Công nghệ |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI, Lucide Icons |
| **Biểu đồ & Font** | Recharts (lazy-loaded `next/dynamic`), Be Vietnam Pro (`next/font/google`) |
| **State & Validation** | Zustand, Zod, date-fns, Sonner |
| **Backend & Database** | Supabase (PostgreSQL, Row Level Security, Auth Email + Google, Private Storage) |
| **AI Receipt OCR** | Next.js Route Handler + `sharp` + `@google/genai` (`gemini-3.5-flash-lite`) |
| **Kiểm thử** | Vitest (108+ unit tests cho tài chính, parser, mục tiêu, chia tiền, báo cáo, hóa đơn, sao lưu) |

---

## 💻 Cách chạy Local

```bash
# 1. Cài đặt phụ thuộc
npm install

# 2. Tạo file biến môi trường từ mẫu
cp .env.example .env.local
# Sau đó mở .env.local điền các khóa bên dưới

# 3. Chạy kiểm thử & lint
npm run lint
npm test

# 4. Khởi động máy chủ phát triển
npm run dev
# Mở http://localhost:3000
```

### Biến môi trường cần khai báo (`.env.local` & Vercel)

| Biến | Phía | Bắt buộc | Mô tả |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Có (nếu dùng Cloud) | Project URL trong **Supabase → Settings → API** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Có (nếu dùng Cloud) | Anon public key (bảo vệ bởi RLS) |
| `GEMINI_API_KEY` | **Chỉ Server** | Tùy chọn | Key đọc hóa đơn lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/apikey) *(KHÔNG dùng tiền tố `NEXT_PUBLIC_`)* |

---

## 🚀 Hướng dẫn Deploy lên Vercel & Cấu hình Supabase

### 1. Thiết lập Supabase
1. Tạo project mới trên [Supabase](https://supabase.com) (chọn Region **Singapore**).
2. Vào **SQL Editor → New query**, dán toàn bộ [`supabase/schema.sql`](./supabase/schema.sql) và bấm **Run**:
   - Tạo 8 bảng + bật **RLS** (`auth.uid() = user_id`) cho mọi bảng.
   - Tạo Trigger `on_auth_user_created` tự sinh 3 ví mặc định & 14 danh mục tiếng Việt.
   - Tạo bucket riêng tư `receipts` (có RLS theo thư mục `user_id`) và RPC `delete_my_account()`.
3. Vào **Authentication → Providers**:
   - Bật **Email** (và **Google** nếu muốn đăng nhập 1 chạm).
   - Với **Google OAuth**, thêm Authorized Redirect URI trên [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
     ```
     https://<project-id>.supabase.co/auth/v1/callback
     ```

### 2. Deploy lên Vercel
1. Đẩy mã nguồn lên GitHub (đảm bảo **không** có `.env.local`).
2. Vào [Vercel](https://vercel.com) → **Add New Project** → chọn repo.
3. Khai báo đủ 3 biến môi trường ở bảng trên trong mục **Environment Variables**.
4. Bấm **Deploy** → nhận domain `https://<ten-app>.vercel.app` (hoặc gắn custom domain trong **Settings → Domains**).

### 3. Cập nhật Redirect URL trên Supabase
Vào **Supabase → Authentication → URL Configuration**:
- **Site URL:** `https://<domain-cua-ban>` (ví dụ `https://vang-finance.vercel.app`)
- **Redirect URLs:** thêm đủ:
  - `http://localhost:3000/auth/callback`
  - `https://<domain-cua-ban>/auth/callback`

### 4. Kiểm tra cài đặt PWA trên điện thoại
- **iPhone (Safari):** Mở trang web → bấm nút **Chia sẻ (Share)** → **Thêm vào Màn hình chính (Add to Home Screen)** → mở icon **Vàng** (chạy full-screen không có thanh địa chỉ).
- **Android (Chrome):** Mở trang web → bấm menu `⋮` → **Cài đặt ứng dụng (Install app)** → xác nhận icon maskable hiển thị sắc nét.

---

## ✅ Checklist trước khi Public (tự kiểm tra trên Dashboard)

### Trên Supabase Dashboard
- [ ] Đã chạy mới nhất file `supabase/schema.sql` (bao gồm cả `delete_my_account()` và bucket `receipts`).
- [ ] **Table Editor:** Xác nhận 8/8 bảng đều hiển thị biểu tượng **RLS Enabled**.
- [ ] **Authentication → URL Configuration:** Đã đổi **Site URL** sang domain production Vercel và thêm `/auth/callback` vào **Redirect URLs**.
- [ ] **Authentication → Providers → Google:** Đã điền đúng Client ID & Secret, thử đăng nhập Google thành công trên domain thật.
- [ ] **Email Templates / Rate Limits:** Bật lại **Confirm email** nếu muốn chặn đăng ký ảo.
- [ ] **Test 2 tài khoản:** Đăng nhập Tài khoản A (trình duyệt thường) và Tài khoản B (Ẩn danh), xác nhận hoàn toàn không thấy dữ liệu của nhau.

### Trên Vercel Dashboard
- [ ] Đã khai báo đủ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` cho môi trường **Production**.
- [ ] Kiểm tra không có `service_role` key nào trong Environment Variables hoặc source code.
- [ ] Nếu gắn tên miền riêng (Custom Domain), đã xác minh SSL (HTTPS) hoạt động và cập nhật lại domain đó vào Supabase Redirect URLs + Google OAuth.
- [ ] Thử quét 1 hóa đơn thật, xuất 1 file CSV mở bằng Excel (kiểm tra tiếng Việt không lỗi font), và thử cài PWA trên điện thoại.
