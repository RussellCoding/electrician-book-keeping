import { isUuid, supabase, unwrap, type Tables, type Views } from './supabase';
import type { Estimate, EstimateItem, EstimateItemInput, EstimateStatus, JobType } from './types';

type EstimateRow = Tables<'estimates'> & {
  customers: { name: string } | null;
  estimate_items: Tables<'estimate_items'>[];
  jobs: { id: string }[];
};

const ESTIMATE_SELECT = '*, customers(name), estimate_items(*), jobs(id)';

function toItem(row: Tables<'estimate_items'>): EstimateItem {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unit_price);
  return {
    id: row.id,
    kind: row.kind,
    description: row.description,
    quantity,
    unitPrice,
    total: lineTotal(quantity, unitPrice),
  };
}

function toEstimate(row: EstimateRow, totals?: Views<'estimate_totals'>): Estimate {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? '',
    title: row.title,
    description: row.description ?? '',
    items: [...row.estimate_items].sort((a, b) => a.position - b.position).map(toItem),
    subtotal: Number(totals?.subtotal ?? 0),
    tax: Number(totals?.tax ?? 0),
    total: Number(totals?.total ?? 0),
    taxRate: Number(row.tax_rate),
    status: row.status,
    createdAt: row.created_at,
    validUntil: row.valid_until,
    sentAt: row.sent_at,
    jobId: row.jobs[0]?.id ?? null,
  };
}

// Like Postgres round(numeric, 2): half a cent rounds up. toPrecision strips
// float noise first (1.005 * 100 is 100.49999999999999 in JS, not 100.5).
const roundCents = (n: number) => Math.round(Number((n * 100).toPrecision(12))) / 100;

/** quantity x unitPrice rounded to cents, the same way the estimate_totals view does. */
export function lineTotal(quantity: number, unitPrice: number): number {
  return roundCents(quantity * unitPrice);
}

/**
 * Subtotal, tax and total for line items, matching the estimate_totals view:
 * each line is rounded to cents, then tax on the subtotal is rounded.
 */
export function computeEstimateTotals(
  items: Pick<EstimateItemInput, 'quantity' | 'unitPrice'>[],
  taxRate: number,
): { subtotal: number; tax: number; total: number } {
  const subtotal = roundCents(items.reduce((sum, i) => sum + lineTotal(i.quantity, i.unitPrice), 0));
  const tax = roundCents(subtotal * taxRate);
  return { subtotal, tax, total: roundCents(subtotal + tax) };
}

/** All estimates in the shop, newest first, with line items and totals. */
export async function listEstimates(shopId: string): Promise<Estimate[]> {
  const [rows, totals] = await Promise.all([
    supabase
      .from('estimates')
      .select(ESTIMATE_SELECT)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .then(unwrap),
    supabase.from('estimate_totals').select('*').eq('shop_id', shopId).then(unwrap),
  ]);
  const byId = new Map(totals.map((t) => [t.estimate_id, t]));
  return rows.map((row) => toEstimate(row, byId.get(row.id)));
}

export interface NewEstimate {
  customerId: string;
  title: string;
  description: string;
  /** Fraction (0.08 = 8%). Pass the shop's rate so the saved estimate matches what the user saw. */
  taxRate: number;
  /** YYYY-MM-DD, or null for no expiry. */
  validUntil: string | null;
  items: EstimateItemInput[];
}

/**
 * Saves a new estimate as a draft with its line items. Nothing is sent to the
 * customer. Returns the new estimate's id.
 */
export async function createEstimate(shopId: string, input: NewEstimate): Promise<string> {
  if (!input.title.trim()) throw new Error('Estimate needs a title');
  if (input.items.length === 0) throw new Error('Add at least one line item');
  for (const item of input.items) {
    if (!item.description.trim()) throw new Error('Every line item needs a description');
    if (!(item.quantity > 0)) throw new Error('Quantities must be more than 0');
    if (!(item.unitPrice >= 0)) throw new Error('Prices can’t be negative');
  }

  const { id } = unwrap<{ id: string }>(
    await supabase
      .from('estimates')
      .insert({
        shop_id: shopId,
        customer_id: input.customerId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        tax_rate: input.taxRate,
        valid_until: input.validUntil,
        status: 'draft',
      })
      .select('id')
      .single(),
  );

  const { error } = await supabase.from('estimate_items').insert(
    input.items.map((item, position) => ({
      shop_id: shopId,
      estimate_id: id,
      kind: item.kind,
      description: item.description.trim(),
      quantity: item.quantity,
      unit_price: item.unitPrice,
      position,
    })),
  );
  if (error) {
    // Two inserts aren't atomic from the browser; don't leave an empty estimate behind.
    const cleanup = await supabase.from('estimates').delete().eq('id', id).select('id');
    if (cleanup.error || cleanup.data?.length !== 1) {
      throw new Error(`${error.message}. An empty draft estimate may have been left behind.`);
    }
    throw new Error(error.message);
  }
  return id;
}

/** Which status changes the user can make by hand. */
const ALLOWED_FROM: Record<Exclude<EstimateStatus, 'draft'>, EstimateStatus[]> = {
  sent: ['draft'],
  approved: ['sent'],
  rejected: ['sent'],
};

/**
 * Records a status change the user made: marking a draft as sent (they
 * delivered it themselves; this sends nothing), or recording the customer's
 * answer on a sent estimate.
 */
export async function setEstimateStatus(
  shopId: string,
  estimateId: string,
  status: Exclude<EstimateStatus, 'draft'>,
): Promise<void> {
  if (!isUuid(estimateId)) throw new Error('Estimate not found');
  const patch: Partial<Tables<'estimates'>> = { status };
  if (status === 'sent') patch.sent_at = new Date().toISOString();
  const rows = unwrap(
    await supabase
      .from('estimates')
      .update(patch)
      .eq('shop_id', shopId)
      .eq('id', estimateId)
      .in('status', ALLOWED_FROM[status])
      .select('id'),
  );
  if (rows.length === 0) throw new Error('This estimate changed or no longer exists. Reload and try again.');
}

export interface ConvertOptions {
  type: JobType;
  /** ISO timestamp, or null to leave the job unscheduled. */
  scheduledAt: string | null;
  estimatedHours: number | null;
}

/** Turns an approved estimate into a job (convert_estimate_to_job RPC). Returns the job id. */
export async function convertEstimateToJob(estimateId: string, options: ConvertOptions): Promise<string> {
  return unwrap(
    await supabase.rpc('convert_estimate_to_job', {
      p_estimate_id: estimateId,
      p_type: options.type,
      p_scheduled_at: options.scheduledAt ?? undefined,
      p_estimated_hours: options.estimatedHours ?? undefined,
    }),
  );
}
