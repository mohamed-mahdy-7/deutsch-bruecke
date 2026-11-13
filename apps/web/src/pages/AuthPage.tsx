import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/state/AuthProvider";
import { useAppPreferences } from "@/state/useAppPreferences";
import { Brand } from "@/components/ui/Logo";
import { Button, buttonCn } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Field, inputCn } from "@/components/ui/Field";
import { LanguageToggle, ThemeToggle } from "@/components/layout/Toggles";

type AuthTab = "signin" | "signup";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.51h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.56-5.17 3.56-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AuthPage() {
  const { t } = useAppPreferences();
  const {
    configured,
    mode: authMode,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    continueAsGuest,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<AuthTab>(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    // Signed-in accounts skip the auth screen. Guests must still be able to
    // reach this page to promote their local progress to an account.
    if (authMode === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [authMode, navigate]);

  const friendlyError = (caught: unknown): string => {
    const message =
      caught instanceof Error ? caught.message.toLowerCase() : String(caught);
    if (message.includes("invalid login credentials")) {
      return t("auth.invalidCredentials");
    }
    if (message.includes("already registered") || message.includes("user already")) {
      return t("auth.emailInUse");
    }
    if (message.includes("supabase_not_configured")) {
      return t("auth.supabaseMissing");
    }
    return t("auth.error");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setConfirmation(null);

    if (tab === "signup" && !displayName.trim()) {
      setError(t("onboarding.nameRequired"));
      return;
    }
    if (!email.trim() || !password) {
      setError(t("auth.fillAll"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("auth.invalidEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.shortPassword"));
      return;
    }

    setBusy("email");
    try {
      if (tab === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        const result = await signUpWithEmail(
          email.trim(),
          password,
          displayName.trim(),
        );
        if (result.needsConfirmation) {
          setConfirmation(t("auth.checkEmail"));
          setPassword("");
        }
      }
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInWithGoogle();
    } catch (caught) {
      setError(friendlyError(caught) || t("auth.googleError"));
      setBusy(null);
    }
  };

  const guest = () => {
    continueAsGuest();
    navigate("/", { replace: true });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary/85 p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute -end-24 -top-24 h-80 w-80 rounded-full border border-primary-foreground/15"
          aria-hidden="true"
        />
        <div
          className="star-pattern pointer-events-none absolute inset-0 opacity-20"
          aria-hidden="true"
        />
        <Link to="/" className="relative w-fit rounded-xl">
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/15">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="german-inline text-lg font-extrabold">
              Deutsch Brücke
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/65">
            {t("brand.promise")}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-snug">
            {t("auth.signupSubtitle")}
          </h1>
          <ul className="mt-6 space-y-3 text-sm text-primary-foreground/85">
            {[
              t("welcome.feature1Body"),
              t("welcome.feature2Body"),
              t("auth.guestBody"),
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          {t("welcome.footer")}
        </p>
      </div>

      <div className="flex flex-col">
        <header className="safe-top flex min-h-16 items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 flip-rtl" aria-hidden="true" />
            {t("auth.backHome")}
          </Link>
          <div className="flex items-center gap-0.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Brand />
            </div>

            <div className="surface-card p-5 sm:p-7">
              <div className="flex rounded-2xl bg-muted/60 p-1">
                {(
                  [
                    { id: "signin", label: t("auth.signIn") },
                    { id: "signup", label: t("auth.createAccount") },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab(item.id);
                      setError(null);
                      setConfirmation(null);
                    }}
                    aria-pressed={tab === item.id}
                    className={`touch-target min-h-9 flex-1 rounded-xl px-3 text-xs font-bold transition-all sm:text-sm ${
                      tab === item.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <h1 className="mt-5 text-2xl font-extrabold">
                {tab === "signin"
                  ? t("auth.welcomeBack")
                  : t("auth.createAccount")}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {tab === "signin"
                  ? t("auth.loginSubtitle")
                  : t("auth.signupSubtitle")}
              </p>

              {!configured ? (
                <div className="mt-5 space-y-4">
                  <Alert tone="info" title={t("auth.guestTitle")}>
                    {t("auth.demoNotice")}
                  </Alert>
                  <Button className="w-full" size="lg" onClick={guest}>
                    {t("auth.guest")}
                    <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
                  </Button>
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    {t("auth.guestBody")}
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="mt-5 w-full"
                    onClick={() => void google()}
                    loading={busy === "google"}
                    disabled={busy !== null}
                    icon={<GoogleMark />}
                  >
                    {t("auth.google")}
                  </Button>

                  <div className="my-4 flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[0.68rem] font-bold text-muted-foreground">
                      {t("common.or")}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={(event) => void submit(event)} className="space-y-3.5" noValidate>
                    {tab === "signup" ? (
                      <Field label={t("auth.displayName")} htmlFor="auth-name">
                        <div className="relative">
                          <UserRound
                            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <input
                            id="auth-name"
                            name="name"
                            autoComplete="name"
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            placeholder={t("auth.namePlaceholder")}
                            className={`${inputCn} ps-9`}
                            maxLength={60}
                          />
                        </div>
                      </Field>
                    ) : null}

                    <Field label={t("auth.email")} htmlFor="auth-email">
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <input
                          id="auth-email"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          dir="ltr"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder={t("auth.emailPlaceholder")}
                          className={`${inputCn} ps-9`}
                          required
                        />
                      </div>
                    </Field>

                    <Field
                      label={t("auth.password")}
                      htmlFor="auth-password"
                      hint={tab === "signup" ? t("auth.passwordHint") : undefined}
                    >
                      <div className="relative">
                        <LockKeyhole
                          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <input
                          id="auth-password"
                          name="password"
                          type="password"
                          autoComplete={
                            tab === "signin" ? "current-password" : "new-password"
                          }
                          dir="ltr"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder={t("auth.passwordPlaceholder")}
                          className={`${inputCn} ps-9`}
                          minLength={6}
                          required
                        />
                      </div>
                    </Field>

                    {error ? (
                      <Alert tone="danger">{error}</Alert>
                    ) : null}
                    {confirmation ? (
                      <Alert tone="success">{confirmation}</Alert>
                    ) : null}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      loading={busy === "email"}
                      disabled={busy !== null}
                    >
                      {busy === "email"
                        ? tab === "signin"
                          ? t("auth.loggingIn")
                          : t("auth.creating")
                        : tab === "signin"
                          ? t("auth.signIn")
                          : t("auth.signUp")}
                    </Button>
                  </form>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <span>
                      {tab === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTab(tab === "signin" ? "signup" : "signin");
                        setError(null);
                        setConfirmation(null);
                      }}
                      className="font-bold text-primary hover:underline"
                    >
                      {tab === "signin" ? t("auth.createAccount") : t("auth.signIn")}
                    </button>
                  </div>

                  <div className="my-4 h-px bg-border" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={guest}
                    className={buttonCn("ghost", "md", "w-full text-muted-foreground")}
                  >
                    {t("auth.guest")}
                  </button>
                </>
              )}
            </div>

            <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-muted-foreground">
              {t("auth.guestBody")}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
