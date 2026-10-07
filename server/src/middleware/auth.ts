import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { User } from '@supabase/supabase-js';
import { createUserClient, type Db } from '../supabase.ts';

export type AuthVars = { user: User; db: Db };
export type ShopVars = AuthVars & { shopId: string };

/** Verifies the Supabase access token and attaches the user and a user-scoped client. */
export const requireUser = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) throw new HTTPException(401, { message: 'Missing bearer token' });

  const db = createUserClient(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HTTPException(401, { message: 'Invalid or expired token' });

  c.set('user', data.user);
  c.set('db', db);
  await next();
});

/**
 * Resolves which shop the request acts on. Uses the X-Shop-Id header when
 * given; otherwise the user's only shop. Must run after requireUser.
 */
export const requireShop = createMiddleware<{ Variables: ShopVars }>(async (c, next) => {
  const db = c.get('db');
  const { data: memberships, error } = await db
    .from('shop_members')
    .select('shop_id')
    .eq('user_id', c.get('user').id);
  if (error) throw new HTTPException(500, { message: error.message });

  const requested = c.req.header('X-Shop-Id');
  let shopId: string | undefined;
  if (requested) {
    shopId = memberships.find((m) => m.shop_id === requested)?.shop_id;
    if (!shopId) throw new HTTPException(403, { message: 'Not a member of that shop' });
  } else if (memberships.length === 1) {
    shopId = memberships[0].shop_id;
  } else if (memberships.length === 0) {
    throw new HTTPException(409, { message: 'No shop yet. Create one with POST /shops.' });
  } else {
    throw new HTTPException(400, { message: 'Member of several shops. Send X-Shop-Id.' });
  }

  c.set('shopId', shopId);
  await next();
});
