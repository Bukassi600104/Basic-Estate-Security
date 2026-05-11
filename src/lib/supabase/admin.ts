import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

// Supabase client without generated DB types — we cast to bypass strict table inference.
// Generate types with `supabase gen types typescript` for full type safety later.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!cached) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();
    cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}
