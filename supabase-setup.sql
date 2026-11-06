-- Run this in the Supabase SQL Editor after creating your admin user:
-- Authentication > Users > Add user.
-- Replace YOUR_SUPABASE_LOGIN_EMAIL below with that user's email first.

create table if not exists public.site_admins (
    user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.site_admins enable row level security;
revoke all on public.site_admins from public, anon, authenticated;
grant select on public.site_admins to authenticated;

drop policy if exists "Admins can view their own admin record" on public.site_admins;
create policy "Admins can view their own admin record"
on public.site_admins
for select
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.available_kittens (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text not null default '',
    status text not null default 'available'
        check (status in ('available', 'reserved', 'adopted')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.available_kittens enable row level security;
revoke all on public.available_kittens from public, anon, authenticated;
grant select on public.available_kittens to anon, authenticated;
grant insert, update, delete on public.available_kittens to authenticated;

drop policy if exists "Anyone can view available kittens" on public.available_kittens;
create policy "Anyone can view available kittens"
on public.available_kittens
for select
to anon, authenticated
using (true);

drop policy if exists "Site admins can manage available kittens" on public.available_kittens;
create policy "Site admins can manage available kittens"
on public.available_kittens
for all
to authenticated
using (
    exists (
        select 1 from public.site_admins
        where user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1 from public.site_admins
        where user_id = (select auth.uid())
    )
);

create table if not exists public.notes (
    id uuid primary key default gen_random_uuid(),
    title text not null default 'Untitled',
    content text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;
revoke all on public.notes from public, anon, authenticated;
grant select, insert, update, delete on public.notes to authenticated;

-- Remove the unrestricted anonymous notes policy from the earlier setup.
drop policy if exists "Public notebook access" on public.notes;
drop policy if exists "Site admins can manage notes" on public.notes;
create policy "Site admins can manage notes"
on public.notes
for all
to authenticated
using (
    exists (
        select 1 from public.site_admins
        where user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1 from public.site_admins
        where user_id = (select auth.uid())
    )
);

-- Website photos are intended to be public. This allows visitors to list and
-- view objects in this bucket; it does not allow uploads or deletion.
update storage.buckets
set public = true
where id = 'Ragdoll Pics';

drop policy if exists "Public list access for Ragdoll Pics" on storage.objects;
drop policy if exists "Public photo read access for Ragdoll Pics" on storage.objects;
create policy "Public photo read access for Ragdoll Pics"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'Ragdoll Pics');

do $$
declare
    admin_user_id uuid;
begin
    select id into admin_user_id
    from auth.users
    where lower(email) = lower('YOUR_SUPABASE_LOGIN_EMAIL')
    limit 1;

    if admin_user_id is null then
        raise exception 'Replace YOUR_SUPABASE_LOGIN_EMAIL with an existing Supabase Auth user email, then run this script again.';
    end if;

    insert into public.site_admins (user_id)
    values (admin_user_id)
    on conflict (user_id) do nothing;
end;
$$;
