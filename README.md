# Vàng — Ứng dụng Quản lý Tài chính Cá nhân cho Sinh viên

> Tối giản kiểu Linear/Revolut · Next.js App Router · TypeScript · Tailwind · Zustand · Supabase (Postgres + Auth + RLS) · PWA

## ✨ Tính năng chính

- **Dashboard & Safe-to-Spend:** Công thức $\text{Safe-to-Spend} = \frac{\text{Số dư khả dụng} - \text{Hóa đơn chưa trả} - \text{Tiết kiệm khóa}}{\text{Số ngày còn lại}}$ giúp biết ngay hôm nay tiêu tối đa bao nhiêu.
- **Quick-Add (`Ctrl/Cmd+K`):** Parser tiếng Việt thuần quy tắc nhận diện `35k`, `1tr5`, `1.5tr`, `50 nghìn`, `hôm qua`, tự đoán danh mục & ví.
- **Giao dịch, Nhiều ví & Chuyển ví:** Lọc đa chiều, nhóm theo ngày, chuyển tiền giữa các ví không tính vào thu/chi.
- **Ngân sách & Hóa đơn định kỳ:** Cảnh báo vàng ở 80%, đỏ khi vượt 100%; bấm **"Đã trả"** tự tạo giao dịch và trừ ví.
- **Mục tiêu tiết kiệm:** Dự báo ngày hoàn thành theo tốc độ tiết kiệm thực tế.
- **Sổ nợ & Chia tiền nhóm:** Chia đều hoặc chia theo món + phí ship, tự sinh sổ nợ, đánh dấu đã trả.
- **Báo cáo tháng thông minh:** So sánh tháng trước, Top 3 khoản tốn nhất, lời nhắc theo quy tắc (không dùng AI).
- **Bảo mật dữ liệu đa người dùng:** Supabase Auth (Email + Google) kết hợp Row Level Security (RLS) trên mọi bảng.
- **PWA:** Cài đặt trực tiếp lên màn hình chính iOS/Android.

---

## 🛠️ Phần 1: Thiết lập trên Supabase (từng bước)

### Bước 1: Tạo dự án Supabase
1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập.
2. Bấm **New Project**, đặt tên (ví dụ `vang-finance`), chọn mật khẩu DB, chọn Region gần Việt Nam (**Singapore**), bấm **Create new project**.

### Bước 2: Chạy Schema SQL + Bật RLS + Tạo Trigger
1. Ở menu trái của Supabase Dashboard, chọn **SQL Editor** → bấm **New query**.
2. Mở file [`supabase/schema.sql`](./supabase/schema.sql) trong dự án này, copy toàn bộ nội dung dán vào SQL Editor.
3. Bấm **Run** (hoặc `Ctrl+Enter`).
4. Kiểm tra kết quả:
   - Vào **Table Editor** → bạn sẽ thấy đủ các bảng: `wallets`, `categories`, `transactions`, `budgets`, `recurring_bills`, `saving_goals`, `debts`, `split_bills`.
   - Mọi bảng đều có biểu tượng chiếc khiên **RLS enabled** cùng policy `auth.uid() = user_id`.
   - Trigger `on_auth_user_created` sẽ tự tạo 3 ví mặc định (*Tiền mặt*, *Ngân hàng*, *Ống heo tiết kiệm*) và 14 danh mục tiếng Việt mỗi khi có người dùng mới đăng ký.

