import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/config/env";
import { supabase } from "@/services/supabaseClient";

export type AuthMode = "loading" | "anonymous" | "guest" | "authenticated";

export interface AuthContextValue {
  mode: AuthMode;
  user: User | null;
  session: Session | null;
  configured: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const GUEST_KEY = "deutsch-bruecke:guest";
const AuthContext = createContext<AuthContextValue | null>(null);

function readGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (!supabase) {
      // Without Supabase the only usable mode is an explicit guest session.
      setIsGuest(readGuestFlag());
      setMode(readGuestFlag() ? "guest" : "anonymous");
      return;
    }

    let alive = true;

    const applySession = (nextSession: Session | null) => {
      if (!alive) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setIsGuest(false);
        setMode("authenticated");
      } else {
        const guest = readGuestFlag();
        setIsGuest(guest);
        setMode(guest ? "guest" : "anonymous");
      }
    };

    void supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => applySession(null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = useCallback(() => {
    try {
      localStorage.setItem(GUEST_KEY, "1");
    } catch {
      // localStorage is unavailable in some private webviews; still proceed
      // for this in-memory session.
    }
    setIsGuest(true);
    setMode("guest");
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("supabase_not_configured");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      // no-op
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabase) throw new Error("supabase_not_configured");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("supabase_not_configured");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {
      // no-op
    }
    setIsGuest(false);
    setUser(null);
    setSession(null);
    setMode("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      user,
      session,
      configured: isSupabaseConfigured,
      isGuest,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      continueAsGuest,
    }),
    [
      mode,
      user,
      session,
      isGuest,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      continueAsGuest,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
