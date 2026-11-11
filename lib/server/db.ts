import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-side Supabase client using the service role key. Never import this from a client component. */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Country and region from the hosting edge. The IP address itself is never read or stored. */
export function geoFrom(headers: Headers) {
  const country = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || null;
  const region = headers.get("x-vercel-ip-country-region") || null;
  const ok = (v: string | null) => v && /^[A-Za-z0-9-]{1,10}$/.test(v) && v !== "XX" ? v.toUpperCase() : null;
  return { ip_country: ok(country), ip_region: ok(region) };
}
