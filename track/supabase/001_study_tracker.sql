begin;

create table public.track_tags (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  name text not null check (length(trim(name)) between 1 and 40),
  emoji text not null check (length(emoji) between 1 and 32),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  primary key (owner_id, id)
);
create unique index track_tag_names on public.track_tags (owner_id, lower(trim(name)));

-- Times are UTC epoch milliseconds. Gaps between intervals are pauses.
create function public.track_valid_intervals(parts jsonb, first_ms bigint, end_ms bigint)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  part jsonb;
  prior_end bigint;
  start_ms bigint;
  stop_ms bigint;
  pos int := 0;
begin
  if jsonb_typeof(parts) <> 'array' or jsonb_array_length(parts) = 0 then return false; end if;
  for part in select value from jsonb_array_elements(parts) loop
    pos := pos + 1;
    if jsonb_typeof(part->'start') is distinct from 'number' or not (part ? 'end')
      or jsonb_typeof(part->'end') not in ('number','null') then return false; end if;
    start_ms := (part->>'start')::bigint;
    stop_ms := (part->>'end')::bigint;
    if (pos = 1 and start_ms <> first_ms) or start_ms < prior_end or stop_ms < start_ms
      or (stop_ms is null and (pos <> jsonb_array_length(parts) or end_ms is not null))
      or stop_ms > end_ms then return false; end if;
    prior_end := stop_ms;
  end loop;
  return true;
end $$;

create table public.track_sessions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  tag_id uuid not null,
  started_at bigint not null,
  ended_at bigint check (ended_at >= started_at),
  timezone text not null,
  intervals jsonb not null,
  rating smallint check (rating is null or (rating between 1 and 5 and ended_at is not null)),
  revision integer not null default 0 check (revision >= 0),
  primary key (owner_id, id),
  foreign key (owner_id, tag_id) references public.track_tags(owner_id, id),
  check (public.track_valid_intervals(intervals, started_at, ended_at))
);
create unique index track_one_open_session on public.track_sessions(owner_id) where ended_at is null;
create index track_chronology on public.track_sessions(owner_id, started_at);

alter table public.track_tags enable row level security;
alter table public.track_sessions enable row level security;
revoke all on public.track_tags, public.track_sessions from public, anon, authenticated;
grant select, insert on public.track_tags to authenticated;
grant select, insert on public.track_sessions to authenticated;
grant update (ended_at, intervals, rating, revision) on public.track_sessions to authenticated;
create policy track_own_tags on public.track_tags to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy track_own_sessions on public.track_sessions to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

commit;
