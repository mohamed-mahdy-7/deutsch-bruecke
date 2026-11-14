const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

export const env = {
  apiBaseUrl: rawApiBase.replace(/\/$/, ""),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "",
  /**
   * Local development only. When the API runs with AUTH_BYPASS_DEV=true and
   * no Supabase project exists, the web app may call AI routes without a
   * session token. Vite inlines this at build time, so never enable it for a
   * deployed build.
   */
  aiDevBypass:
    import.meta.env.VITE_AI_DEV_BYPASS?.trim().toLowerCase() === "true",
} as const;

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey,
);
