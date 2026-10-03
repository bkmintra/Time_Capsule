-- Run this entire script once in Supabase SQL Editor.
create table if not exists public.capsules(id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,title text not null check(char_length(title) between 2 and 80),created_at timestamptz not null default now(),opens_at timestamptz not null,opened_at timestamptz);
create table if not exists public.capsule_contents(capsule_id uuid primary key references public.capsules(id) on delete cascade,message text not null);
create table if not exists public.capsule_secrets(capsule_id uuid primary key references public.capsules(id) on delete cascade,password_hash text not null);
create table if not exists public.reflections(capsule_id uuid primary key references public.capsules(id) on delete cascade,body text not null,updated_at timestamptz not null default now());
create table if not exists public.attempts(key text primary key,count integer not null,reset_at timestamptz not null);
alter table public.capsules enable row level security;
alter table public.capsule_contents enable row level security;
alter table public.capsule_secrets enable row level security;
alter table public.reflections enable row level security;
alter table public.attempts enable row level security;
drop policy if exists own_capsules on public.capsules;
create policy own_capsules on public.capsules for select to authenticated using(auth.uid()=owner_id);
-- Private data has no browser policy. Server actions authenticate ownership before using service_role.
revoke all on public.capsule_contents,public.capsule_secrets,public.reflections,public.attempts from anon,authenticated;
revoke insert,update,delete on public.capsules from anon,authenticated;
grant select on public.capsules to authenticated;
grant all on public.capsules,public.capsule_contents,public.capsule_secrets,public.reflections,public.attempts to service_role;
create index if not exists capsules_owner_created on public.capsules(owner_id,created_at desc);
create or replace function public.create_capsule(p_id uuid,p_owner uuid,p_title text,p_opens timestamptz,p_message text,p_hash text) returns void language plpgsql security definer set search_path=public as $$
begin
 if p_opens<=now() then raise exception 'Open date must be in the future'; end if;
 insert into capsules(id,owner_id,title,opens_at) values(p_id,p_owner,p_title,p_opens);
 insert into capsule_contents values(p_id,p_message);
 insert into capsule_secrets values(p_id,p_hash);
end;$$;
create or replace function public.reserve_attempt(p_key text,p_limit integer default 5) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into attempts(key,count,reset_at) values(p_key,1,now()+interval '15 minutes')
 on conflict(key) do update set count=case when attempts.reset_at<=now() then 1 else attempts.count+1 end,reset_at=case when attempts.reset_at<=now() then now()+interval '15 minutes' else attempts.reset_at end
 where attempts.reset_at<=now() or attempts.count<p_limit returning count into n;
 return n is not null;
end;$$;
revoke all on function public.create_capsule(uuid,uuid,text,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.reserve_attempt(text,integer) from public,anon,authenticated;
grant execute on function public.create_capsule(uuid,uuid,text,timestamptz,text,text) to service_role;
grant execute on function public.reserve_attempt(text,integer) to service_role;

-- Email upgrade: rerun this section for existing installations.
create table if not exists public.email_challenges(capsule_id uuid references public.capsules(id) on delete cascade,purpose text not null check(purpose in ('reset','notify')),owner_id uuid not null references auth.users(id),code_hash text not null,expires_at bigint not null,primary key(capsule_id,purpose));
create table if not exists public.email_notices(capsule_id uuid primary key references public.capsules(id) on delete cascade,email text not null,sent integer not null default 0);
alter table public.email_challenges enable row level security;
alter table public.email_notices enable row level security;
revoke all on public.email_challenges,public.email_notices from public,anon,authenticated;
grant all on public.email_challenges,public.email_notices to service_role;
create or replace function public.consume_email_code(p_owner uuid,p_id uuid,p_purpose text,p_digest text,p_hash text,p_email text) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if p_purpose not in ('reset','notify') then return false; end if;
 if not exists(select 1 from capsules where id=p_id and owner_id=p_owner) then return false; end if;
 if p_purpose='reset' and p_hash is null then return false; end if;
 delete from email_challenges where capsule_id=p_id and purpose=p_purpose and owner_id=p_owner and code_hash=p_digest and expires_at>(extract(epoch from now())*1000)::bigint;
 get diagnostics n=row_count;
 if n<>1 then return false; end if;
 if p_purpose='reset' then update capsule_secrets set password_hash=p_hash where capsule_id=p_id;
 else insert into email_notices(capsule_id,email) values(p_id,p_email) on conflict(capsule_id) do update set email=excluded.email; end if;
 return true;
end;$$;
revoke all on function public.consume_email_code(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.consume_email_code(uuid,uuid,text,text,text,text) to service_role;
