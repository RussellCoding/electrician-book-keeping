import { isUuid, supabase, unwrap, type Tables } from './supabase';
import type {
  AgentDraft,
  AgentDraftResult,
  AgentDraftStatus,
  EstimateDraftPayload,
  EstimateItemInput,
} from './types';
import { LINE_ITEM_KINDS } from './types';

type AgentDraftRow = Tables<'agent_drafts'> & { customers: { name: string } | null };

const DRAFT_SELECT = '*, customers(name)';

// payload and result are jsonb, so nothing guarantees their shape. Read them
// field by field and fall back to empty values rather than trusting a cast.
type JsonObject = Record<string, unknown>;

const asObject = (v: unknown): JsonObject | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as JsonObject) : null;
const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const asNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function toItem(value: unknown): EstimateItemInput | null {
  const o = asObject(value);
  if (!o) return null;
  const kind = LINE_ITEM_KINDS.find((k) => k === o.kind);
  const quantity = asNumber(o.quantity);
  const unitPrice = asNumber(o.unit_price);
  if (!kind || quantity === null || unitPrice === null) return null;
  return { kind, description: asString(o.description) ?? '', quantity, unitPrice };
}

function toEstimatePayload(value: unknown): EstimateDraftPayload {
  const o = asObject(value) ?? {};
  return {
    title: asString(o.title) ?? '',
    description: asString(o.description),
    validUntil: asString(o.valid_until),
    taxRate: asNumber(o.tax_rate),
    items: asArray(o.items)
      .map(toItem)
      .filter((i): i is EstimateItemInput => i !== null),
    missing: asArray(o.missing).flatMap((m) => {
      const mo = asObject(m);
      return mo ? [{ description: asString(mo.description) ?? '', reason: asString(mo.reason) ?? '' }] : [];
    }),
    laborHours: asNumber(o.labor_hours),
  };
}

function toResult(value: unknown): AgentDraftResult | null {
  const o = asObject(value);
  if (!o) return null;
  const error = asString(o.error);
  if (error !== null) return { error };
  const estimateId = asString(o.estimate_id);
  return estimateId !== null ? { estimateId } : null;
}

function toDraft(row: AgentDraftRow): AgentDraft {
  const base = {
    id: row.id,
    status: row.status,
    summary: row.summary,
    reason: row.reason ?? '',
    customerId: row.customer_id,
    customerName: row.customers?.name ?? '',
    jobId: row.job_id,
    estimateId: row.estimate_id,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    appliedAt: row.applied_at,
    result: toResult(row.result),
  };
  return row.kind === 'estimate'
    ? { ...base, kind: 'estimate', payload: toEstimatePayload(row.payload) }
    : { ...base, kind: row.kind, payload: row.payload };
}

/** Drafts the agent made in this shop, newest first, optionally only one status. */
export async function listAgentDrafts(
  shopId: string,
  filter: { status?: AgentDraftStatus } = {},
): Promise<AgentDraft[]> {
  let query = supabase.from('agent_drafts').select(DRAFT_SELECT).eq('shop_id', shopId);
  if (filter.status !== undefined) query = query.eq('status', filter.status);
  const rows = unwrap(await query.order('created_at', { ascending: false }));
  return rows.map(toDraft);
}

/** One draft, or null if it doesn't exist in this shop. */
export async function getAgentDraft(shopId: string, id: string | undefined): Promise<AgentDraft | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from('agent_drafts')
    .select(DRAFT_SELECT)
    .eq('shop_id', shopId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toDraft(data) : null;
}

/**
 * Approves a proposed draft and applies it (approve_agent_draft RPC). For an
 * estimate draft this creates a draft estimate; nothing is sent to the
 * customer. Pass customerId when the draft has no customer yet.
 *
 * Throws if the draft can't be approved (not found, already decided, no
 * customer). If approval worked but applying failed, the draft is kept as
 * 'failed' and this returns { error } instead of throwing.
 */
export async function approveAgentDraft(id: string, customerId?: string): Promise<AgentDraftResult> {
  if (!isUuid(id)) throw new Error('Draft not found');
  const result = toResult(
    unwrap(await supabase.rpc('approve_agent_draft', { p_draft_id: id, p_customer_id: customerId })),
  );
  if (!result) throw new Error('Unexpected response from approve_agent_draft');
  return result;
}

/** Rejects a proposed draft. Nothing is applied. */
export async function rejectAgentDraft(id: string): Promise<void> {
  if (!isUuid(id)) throw new Error('Draft not found');
  const { error } = await supabase.rpc('reject_agent_draft', { p_draft_id: id });
  if (error) throw new Error(error.message);
}
