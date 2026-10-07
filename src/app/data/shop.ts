import { supabase, unwrap, type Tables } from './supabase';
import type { Shop, ShopMembership } from './types';

function toShop(row: Tables<'shops'>): Shop {
  return {
    id: row.id,
    name: row.name,
    taxRate: Number(row.tax_rate),
    laborRate: row.labor_rate === null ? null : Number(row.labor_rate),
    timezone: row.timezone,
  };
}

/**
 * The signed-in user's shop. Users normally belong to one shop; if they're in
 * several, this picks the one they joined first; there's no shop switcher yet.
 * Server calls should send this shop's id as X-Shop-Id. Returns null if the
 * user has no shop.
 */
export async function getCurrentMembership(userId: string): Promise<ShopMembership | null> {
  const rows = unwrap(
    await supabase
      .from('shop_members')
      .select('role, display_name, shops(*)')
      .eq('user_id', userId)
      .order('created_at')
      .limit(1),
  );
  const row = rows[0];
  if (!row?.shops) return null;
  return { shop: toShop(row.shops), role: row.role, displayName: row.display_name };
}
