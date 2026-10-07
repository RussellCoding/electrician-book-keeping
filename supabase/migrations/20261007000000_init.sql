-- ElectroCRM initial schema.
--
-- Every business table carries shop_id, and row-level security limits each
-- signed-in user to the shops they belong to. Money is numeric(12,2); totals
-- are computed (see estimate_totals), never stored.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type customer_type as enum ('residential', 'commercial');
create type customer_status as enum ('active', 'inactive');
create type job_type as enum ('installation', 'repair', 'maintenance', 'inspection', 'upgrade');
create type job_status as enum ('scheduled', 'in-progress', 'completed', 'cancelled');
create type job_priority as enum ('low', 'medium', 'high', 'urgent');
create type estimate_status as enum ('draft', 'sent', 'approved', 'rejected');
create type line_item_kind as enum ('material', 'labor', 'permit', 'other');
create type shop_role as enum ('owner', 'tech');

-- ---------------------------------------------------------------------------
-- Shops and membership
-- ---------------------------------------------------------------------------

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Per-shop settings. tax_rate is a fraction (0.08 = 8%).
  tax_rate numeric(6,4) not null default 0 check (tax_rate >= 0 and tax_rate < 1),
  labor_rate numeric(10,2) check (labor_rate >= 0),
  -- IANA zone the shop works in; scheduling uses it to interpret local times.
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now()
);

create table shop_members (
  shop_id uuid not null references shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role shop_role not null default 'tech',
  display_name text,
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create index shop_members_user_id_idx on shop_members(user_id);

-- security definer so policies on shop_members can call it without recursing.
create function is_shop_member(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop_id and user_id = auth.uid()
  );
$$;

create function is_shop_owner(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members
    where shop_id = p_shop_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Onboarding: creates a shop and makes the caller its owner in one step.
create function create_shop(p_name text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  insert into public.shops (name) values (p_name) returning id into v_shop_id;
  insert into public.shop_members (shop_id, user_id, role, display_name)
    values (v_shop_id, auth.uid(), 'owner', p_display_name);
  return v_shop_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  type customer_type not null default 'residential',
  status customer_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  -- Lets child tables require that their customer is in the same shop.
  unique (id, shop_id)
);

create index customers_shop_id_idx on customers(shop_id);

-- ---------------------------------------------------------------------------
-- Estimates
-- ---------------------------------------------------------------------------

create table estimates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null,
  title text not null,
  description text,
  status estimate_status not null default 'draft',
  -- Copied from the shop when the estimate is created, so changing the shop
  -- rate later doesn't change estimates already given to customers.
  tax_rate numeric(6,4) not null check (tax_rate >= 0 and tax_rate < 1),
  valid_until date,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, shop_id),
  foreign key (customer_id, shop_id) references customers(id, shop_id) on delete cascade
);

create index estimates_shop_id_idx on estimates(shop_id);
create index estimates_customer_id_idx on estimates(customer_id);

-- Fill tax_rate from the shop when the caller doesn't supply one.
create function estimates_default_tax_rate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tax_rate is null then
    select tax_rate into new.tax_rate from public.shops where id = new.shop_id;
  end if;
  return new;
end;
$$;

create trigger estimates_default_tax_rate
  before insert on estimates
  for each row execute function estimates_default_tax_rate();

create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  estimate_id uuid not null,
  kind line_item_kind not null default 'material',
  description text not null,
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  position integer not null default 0,
  foreign key (estimate_id, shop_id) references estimates(id, shop_id) on delete cascade
);

create index estimate_items_estimate_id_idx on estimate_items(estimate_id);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------

create table jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null,
  estimate_id uuid unique,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  type job_type not null,
  status job_status not null default 'scheduled',
  priority job_priority not null default 'medium',
  scheduled_at timestamptz,
  completed_at timestamptz,
  estimated_hours numeric(6,2) check (estimated_hours >= 0),
  actual_hours numeric(6,2) check (actual_hours >= 0),
  -- Agreed price for the job (from the estimate total when converted).
  price numeric(12,2) check (price >= 0),
  -- Defaults to the customer's address but can differ (e.g. a rental unit).
  address text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (customer_id, shop_id) references customers(id, shop_id) on delete cascade,
  foreign key (estimate_id, shop_id) references estimates(id, shop_id) on delete set null (estimate_id)
);

