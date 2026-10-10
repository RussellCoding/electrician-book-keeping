-- Agent drafts and approvals.
--
-- "The agent drafts, the human approves" as a record rather than a UI rule.
-- The server's agent tools insert drafts with status 'proposed'. A user
-- approves or rejects one through an RPC, and approving applies the change in
-- the same transaction (status 'applied', or 'failed' with the error). Drafts
-- are never deleted or edited after the fact: they are the audit trail of what
-- the agent suggested and who decided.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type agent_draft_kind as enum ('estimate', 'message', 'schedule-change', 'materials-list', 'invoice');
create type agent_draft_status as enum ('proposed', 'approved', 'rejected', 'applied', 'failed');

-- ---------------------------------------------------------------------------
-- Drafts
-- ---------------------------------------------------------------------------

-- Lets agent_drafts (and later tables) require that their job is in the same shop.
alter table jobs add constraint jobs_id_shop_id_key unique (id, shop_id);

create table agent_drafts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  kind agent_draft_kind not null,
  status agent_draft_status not null default 'proposed',
  -- The exact thing that will happen if approved. Shape depends on kind; the
  -- server validates it with a per-kind zod schema. For kind 'estimate':
  --   {
  --     "title": text,
  --     "description": text | null,
  --     "valid_until": "YYYY-MM-DD" | null,
  --     "tax_rate": number | null,          -- null: use the shop's rate
  --     "items": [{"kind": "material|labor|permit|other", "description": text,
  --                "quantity": number, "unit_price": number}],
  --     "missing": [{"description": text, "reason": text}],
  --     "labor_hours": number | null
  --   }
  -- "missing" lists things that couldn't be priced. They are shown to the user
  -- but not turned into line items.
  payload jsonb not null,
  -- One plain line for the list.
  summary text not null,
  -- Why the agent suggests it and which records it used.
  reason text,
  -- What the draft is about (or, for estimate_id, what applying it created).
  -- invoice_id gets added with the invoices table.
  customer_id uuid,
  job_id uuid,
  estimate_id uuid,
  -- No on delete action: a user who requested or decided drafts can't be
  -- deleted while the drafts exist (they are the audit trail).
  requested_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  applied_at timestamptz,
  -- Created ids on success, {"error": ...} on failure.
  result jsonb,
  check (status = 'proposed' or (decided_by is not null and decided_at is not null)),
  foreign key (customer_id, shop_id) references customers(id, shop_id) on delete set null (customer_id),
  foreign key (job_id, shop_id) references jobs(id, shop_id) on delete set null (job_id),
  foreign key (estimate_id, shop_id) references estimates(id, shop_id) on delete set null (estimate_id)
);

create index agent_drafts_shop_id_status_created_at_idx on agent_drafts(shop_id, status, created_at desc);

-- Keeps drafts honest even though members have an update policy (the RPCs run
-- as the caller, so they need one). What the agent proposed never changes,
-- status only moves forward, only the signed-in user can be the decider, and
-- status changes only happen inside approve_agent_draft / reject_agent_draft.
--
-- That last rule uses a transaction-local setting, electrocrm.agent_draft_rpc,
-- which the RPCs turn on around their own updates and off again before they
-- return. Without it, a member could update status directly through
-- supabase-js (proposed -> approved -> applied) and skip the apply step.
-- Clients can't turn it on: PostgREST doesn't expose set_config, and a plain
-- update can't run it.
create function agent_drafts_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.shop_id is distinct from old.shop_id
    or new.kind is distinct from old.kind
    or new.payload is distinct from old.payload
    or new.summary is distinct from old.summary
    or new.reason is distinct from old.reason
    or new.requested_by is distinct from old.requested_by
    or new.created_at is distinct from old.created_at then
    raise exception 'agent drafts can''t be edited; reject it and make a new one';
  end if;

  -- Subject links can be filled in, or cleared when the linked record is
  -- deleted (on delete set null), but never repointed.
  if (new.customer_id is distinct from old.customer_id and old.customer_id is not null and new.customer_id is not null)
    or (new.job_id is distinct from old.job_id and old.job_id is not null and new.job_id is not null)
    or (new.estimate_id is distinct from old.estimate_id and old.estimate_id is not null and new.estimate_id is not null) then
    raise exception 'an agent draft''s customer, job or estimate can''t be changed once set';
  end if;

  if new.status = old.status then
    -- The only same-status update allowed is a link being cleared because the
    -- linked record was deleted.
    if new.decided_by is distinct from old.decided_by
      or new.decided_at is distinct from old.decided_at
      or new.applied_at is distinct from old.applied_at
      or new.result is distinct from old.result
      or (new.customer_id is distinct from old.customer_id and new.customer_id is not null)
      or (new.job_id is distinct from old.job_id and new.job_id is not null)
      or (new.estimate_id is distinct from old.estimate_id and new.estimate_id is not null) then
      raise exception 'agent draft is already %', old.status;
    end if;
    return new;
  end if;

  if coalesce(current_setting('electrocrm.agent_draft_rpc', true), '') <> 'on' then
    raise exception 'agent drafts are approved or rejected through approve_agent_draft / reject_agent_draft';
  end if;

  if old.status = 'proposed' and new.status in ('approved', 'rejected') then
    if new.decided_by is null or new.decided_by is distinct from auth.uid() then
      raise exception 'decided_by must be the signed-in user';
    end if;
    if new.decided_at is null then
      raise exception 'decided_at is required';
    end if;
    if new.applied_at is not null or new.result is not null then
      raise exception 'a draft can''t be applied in the same step it is decided';
    end if;
  elsif old.status = 'approved' and new.status in ('applied', 'failed') then
    if new.decided_by is distinct from old.decided_by or new.decided_at is distinct from old.decided_at then
      raise exception 'who decided an agent draft can''t be changed';
    end if;
  else
    raise exception 'agent draft can''t go from % to %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger agent_drafts_guard_update
  before update on agent_drafts
  for each row execute function agent_drafts_guard_update();

