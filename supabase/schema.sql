-- ============================================================================
-- Vàng Finance App — Supabase Postgres Schema + RLS + Default Seed Trigger
-- Chạy toàn bộ file này trong Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- 1.1. Wallets (Ví tiền)
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric(15, 0) not null default 0,
  initial_balance numeric(15, 0) not null default 0,
  icon text not null default 'Wallet',
  color text not null default '#C8A44A',
  is_locked boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

-- 1.2. Categories (Danh mục thu/chi)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text not null default 'MoreHorizontal',
  type text not null check (type in ('income', 'expense', 'both')),
  color text not null default '#8A8780',
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- 1.3. Transactions (Giao dịch thu / chi / chuyển ví)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(15, 0) not null check (amount > 0),
  category_id text not null default 'other',
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  to_wallet_id uuid references public.wallets(id) on delete set null,
  note text not null default '',
  receipt_url text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 1.4. Budgets (Ngân sách theo danh mục & tháng)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  limit_amount numeric(15, 0) not null check (limit_amount > 0),
  month text not null, -- định dạng 'YYYY-MM'
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

-- 1.5. Recurring Bills (Hóa đơn định kỳ)
create table if not exists public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(15, 0) not null check (amount > 0),
  category_id text not null default 'utilities',
  due_day integer not null check (due_day between 1 and 31),
  wallet_id uuid references public.wallets(id) on delete set null,
  paid_months text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

-- 1.6. Saving Goals (Mục tiêu tiết kiệm)
create table if not exists public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target numeric(15, 0) not null check (target > 0),
  saved numeric(15, 0) not null default 0 check (saved >= 0),
  deadline date,
  color text not null default '#C8A44A',
  icon text not null default 'Target',
  contributions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 1.7. Split Bills (Hóa đơn chia nhóm)
create table if not exists public.split_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date timestamptz not null default now(),
  payer text not null,
  members text[] not null default '{}',
  mode text not null check (mode in ('equal', 'itemized')),
  total numeric(15, 0) not null default 0,
  items jsonb not null default '[]'::jsonb,
  shared_fee numeric(15, 0) not null default 0,
  shares jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 1.8. Debts (Sổ nợ)
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null,
  amount numeric(15, 0) not null check (amount > 0),
  direction text not null check (direction in ('they_owe', 'i_owe')),
  note text not null default '',
  date timestamptz not null default now(),
  due_date date,
  settled boolean not null default false,
  settled_at timestamptz,
  split_id uuid references public.split_bills(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES (tăng tốc truy vấn theo user_id & ngày)
-- ============================================================================

create index if not exists idx_wallets_user on public.wallets(user_id);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_budgets_user_month on public.budgets(user_id, month);
create index if not exists idx_bills_user on public.recurring_bills(user_id);
create index if not exists idx_goals_user on public.saving_goals(user_id);
create index if not exists idx_debts_user on public.debts(user_id);
create index if not exists idx_splits_user on public.split_bills(user_id);

-- Cấp quyền truy cập schema public cho role authenticated (vẫn chịu sự bảo vệ chặt của RLS)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) — BẮT BUỘC CHO MỌI BẢNG
-- ============================================================================

alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.saving_goals enable row level security;
alter table public.debts enable row level security;
alter table public.split_bills enable row level security;

-- Policy: mỗi user chỉ được SELECT/INSERT/UPDATE/DELETE dữ liệu của chính mình
drop policy if exists "wallets_owner_all" on public.wallets;
create policy "wallets_owner_all" on public.wallets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories_owner_all" on public.categories;
create policy "categories_owner_all" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_owner_all" on public.transactions;
create policy "transactions_owner_all" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budgets_owner_all" on public.budgets;
create policy "budgets_owner_all" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_bills_owner_all" on public.recurring_bills;
create policy "recurring_bills_owner_all" on public.recurring_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saving_goals_owner_all" on public.saving_goals;
create policy "saving_goals_owner_all" on public.saving_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "debts_owner_all" on public.debts;
create policy "debts_owner_all" on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "split_bills_owner_all" on public.split_bills;
create policy "split_bills_owner_all" on public.split_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- 4. TRIGGER TẠO VÍ & DANH MỤC MẶC ĐỊNH KHI CÓ USER MỚI
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Tạo 3 ví mặc định cho sinh viên mới đăng ký
  insert into public.wallets (user_id, name, balance, initial_balance, icon, color, is_locked, note)
  values
    (new.id, 'Tiền mặt', 0, 0, 'Wallet', '#C8A44A', false, 'Tiền mặt chi tiêu hàng ngày'),
    (new.id, 'Ngân hàng', 0, 0, 'CreditCard', '#2D7D5F', false, 'Tài khoản nhận tiền gia đình / lương'),
    (new.id, 'Ống heo tiết kiệm', 0, 0, 'PiggyBank', '#8B6F4A', true, 'Tiền tiết kiệm đã khóa');

  -- Tạo bộ danh mục tiếng Việt mặc định
  insert into public.categories (user_id, slug, name, icon, type, color)
  values
    (new.id, 'food', 'Ăn uống', 'UtensilsCrossed', 'expense', '#E05C4B'),
    (new.id, 'transport', 'Di chuyển', 'Car', 'expense', '#C8A44A'),
    (new.id, 'shopping', 'Mua sắm', 'ShoppingBag', 'expense', '#7C6FCD'),
    (new.id, 'entertainment', 'Giải trí', 'Gamepad2', 'expense', '#4A90D9'),
    (new.id, 'health', 'Sức khỏe', 'Heart', 'expense', '#E5748E'),
    (new.id, 'education', 'Học tập', 'BookOpen', 'expense', '#5DAA84'),
    (new.id, 'rent', 'Tiền trọ', 'Building2', 'expense', '#8B6F4A'),
    (new.id, 'utilities', 'Điện nước', 'Zap', 'expense', '#6B6860'),
    (new.id, 'internet', 'Mạng Internet', 'Wifi', 'expense', '#3B82F6'),
    (new.id, 'salary', 'Lương', 'Landmark', 'income', '#2D7D5F'),
    (new.id, 'family', 'Gia đình gửi', 'Home', 'income', '#4DAA84'),
    (new.id, 'freelance', 'Làm thêm', 'Briefcase', 'income', '#6BB89E'),
    (new.id, 'savings', 'Tiết kiệm / Chuyển khoản', 'PiggyBank', 'both', '#C8A44A'),
    (new.id, 'other', 'Khác', 'MoreHorizontal', 'both', '#8A8780');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. SUPABASE STORAGE BUCKET 'receipts' (riêng tư, RLS theo user_id)
-- Chỉ dùng khi người dùng chủ động bật "Đính kèm ảnh vào giao dịch"
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_select_own" on storage.objects;
create policy "receipts_select_own" on storage.objects
  for select using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_insert_own" on storage.objects;
create policy "receipts_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_delete_own" on storage.objects
  for delete using (
    bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 6. RPC XÓA TÀI KHOẢN & TOÀN BỘ DỮ LIỆU CỦA CHÍNH USER ĐANG ĐĂNG NHẬP
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  -- Xóa toàn bộ ảnh hóa đơn đính kèm trong Storage (nếu có)
  delete from storage.objects
  where bucket_id = 'receipts'
    and (storage.foldername(name))[1] = uid::text;

  -- Xóa user khỏi auth.users -> ON DELETE CASCADE tự dọn toàn bộ 8 bảng dữ liệu
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