### Bước 3: Bật đăng nhập Email & Google
1. Vào **Authentication** → **Providers**:
   - **Email:** Mặc định đã bật. *(Mẹo khi test nhanh: bạn có thể tạm tắt **Confirm email** trong mục Email để đăng ký xong đăng nhập được ngay mà không cần mở hộp thư xác nhận).*
   - **Google:** Bật toggle **Enable Sign in with Google**, điền `Client ID` và `Client Secret` lấy từ [Google Cloud Console](https://console.cloud.google.com/apis/credentials) với Authorized redirect URI là:
     `https://<project-id>.supabase.co/auth/v1/callback`
2. Vào **Authentication** → **URL Configuration**:
   - **Site URL:** `http://localhost:3000` (khi lên Vercel đổi thành domain Vercel của bạn).
   - **Redirect URLs:** thêm cả 2 đường dẫn:
     - `http://localhost:3000/auth/callback`
     - `https://<ten-app-cua-ban>.vercel.app/auth/callback`

### Bước 4: Lấy API Keys & Cấu hình Local
1. Vào **Project Settings** → **API**:
   - Copy **Project URL** (`https://xxxx.supabase.co`).
   - Copy **anon / public key**.
2. Copy file `.env.example` thành `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Mở `.env.local` và điền 2 giá trị vừa copy:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   > **Lưu ý:** File `.env.local` đã được đưa vào `.gitignore`, tuyệt đối không commit lên GitHub.

### Bước 5: Chạy thử trên máy & chạy Unit Tests
```bash
npm install
npm test        # Chạy 85 unit tests (finance, quick-add parser, goals, split, monthly report)
npm run dev     # Mở http://localhost:3000
```

---

## 🚀 Phần 2: Deploy lên Vercel (từng bước)

1. Đẩy mã nguồn lên một repo GitHub của bạn (chắc chắn không có `.env.local`).
2. Truy cập [https://vercel.com](https://vercel.com) → **Add New...** → **Project** → chọn repo GitHub vừa tạo.
3. Trong mục **Environment Variables**, thêm đúng 2 biến:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL của bạn
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key của bạn
4. Bấm **Deploy** và chờ ~1–2 phút.
5. Sau khi có domain `https://<ten-app>.vercel.app`, quay lại **Supabase Dashboard → Authentication → URL Configuration**:
   - Cập nhật **Site URL** thành `https://<ten-app>.vercel.app`
   - Thêm `https://<ten-app>.vercel.app/auth/callback` vào **Redirect URLs**.
6. Mở trang trên điện thoại iOS (Safari → nút Chia sẻ → **Thêm vào Màn hình chính**) hoặc Android (Chrome → **Cài đặt ứng dụng**) để dùng như app PWA thực thụ.

---

## 🔒 Phần 3: Tự kiểm tra bảo mật RLS với 2 tài khoản

Mục tiêu: xác nhận **Tài khoản A** và **Tài khoản B** hoàn toàn tách biệt, không thể xem hay sửa dữ liệu của nhau.

1. **Đăng ký Tài khoản A:**
   - Mở `http://localhost:3000/login` (hoặc link Vercel).
   - Tạo tài khoản `userA@test.com` (hoặc đăng nhập Google #1).
   - Xác nhận Trigger tự tạo sẵn 3 ví (*Tiền mặt*, *Ngân hàng*, *Ống heo tiết kiệm*).
   - Nhấn `Ctrl+K`, nhập `trà sữa 55k tiền mặt` → nhấn `Enter`. Thêm 1 mục tiêu tiết kiệm tên `"Mua Laptop A"`.
2. **Đăng ký Tài khoản B (cửa sổ Ẩn danh / Incognito):**
   - Mở cửa sổ Ẩn danh mới → truy cập `/login`.
   - Tạo tài khoản `userB@test.com` (hoặc đăng nhập Google #2).
   - Kiểm tra Dashboard, Giao dịch, Ví tiền, Mục tiêu:
     - ✅ Tài khoản B có 3 ví riêng với số dư `0 ₫`.
     - ✅ **Hoàn toàn KHÔNG thấy** giao dịch `trà sữa 55k` hay mục tiêu `"Mua Laptop A"` của Tài khoản A.
3. **Kiểm tra sâu hơn trong Supabase SQL Editor (tùy chọn):**
   - Vào **Table Editor → transactions**: thấy cột `user_id` của mỗi dòng gắn đúng UUID từng user.
   - Bấm vào icon **RLS** trên từng bảng để xác nhận toàn bộ 8 bảng đều có policy `auth.uid() = user_id`.