-- ---------------------------------------------------------------------------
-- Approve / reject. Both run as the caller (security invoker), so RLS applies.
-- ---------------------------------------------------------------------------

create function reject_agent_draft(p_draft_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_draft public.agent_drafts;
begin
  select * into v_draft from public.agent_drafts where id = p_draft_id for update;
  if not found then
    raise exception 'agent draft not found';
  end if;
  if v_draft.status <> 'proposed' then
    raise exception 'only proposed drafts can be rejected (status is %)', v_draft.status;
  end if;

  -- Lets agent_drafts_guard_update allow the status change (see there).
  perform set_config('electrocrm.agent_draft_rpc', 'on', true);
  update public.agent_drafts
    set status = 'rejected', decided_by = auth.uid(), decided_at = now()
    where id = p_draft_id;
  -- Off again so later statements in the same transaction don't inherit it.
  perform set_config('electrocrm.agent_draft_rpc', '', true);
end;
$$;

-- Approves a draft and applies it. If applying fails, the approval is kept
-- and the draft ends as 'failed' with the error in result, so the user sees
-- what went wrong instead of the click silently doing nothing.
-- p_customer_id supplies the customer when the agent drafted an estimate
-- without one.
create function approve_agent_draft(p_draft_id uuid, p_customer_id uuid default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_draft public.agent_drafts;
  v_customer_id uuid;
  v_estimate_id uuid;
  v_result jsonb;
begin
  select * into v_draft from public.agent_drafts where id = p_draft_id for update;
  if not found then
    raise exception 'agent draft not found';
  end if;
  if v_draft.status <> 'proposed' then
    raise exception 'only proposed drafts can be approved (status is %)', v_draft.status;
  end if;
  if v_draft.kind <> 'estimate' then
    raise exception 'drafts of kind % can''t be applied yet', v_draft.kind;
  end if;

  if v_draft.customer_id is not null and p_customer_id is not null
    and p_customer_id <> v_draft.customer_id then
    raise exception 'this draft is already for a different customer';
  end if;
  v_customer_id := coalesce(v_draft.customer_id, p_customer_id);
  if v_customer_id is null then
    raise exception 'pick a customer for this estimate';
  end if;

  -- Lets agent_drafts_guard_update allow the status changes (see there).
  perform set_config('electrocrm.agent_draft_rpc', 'on', true);
  update public.agent_drafts
    set status = 'approved', decided_by = auth.uid(), decided_at = now(),
        customer_id = v_customer_id
    where id = p_draft_id;

  -- Apply. The block is a savepoint: an error undoes only the partial apply,
  -- and the approval above stays.
  begin
    if jsonb_typeof(v_draft.payload->'items') is distinct from 'array'
      or jsonb_array_length(v_draft.payload->'items') = 0 then
      raise exception 'estimate draft has no line items';
    end if;

    insert into public.estimates (shop_id, customer_id, title, description, status, tax_rate, valid_until)
    values (
      v_draft.shop_id,
      v_customer_id,
      v_draft.payload->>'title',
      v_draft.payload->>'description',
      'draft',
      -- null lets estimates_default_tax_rate copy the shop's rate.
      (v_draft.payload->>'tax_rate')::numeric,
      (v_draft.payload->>'valid_until')::date
    )
    returning id into v_estimate_id;

    insert into public.estimate_items (shop_id, estimate_id, kind, description, quantity, unit_price, position)
    select
      v_draft.shop_id,
      v_estimate_id,
      (item->>'kind')::public.line_item_kind,
      item->>'description',
      (item->>'quantity')::numeric,
      (item->>'unit_price')::numeric,
      (ord - 1)::integer
    from jsonb_array_elements(v_draft.payload->'items') with ordinality as t(item, ord);

    v_result := jsonb_build_object('estimate_id', v_estimate_id);
    update public.agent_drafts
      set status = 'applied', applied_at = now(), estimate_id = v_estimate_id, result = v_result
      where id = p_draft_id;
  exception when others then
    v_result := jsonb_build_object('error', sqlerrm);
    update public.agent_drafts
      set status = 'failed', result = v_result
      where id = p_draft_id;
  end;

  -- Off again so later statements in the same transaction don't inherit it.
  perform set_config('electrocrm.agent_draft_rpc', '', true);
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table agent_drafts enable row level security;

create policy "members read agent drafts" on agent_drafts
  for select using (is_shop_member(shop_id));
-- New drafts start undecided and are attributed to whoever is signed in.
create policy "members propose agent drafts" on agent_drafts
  for insert with check (
    is_shop_member(shop_id)
    and status = 'proposed'
    and decided_by is null
    and decided_at is null
    and applied_at is null
    and result is null
    and requested_by = auth.uid()
  );
-- Needed because the RPCs run as the caller. agent_drafts_guard_update limits
-- what an update can change.
create policy "members decide agent drafts" on agent_drafts
  for update using (is_shop_member(shop_id)) with check (is_shop_member(shop_id));
-- No delete policy: drafts are the audit trail. They go away only with their shop.

-- Only signed-in users can call the RPCs.
revoke execute on function reject_agent_draft(uuid) from public, anon;
revoke execute on function approve_agent_draft(uuid, uuid) from public, anon;
grant execute on function reject_agent_draft(uuid) to authenticated;
grant execute on function approve_agent_draft(uuid, uuid) to authenticated;
