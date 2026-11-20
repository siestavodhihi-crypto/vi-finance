# DESIGN SYSTEM — "Vàng" *(Personal Finance App)*

> **Đề xuất tên:** **Vàng** — ngắn gọn, thuần Việt, gợi lên tiền bạc & sự quý giá mà không hoa mỹ. Các tên thay thế: **Két** (két sắt), **Xu**, **Rủng Rỉnh**.

---

## 1. TRIẾT LÝ THIẾT KẾ

**"Số tiền là nhân vật chính."**

Lấy cảm hứng từ Linear (tối giản, có trọng lượng thị giác) và Revolut (số liệu to, táo bạo). Giao diện không trang trí thừa — mỗi pixel phải có lý do tồn tại. Màu sắc dùng để truyền tải ý nghĩa (xanh = thu, đỏ = chi, vàng = accent) chứ không phải để làm đẹp.

---

## 2. BẢNG MÀU

### 2a. Light Mode

| Token | Hex | Dùng cho |
|---|---|---|
| `--color-bg` | `#F5F4F0` | Nền trang chính (trắng ngà ấm) |
| `--color-surface` | `#FFFFFF` | Card, panel, modal |
| `--color-border` | `#E8E6DF` | Đường viền, divider |
| `--color-text-primary` | `#1A1A18` | Tiêu đề, số tiền lớn |
| `--color-text-secondary` | `#6B6860` | Nhãn, chú thích, metadata |
| `--color-accent` | `#C8A44A` | Nút CTA, highlight, số dư chính |
| `--color-income` | `#2D7D5F` | Thu nhập, số dương |
| `--color-expense` | `#C0392B` | Chi tiêu, số âm |

### 2b. Dark Mode

| Token | Hex | Dùng cho |
|---|---|---|
| `--color-bg` | `#141412` | Nền trang (nâu đất rất tối) |
| `--color-surface` | `#1E1D1A` | Card, panel, modal |
| `--color-border` | `#2C2B27` | Đường viền, divider |
| `--color-text-primary` | `#F0EDE6` | Tiêu đề, số tiền lớn |
| `--color-text-secondary` | `#8A8780` | Nhãn, chú thích, metadata |
| `--color-accent` | `#D4AF5A` | Nút CTA, highlight, số dư chính |
| `--color-income` | `#4DAA84` | Thu nhập, số dương |
| `--color-expense` | `#E05C4B` | Chi tiêu, số âm |

> **Lý do chọn tông ấm (nâu ngà):** Tránh nền trắng lạnh cứng và nền đen + neon. Màu ngà tạo cảm giác như trang giấy sổ tay — liên kết với tên gốc "Sổ" — trong khi vàng accent gợi giá trị vật chất tự nhiên.

---

## 3. TYPOGRAPHY

**Font duy nhất:** `Be Vietnam Pro` (Google Fonts) — hỗ trợ tiếng Việt đầy đủ dấu, nét thanh lịch, dễ đọc số.

```
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');
```

### Hệ thống cỡ chữ

| Role | Size | Weight | Line-height | Dùng cho |
|---|---|---|---|---|
| `display` | 48px / 3rem | 800 | 1.1 | Số dư tổng (hero number) |
| `heading-1` | 28px / 1.75rem | 700 | 1.2 | Tiêu đề trang |
| `heading-2` | 20px / 1.25rem | 600 | 1.3 | Tiêu đề section, card |
| `body-lg` | 16px / 1rem | 400 | 1.6 | Nội dung chính |
| `body-sm` | 14px / 0.875rem | 400 | 1.5 | Mô tả, nội dung phụ |
| `amount-lg` | 24px / 1.5rem | 700 | 1.2 | Số tiền trong list giao dịch |
| `amount-sm` | 16px / 1rem | 600 | 1.4 | Số tiền phụ, tổng nhỏ |
| `label` | 12px / 0.75rem | 500 | 1.4 | Nhãn tag, badge, caption |
| `mono` | 14px / 0.875rem | 400 | 1.5 | Mã giao dịch (dùng `font-variant-numeric: tabular-nums`) |

> **Quy tắc số tiền:** Luôn dùng `font-variant-numeric: tabular-nums` để các chữ số thẳng hàng. Số tiền ≥ 1 triệu rút gọn thành `1.2 tr`, ≥ 1 tỷ thành `1.2 tỷ` nhưng hiển thị đầy đủ khi hover/focus.

---

## 4. QUY TẮC THIẾT KẾ

### 4a. Bo góc (Border Radius)

| Token | Value | Dùng cho |
|---|---|---|
| `--radius-sm` | 6px | Tag, badge nhỏ, input |
| `--radius-md` | 12px | Card giao dịch, button |
| `--radius-lg` | 16px | Card lớn (số dư, chart) |
| `--radius-xl` | 24px | Modal, bottom sheet |
| `--radius-full` | 9999px | Avatar, pill button, toggle |

