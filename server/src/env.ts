function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}. See server/.env.example.`);
  return value;
}

export const env = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  port: Number(process.env.PORT ?? 8787),
};
