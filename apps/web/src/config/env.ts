const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

export const env = {
  apiBaseUrl: rawApiBase.replace(/\/$/, ""),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "",
} as const;

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey,
);
