import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.ts';
import { env } from './env.ts';

export type Db = SupabaseClient<Database>;

/**
 * A client that runs every query as the signed-in user, so Postgres
 * row-level security limits it to that user's shops. The server never uses
 * the service-role key for request handling.
 */
export function createUserClient(accessToken: string): Db {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
