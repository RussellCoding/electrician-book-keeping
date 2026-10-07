import { isUuid, supabase, unwrap, type Tables, type Views } from './supabase';
import type { Customer, CustomerType } from './types';

function toCustomer(row: Tables<'customers'>, summary?: Views<'customer_summaries'>): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    type: row.type,
    status: row.status,
    totalJobs: summary?.total_jobs ?? 0,
    totalRevenue: Number(summary?.completed_revenue ?? 0),
    createdAt: row.created_at,
  };
}

/** All customers in the shop, by name, with job counts and revenue. */
export async function listCustomers(shopId: string): Promise<Customer[]> {
  const [rows, summaries] = await Promise.all([
    supabase.from('customers').select('*').eq('shop_id', shopId).order('name').then(unwrap),
    supabase.from('customer_summaries').select('*').eq('shop_id', shopId).then(unwrap),
  ]);
  const byId = new Map(summaries.map((s) => [s.customer_id, s]));
  return rows.map((row) => toCustomer(row, byId.get(row.id)));
}

/** One customer, or null if it doesn't exist in this shop. */
export async function getCustomer(shopId: string, id: string | undefined): Promise<Customer | null> {
  if (!isUuid(id)) return null;
  const [row, summary] = await Promise.all([
    supabase.from('customers').select('*').eq('shop_id', shopId).eq('id', id).maybeSingle(),
    supabase.from('customer_summaries').select('*').eq('customer_id', id).maybeSingle(),
  ]);
  if (row.error) throw new Error(row.error.message);
  if (summary.error) throw new Error(summary.error.message);
  return row.data ? toCustomer(row.data, summary.data ?? undefined) : null;
}

export interface CustomerInput {
  name: string;
  type: CustomerType;
  /** Empty strings are saved as "not on file". */
  email: string;
  phone: string;
  address: string;
}

function toRow(input: CustomerInput) {
  if (!input.name.trim()) throw new Error('Customer needs a name');
  return {
    name: input.name.trim(),
    type: input.type,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    address: input.address.trim() || null,
  };
}

/** Adds a customer to the shop. Returns its id. */
export async function createCustomer(shopId: string, input: CustomerInput): Promise<string> {
  const { id } = unwrap<{ id: string }>(
    await supabase
      .from('customers')
      .insert({ shop_id: shopId, ...toRow(input) })
      .select('id')
      .single(),
  );
  return id;
}

/** Saves a customer's name, type and contact info. */
export async function updateCustomer(shopId: string, customerId: string, input: CustomerInput): Promise<void> {
  if (!isUuid(customerId)) throw new Error('Customer not found');
  const rows = unwrap(
    await supabase
      .from('customers')
      .update(toRow(input))
      .eq('shop_id', shopId)
      .eq('id', customerId)
      .select('id'),
  );
  if (rows.length === 0) throw new Error('This customer no longer exists. Reload and try again.');
}
