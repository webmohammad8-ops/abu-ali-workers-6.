-- ============================================================
-- نظام حسابات المقاولين — شغّل هذا الملف كاملًا في Supabase:
-- Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) الجداول -------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.workers (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  name           text not null,
  sukneh_number  text,
  group_type     text not null default 'عامل'
                 check (group_type in ('طوبار','حداد','طراش','عامل')),
  created_at     timestamptz not null default now()
);

create table if not exists public.daily_entries (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references public.workers(id) on delete cascade,
  date        date not null default current_date,
  daily_wage  numeric(12,2) not null default 0,
  food        numeric(12,2) not null default 0,
  smoke       numeric(12,2) not null default 0,
  advance     numeric(12,2) not null default 0,
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  image_url   text,
  notes       text,
  amount      numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists workers_project_idx  on public.workers(project_id);
create index if not exists entries_worker_idx   on public.daily_entries(worker_id, date);
create index if not exists invoices_project_idx on public.invoices(project_id, created_at desc);

-- 2) الصلاحيات (RLS) ----------------------------------------
-- تنبيه: السياسات التالية تسمح لأي شخص يملك مفتاح anon بالقراءة والكتابة.
-- هذا مقبول لأداة داخلية بدون تسجيل دخول، لكن لا تنشر الرابط علنًا.
-- للحماية الحقيقية فعّل Supabase Auth وغيّر "to anon" إلى "to authenticated".
alter table public.projects      enable row level security;
alter table public.workers       enable row level security;
alter table public.daily_entries enable row level security;
alter table public.invoices      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['projects','workers','daily_entries','invoices'] loop
    execute format('drop policy if exists "app_all_%1$s" on public.%1$I', t);
    execute format(
      'create policy "app_all_%1$s" on public.%1$I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 3) التخزين: bucket اسمه invoices (عام للقراءة) ------------
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do update set public = true;

drop policy if exists "invoices_read"   on storage.objects;
drop policy if exists "invoices_insert" on storage.objects;
drop policy if exists "invoices_delete" on storage.objects;

create policy "invoices_read"   on storage.objects for select to anon, authenticated using (bucket_id = 'invoices');
create policy "invoices_insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'invoices');
create policy "invoices_delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'invoices');

-- 4) Realtime ------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['projects','workers','daily_entries','invoices'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