### 4b. Khoảng cách (Spacing — base 4px)

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64px
```

| Token | Value | Dùng cho |
|---|---|---|
| `--space-xs` | 4px | Gap icon-text |
| `--space-sm` | 8px | Padding tag, gap icon trong button |
| `--space-md` | 16px | Padding card nhỏ, gap giữa items |
| `--space-lg` | 24px | Padding card lớn |
| `--space-xl` | 32px | Margin section |
| `--space-2xl` | 48px | Padding trang |

### 4c. Bóng đổ (Shadow)

Không dùng bóng đen cứng. Dùng bóng màu ấm, nhẹ:

```css
--shadow-sm:  0 1px 3px rgba(26, 26, 24, 0.06), 0 1px 2px rgba(26, 26, 24, 0.04);
--shadow-md:  0 4px 12px rgba(26, 26, 24, 0.08), 0 2px 4px rgba(26, 26, 24, 0.04);
--shadow-lg:  0 8px 24px rgba(26, 26, 24, 0.10), 0 4px 8px rgba(26, 26, 24, 0.06);
--shadow-focus: 0 0 0 3px rgba(200, 164, 74, 0.35);  /* ring vàng khi focus */
```

*Dark mode: nhân opacity × 1.5, màu giữ nguyên (vẫn ấm hơn đen thuần).*

### 4d. Icon

**Thư viện:** [Lucide](https://lucide.dev/) — dùng bản `lucide-react` hoặc SVG inline.

| Quy tắc | Chi tiết |
|---|---|
| Kích thước mặc định | 20×20px (`size={20}`) |
| Icon trong button | 18×18px, `stroke-width={1.75}` |
| Icon lớn (empty state) | 48×48px, `stroke-width={1.25}` |
| Màu | Kế thừa `currentColor` — không hardcode màu icon |
| Stroke width | 1.75 (mặc định) — không dùng 2 (quá đậm) hay 1 (quá mảnh) |

**Mapping danh mục:**

| Danh mục | Icon Lucide |
|---|---|
| Ăn uống | `UtensilsCrossed` |
| Di chuyển | `Car` |
| Mua sắm | `ShoppingBag` |
| Giải trí | `Gamepad2` |
| Sức khỏe | `Heart` |
| Giáo dục | `BookOpen` |
| Lương | `Landmark` |
| Chuyển khoản | `ArrowLeftRight` |
| Tiết kiệm | `PiggyBank` |
| Khác | `MoreHorizontal` |

### 4e. Animation

**Nguyên tắc:** Animation chỉ xuất hiện khi có hành động của người dùng. Không tự động animate khi trang load (trừ số tiền — xem bên dưới).

| Trigger | Animation | Duration | Easing |
|---|---|---|---|
| Mở modal / bottom sheet | slide-up + fade-in | 220ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Đóng modal | slide-down + fade-out | 180ms | `ease-in` |
| Thêm giao dịch mới | item slide-in từ trên + fade | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Xóa giao dịch | slide-out sang phải + fade | 200ms | `ease-in` |
| Hover card | `translateY(-2px)` | 150ms | `ease-out` |
| Button click | scale `0.97` | 100ms | `ease-in-out` |
| Toggle Dark/Light | cross-fade toàn trang | 300ms | `ease-in-out` |
| Số dư cập nhật | count-up animation | 600ms | `ease-out` |
| Tab / menu active | underline slide | 200ms | `ease-out` |

```css
/* Tắt animation khi người dùng yêu cầu */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. COMPONENT PATTERNS

### Button

```
Primary:   bg=accent, text=white, hover: brightness(1.08)
Secondary: bg=surface, border=border, text=primary, hover: bg=border
Danger:    bg=expense/10, text=expense, hover: bg=expense/20
Ghost:     no bg, no border, text=secondary, hover: bg=border/50
```

### Input

```
height: 44px · radius: radius-sm · border: 1px border · padding: 0 12px
focus: border=accent + shadow-focus
placeholder: text-secondary/60
```

### Card giao dịch

```
surface · radius-md · padding: 12px 16px · shadow-sm
hover: shadow-md + translateY(-2px)
Layout: [icon-category] [name + date] [amount]
```

---

## 6. WIREFRAME ASCII