create index jobs_shop_id_scheduled_at_idx on jobs(shop_id, scheduled_at);
create index jobs_customer_id_idx on jobs(customer_id);

-- ---------------------------------------------------------------------------
-- Derived views. security_invoker makes them obey the caller's RLS.
-- ---------------------------------------------------------------------------

create view estimate_totals
with (security_invoker = true)
as
select
  e.id as estimate_id,
  e.shop_id,
  coalesce(sum(round(i.quantity * i.unit_price, 2)), 0)::numeric(12,2) as subtotal,
  round(coalesce(sum(round(i.quantity * i.unit_price, 2)), 0) * e.tax_rate, 2)::numeric(12,2) as tax,
  (coalesce(sum(round(i.quantity * i.unit_price, 2)), 0)
    + round(coalesce(sum(round(i.quantity * i.unit_price, 2)), 0) * e.tax_rate, 2))::numeric(12,2) as total
from estimates e
left join estimate_items i on i.estimate_id = e.id
group by e.id;

create view customer_summaries
with (security_invoker = true)
as
select
  c.id as customer_id,
  c.shop_id,
  count(j.id) filter (where j.status <> 'cancelled')::integer as total_jobs,
  -- Revenue from completed jobs' agreed price. Switch to paid invoices once
  -- invoicing exists.
  coalesce(sum(j.price) filter (where j.status = 'completed'), 0)::numeric(12,2) as completed_revenue,
  max(j.completed_at) as last_job_completed_at
from customers c
left join jobs j on j.customer_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Estimate -> job conversion
-- ---------------------------------------------------------------------------

-- Runs as the caller (security invoker), so RLS still applies.
create function convert_estimate_to_job(
  p_estimate_id uuid,
  p_type job_type,
  p_scheduled_at timestamptz default null,
  p_estimated_hours numeric default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_estimate public.estimates;
  v_total numeric(12,2);
  v_address text;
  v_job_id uuid;
begin
  select * into v_estimate from public.estimates where id = p_estimate_id for update;
  if not found then
    raise exception 'estimate not found';
  end if;
  if v_estimate.status <> 'approved' then
    raise exception 'only approved estimates can be converted (status is %)', v_estimate.status;
  end if;
  if exists (select 1 from public.jobs where estimate_id = p_estimate_id) then
    raise exception 'estimate has already been converted to a job';
  end if;

  select total into v_total from public.estimate_totals where estimate_id = p_estimate_id;
  select address into v_address from public.customers where id = v_estimate.customer_id;

  insert into public.jobs (
    shop_id, customer_id, estimate_id, title, description, type,
    scheduled_at, estimated_hours, price, address
  ) values (
    v_estimate.shop_id, v_estimate.customer_id, v_estimate.id, v_estimate.title,
    v_estimate.description, p_type, p_scheduled_at, p_estimated_hours, v_total, v_address
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table shops enable row level security;
alter table shop_members enable row level security;
alter table customers enable row level security;
alter table estimates enable row level security;
alter table estimate_items enable row level security;
alter table jobs enable row level security;

-- Shops are created through create_shop(), so there is no insert policy.
create policy "members read their shop" on shops
  for select using (is_shop_member(id));
create policy "owners update their shop" on shops
  for update using (is_shop_owner(id)) with check (is_shop_owner(id));

create policy "members read shop roster" on shop_members
  for select using (is_shop_member(shop_id));
create policy "owners manage shop roster" on shop_members
  for all using (is_shop_owner(shop_id)) with check (is_shop_owner(shop_id));

create policy "members manage customers" on customers
  for all using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy "members manage estimates" on estimates
  for all using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy "members manage estimate items" on estimate_items
  for all using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
create policy "members manage jobs" on jobs
  for all using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));

-- Only signed-in users can call the RPCs.
revoke execute on function create_shop(text, text) from public, anon;
revoke execute on function convert_estimate_to_job(uuid, job_type, timestamptz, numeric) from public, anon;
grant execute on function create_shop(text, text) to authenticated;
grant execute on function convert_estimate_to_job(uuid, job_type, timestamptz, numeric) to authenticated;
