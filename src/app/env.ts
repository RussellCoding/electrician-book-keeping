// Front-end config from Vite env vars. See .env.example; local values go in
// .env.local. main.tsx shows envError instead of the app when any are missing.

const vars = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_API_URL: import.meta.env.VITE_API_URL,
};

const missing = Object.entries(vars)
  .filter(([, value]) => !value)
  .map(([name]) => name);

export const envError: string | null = missing.length
  ? `Missing env var${missing.length > 1 ? 's' : ''} ${missing.join(', ')}. ` +
    'Copy .env.example to .env.local, fill it in, and restart the dev server.'
  : null;

export const env = {
  supabaseUrl: vars.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: vars.VITE_SUPABASE_ANON_KEY ?? '',
  apiUrl: vars.VITE_API_URL ?? '',
};
