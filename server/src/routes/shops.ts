import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireShop, requireUser, type ShopVars } from '../middleware/auth.ts';

const createShopSchema = z.object({
  name: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(200).optional(),
});

const updateShopSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    // Fraction, e.g. 0.08 for 8%.
    taxRate: z.number().min(0).lt(1),
    laborRate: z.number().min(0).nullable(),
    timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
  })
  .partial();

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const shops = new Hono<{ Variables: ShopVars }>()
  .use(requireUser)

  // The signed-in user and the shops they belong to.
  .get('/me', async (c) => {
    const user = c.get('user');
    const { data, error } = await c
      .get('db')
      .from('shop_members')
      .select('role, display_name, shop:shops(id, name)')
      .eq('user_id', user.id);
    if (error) throw new HTTPException(500, { message: error.message });
    return c.json({ user: { id: user.id, email: user.email }, memberships: data });
  })

  .post('/shops', zValidator('json', createShopSchema), async (c) => {
    const { name, displayName } = c.req.valid('json');
    const { data: shopId, error } = await c
      .get('db')
      .rpc('create_shop', { p_name: name, p_display_name: displayName });
    if (error) throw new HTTPException(500, { message: error.message });
    return c.json({ id: shopId }, 201);
  })

  .get('/shop', requireShop, async (c) => {
    const { data, error } = await c
      .get('db')
      .from('shops')
      .select('id, name, tax_rate, labor_rate, timezone')
      .eq('id', c.get('shopId'))
      .single();
    if (error) throw new HTTPException(500, { message: error.message });
    return c.json(data);
  })

  // Owners only; RLS rejects the update for techs, which shows up as no row.
  .patch('/shop', requireShop, zValidator('json', updateShopSchema), async (c) => {
    const body = c.req.valid('json');
    const { data, error } = await c
      .get('db')
      .from('shops')
      .update({
        name: body.name,
        tax_rate: body.taxRate,
        labor_rate: body.laborRate,
        timezone: body.timezone,
      })
      .eq('id', c.get('shopId'))
      .select('id, name, tax_rate, labor_rate, timezone')
      .maybeSingle();
    if (error) throw new HTTPException(500, { message: error.message });
    if (!data) throw new HTTPException(403, { message: 'Only shop owners can change shop settings' });
    return c.json(data);
  });
