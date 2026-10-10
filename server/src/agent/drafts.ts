import { z } from 'zod';
import type { Db } from '../supabase.ts';

// At most two decimal places, matching numeric(10,2) / numeric(12,2) columns.
// toPrecision strips float noise (0.29 * 100 is 28.999999999999996).
const hasCents = (n: number) => Number.isInteger(Number((n * 100).toPrecision(12)));
const centsMessage = 'At most 2 decimal places';

const estimateDraftItemSchema = z.object({
  kind: z.enum(['material', 'labor', 'permit', 'other']),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().lt(1e8).refine(hasCents, centsMessage),
  unit_price: z.number().min(0).lt(1e10).refine(hasCents, centsMessage),
});

/**
 * The payload of an agent_drafts row with kind 'estimate': exactly what
 * approve_agent_draft turns into a draft estimate. Unit prices come from the
 * shop's own data, never from the model.
 */
export const estimateDraftPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable(),
  // YYYY-MM-DD, or null for no expiry.
  valid_until: z.iso.date().nullable(),
  // Fraction (0.08 = 8%), or null to use the shop's rate.
  tax_rate: z.number().min(0).lt(1).nullable(),
  items: z.array(estimateDraftItemSchema).min(1).max(200),
  // Things that couldn't be priced. Shown to the user, not turned into line items.
  missing: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(500),
        reason: z.string().trim().min(1).max(500),
      }),
    )
    .max(200),
  labor_hours: z.number().min(0).lt(10000).nullable(),
});

export type EstimateDraftPayload = z.infer<typeof estimateDraftPayloadSchema>;

export interface EstimateDraftInput {
  shopId: string;
  /** The customer the estimate is for, or null to have the user pick one on approval. */
  customerId?: string | null;
  payload: EstimateDraftPayload;
  /** One plain line for the drafts list. */
  summary: string;
  /** Why the agent suggests it and which records it used. */
  reason: string | null;
}

export interface InsertedDraft {
  id: string;
  status: 'proposed';
  summary: string;
  payload: EstimateDraftPayload;
  created_at: string;
}

/**
 * Records an estimate the agent proposes, as an agent_drafts row with status
 * 'proposed'. Nothing is applied: the user approves it later
 * (approve_agent_draft). Runs with the caller's client, so RLS checks the
 * shop membership and the composite FK rejects a customer from another shop.
 * Throws a ZodError if the payload is invalid.
 */
export async function insertEstimateDraft(db: Db, input: EstimateDraftInput): Promise<InsertedDraft> {
  const payload = estimateDraftPayloadSchema.parse(input.payload);
  const summary = z.string().trim().min(1).max(300).parse(input.summary);

  const { data, error } = await db
    .from('agent_drafts')
    .insert({
      shop_id: input.shopId,
      kind: 'estimate',
      status: 'proposed',
      customer_id: input.customerId ?? null,
      payload,
      summary,
      reason: input.reason?.trim() || null,
      // requested_by defaults to auth.uid(), which the insert policy requires.
    })
    .select('id, status, summary, created_at')
    .single();
  if (error) throw new Error(error.message);

  return { id: data.id, status: 'proposed', summary: data.summary, payload, created_at: data.created_at };
}
