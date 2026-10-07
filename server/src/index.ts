import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { env } from './env.ts';
import { shops } from './routes/shops.ts';

const app = new Hono()
  .use(logger())
  .use(cors({ origin: env.corsOrigin, allowHeaders: ['Authorization', 'Content-Type', 'X-Shop-Id'] }))
  .get('/health', (c) => c.json({ ok: true }))
  .route('/', shops);

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

export type AppType = typeof app;

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`ElectroCRM API listening on http://localhost:${info.port}`);
});