### 6a. Dashboard — Desktop (1280px+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                                      │
│  ◈ Vàng        [Tổng quan] [Giao dịch] [Ngân sách] [Báo cáo]    [👤] [🌙] │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   SIDEBAR (240px)          │   MAIN CONTENT                                  │
│   ─────────────────        │   ─────────────────────────────────────────    │
│                            │                                                 │
│   ◈ Vàng                   │   ╔══════════════════════════════════════╗      │
│                            │   ║  HERO CARD — Số dư hiện tại         ║      │
│   [Tổng quan     ←]        │   ║                                      ║      │
│   [Giao dịch      ]        │   ║   Số dư                              ║      │
│   [Ngân sách      ]        │   ║   ┌────────────────────────┐         ║      │
│   [Báo cáo        ]        │   ║   │  12.450.000 ₫          │         ║      │
│   [Mục tiêu       ]        │   ║   │  (display 48px, vàng)  │         ║      │
│                            │   ║   └────────────────────────┘         ║      │
│   ───────────────          │   ║                                      ║      │
│                            │   ║   [↑ Thu: 18.000.000]  [↓ Chi: 5.5M]║      │
│   VÍ CỦA TÔI               │   ╚══════════════════════════════════════╝      │
│   ┌─────────────┐          │                                                 │
│   │ 💳 Tiền mặt │          │   ┌─────────────────┐  ┌───────────────────┐   │
│   │  3.200.000  │          │   │  CHI TIÊU THÁNG  │  │  NGÂN SÁCH        │   │
│   └─────────────┘          │   │  ─────────────── │  │  ─────────────── │   │
│   ┌─────────────┐          │   │  [Bar Chart]     │  │  Ăn uống ████░░  │   │
│   │ 🏦 Ngân hàng│          │   │                  │  │  2.1/3.0 tr      │   │
│   │  9.250.000  │          │   │  Tháng 11/2026   │  │                   │   │
│   └─────────────┘          │   │  So với tháng    │  │  Di chuyển ██░░░ │   │
│                            │   │  trước: ▼ 12%    │  │  480k/1.0 tr     │   │
│   [+ Thêm ví]              │   └─────────────────┘  └───────────────────┘   │
│                            │                                                 │
│   ───────────────          │   GIAO DỊCH GẦN ĐÂY              [Xem tất cả→] │
│                            │   ──────────────────────────────────────────    │
│   [🌙 Dark mode]           │   ┌──────────────────────────────────────────┐  │
│   [⚙ Cài đặt   ]           │   │ 🛒  Siêu thị Vinmart    Hôm nay  -85.000│  │
│                            │   │ 🍜  Bún bò Huế          Hôm nay  -35.000│  │
│                            │   │ 🏦  Lương tháng 11      20/11  +18.000.000│ │
│                            │   │ 🚌  Grab                Hôm qua  -45.000│  │
│                            │   │ ☕  Highlands Coffee    Hôm qua  -55.000│  │
│                            │   └──────────────────────────────────────────┘  │
│                            │                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6b. Dashboard — Mobile (375px)

```
┌─────────────────────┐
│ ≡  Vàng         🔔 🌙│  ← Top bar
├─────────────────────┤
│                     │
│  Xin chào, An 👋    │
│  Thứ Sáu, 20/11     │
│                     │
│ ╔═══════════════╗   │
│ ║ Số dư         ║   │
│ ║               ║   │
│ ║ 12.450.000 ₫  ║   │  ← Hero number (display)
│ ║               ║   │
│ ║ ↑ 18.0tr  ↓ 5.5tr║ │
│ ╚═══════════════╝   │
│                     │
│ ┌───┐ ┌───┐ ┌───┐  │
│ │ + │ │ - │ │ ⇄ │  │  ← Quick actions
│ │Thu│ │Chi│ │CK │  │
│ └───┘ └───┘ └───┘  │
│                     │
│ CHI TIÊU THÁNG NÀY  │
│ ┌─────────────────┐ │
│ │ [Donut Chart]   │ │
│ │   5.550.000     │ │
│ └─────────────────┘ │
│                     │
│ GIAO DỊCH GẦN ĐÂY   │
│ ─────────────────── │
│ ┌─────────────────┐ │
│ │🛒 Vinmart  -85k │ │
│ │   Hôm nay       │ │
│ ├─────────────────┤ │
│ │🍜 Bún bò   -35k │ │
│ │   Hôm nay       │ │
│ ├─────────────────┤ │
│ │🏦 Lương   +18tr │ │
│ │   20/11/2026    │ │
│ └─────────────────┘ │
│      [Xem thêm]     │
│                     │
├─────────────────────┤
│  🏠    📋    📊   👤 │  ← Bottom nav
│ Tổng  Giao  Báo  Tôi│
│       dịch  cáo     │
└─────────────────────┘
```

---

## 7. GRID & LAYOUT

| Breakpoint | Width | Columns | Gutter |
|---|---|---|---|
| Mobile | < 768px | 4 | 16px |
| Tablet | 768–1024px | 8 | 24px |
| Desktop | 1024–1280px | 12 | 24px |
| Wide | > 1280px | 12 | 32px |

**Desktop layout:** Sidebar cố định 240px bên trái + main content fluid.  
**Mobile layout:** Bottom navigation 4 tab + header sticky.

---

## 8. NGUYÊN TẮC UX

1. **Zero state đẹp:** Khi chưa có giao dịch, hiển thị illustration đơn giản + CTA rõ ràng.
2. **Destructive action cần confirm:** Xóa giao dịch → bottom sheet confirm, không dùng browser `alert()`.
3. **Số tiền luôn có đơn vị:** Hiển thị `₫` hoặc `đ` nhất quán, chọn một và dùng xuyên suốt.
4. **Feedback tức thì:** Sau khi thêm giao dịch, số dư cập nhật với count-up animation ngay lập tức.
5. **Offline-first feeling:** Sử dụng `localStorage` để data không mất khi refresh (MVP phase).
6. **Accessibility:** Tất cả interactive elements có `:focus-visible` với `shadow-focus` vàng.
