import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Flame,
  GraduationCap,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Mic,
  Sparkles,
  Star,
} from "lucide-react";
import { useAuth } from "@/state/AuthProvider";
import { useAppPreferences } from "@/state/useAppPreferences";
import { Brand } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { buttonCn } from "@/components/ui/Button";
import { GermanText } from "@/components/german/GermanText";
import { GrammarLegend } from "@/components/german/GrammarLegend";
import { LanguageToggle, ThemeToggle } from "@/components/layout/Toggles";

export function WelcomePage() {
  const { t } = useAppPreferences();
  const { configured, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const start = () => {
    if (configured) {
      navigate("/auth?mode=signup");
      return;
    }
    continueAsGuest();
    navigate("/onboarding");
  };

  const guest = () => {
    continueAsGuest();
    navigate("/onboarding");
  };

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="safe-top sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-0.5" aria-label={t("aria.navigation")}>
            {configured ? (
              <Link
                to="/auth"
                className="hidden rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:inline-flex"
              >
                {t("welcome.signInCta")}
              </Link>
            ) : null}
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={start}
              className={buttonCn("primary", "md", "ms-1 hidden sm:inline-flex")}
            >
              {t("welcome.cta")}
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -start-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -end-24 top-40 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/70 px-3 py-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t("welcome.eyebrow")}
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.14] tracking-tight sm:text-5xl lg:text-[3.55rem]">
                {t("welcome.titleLine1")}
                <br />
                <span className="relative inline-block text-primary">
                  {t("welcome.titleLine2")}
                  <svg
                    viewBox="0 0 220 12"
                    className="absolute inset-x-0 -bottom-1 h-2.5 w-full text-accent/70"
                    aria-hidden="true"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 8C55 2 160 2 218 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("welcome.body")}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={start}
                  className={buttonCn("primary", "lg", "group shadow-lift")}
                >
                  {t("welcome.cta")}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5 flip-rtl"
                    aria-hidden="true"
                  />
                </button>
                {configured ? (
                  <button
                    type="button"
                    onClick={guest}
                    className={buttonCn("outline", "lg")}
                  >
                    {t("welcome.guest")}
                  </button>
                ) : (
                  <Link to="/auth" className={buttonCn("outline", "lg")}>
                    {t("welcome.signInCta")}
                  </Link>
                )}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {t("welcome.authNote")}
              </p>

              <GrammarLegend className="mt-6" />
            </div>

            <div className="relative mx-auto w-full max-w-md animate-fade-up lg:max-w-none">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-accent/15" aria-hidden="true" />
              <div className="surface-card relative overflow-hidden p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-extrabold text-primary-foreground">
                      L
                    </span>
                    <div>
                      <p className="text-sm font-extrabold">{t("tutor.tutorName")}</p>
                      <p className="flex items-center gap-1 text-[0.68rem] text-muted-foreground">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        Café Morgenrot · Berlin
                      </p>
                    </div>
                  </div>
                  <Badge tone="primary">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {t("tutor.modeLive")}
                  </Badge>
                </div>

                <p className="mt-3 text-[0.68rem] font-bold text-muted-foreground">
                  {t("welcome.previewLabel")}
                </p>

                <div className="mt-2 space-y-3">
                  <div className="on-primary ms-auto max-w-[88%] rounded-2xl rounded-ee-md bg-primary px-3.5 py-2.5 text-primary-foreground">
                    <GermanText
                      text={t("welcome.previewUser")}
                      interactive={false}
                      className="text-sm"
                    />
                    <p className="mt-1 text-end text-[0.6rem] opacity-70">
                      {t("tutor.you")}
                    </p>
                  </div>

                  <div className="max-w-[94%] rounded-2xl rounded-es-md border border-border/60 bg-muted/50 p-3.5">
                    <p className="text-xs font-bold leading-relaxed text-success">
                      {t("welcome.previewPraise")}
                    </p>
                    <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">
                      {t("tutor.corrected")}
                    </p>
                    <GermanText
                      text={t("welcome.previewCorrected")}
                      interactive={false}
                      className="mt-0.5 text-sm font-semibold"
                    />
                    <div className="mt-2.5 rounded-xl border border-border/60 bg-card p-2.5 text-[0.7rem] leading-relaxed text-muted-foreground">
                      <span className="font-bold text-primary">
                        {t("tutor.mistake")}:
                      </span>{" "}
                      {t("welcome.previewMistake")}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/70 p-1.5">
                  <span className="min-w-0 flex-1 truncate px-2 text-xs text-muted-foreground">
                    {t("tutor.placeholder")}
                  </span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-5 start-3 flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 shadow-soft">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Flame className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="tnum text-sm font-extrabold leading-none">7</p>
                  <p className="text-[0.6rem] text-muted-foreground">
                    {t("dash.daysStreak", { count: 7 })}
                  </p>
                </div>
              </div>
              <div className="absolute -top-4 end-3 hidden items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 shadow-soft sm:flex">
                <Star className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span className="text-[0.68rem] font-bold">+120 XP</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3">
            {[
              {
                icon: HeartHandshake,
                title: t("welcome.feature1Title"),
                body: t("welcome.feature1Body"),
                tone: "bg-primary-soft text-primary",
              },
              {
                icon: GraduationCap,
                title: t("welcome.feature2Title"),
                body: t("welcome.feature2Body"),
                tone: "bg-accent-soft text-accent-soft-foreground",
              },
              {
                icon: MapPin,
                title: t("welcome.feature3Title"),
                body: t("welcome.feature3Body"),
                tone: "bg-success/10 text-success",
              },
            ].map((feature) => (
              <article key={feature.title} className="surface-card p-5">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${feature.tone}`}
                >
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-3.5 text-base font-extrabold">{feature.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8 text-center">
            <p className="eyebrow">{t("welcome.howTitle")}</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
              {t("welcome.step2Title")} — {t("welcome.step3Title")}
            </h2>
          </div>
          <div className="relative grid gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: t("welcome.step1Title"),
                body: t("welcome.step1Body"),
                icon: GraduationCap,
              },
              {
                step: "02",
                title: t("welcome.step2Title"),
                body: t("welcome.step2Body"),
                icon: MessageCircle,
              },
              {
                step: "03",
                title: t("welcome.step3Title"),
                body: t("welcome.step3Body"),
                icon: Star,
              },
            ].map((item) => (
              <div key={item.step} className="surface-card relative p-5 pt-8">
                <span className="tnum absolute end-4 top-4 text-3xl font-extrabold text-border">
                  {item.step}
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-base font-extrabold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-primary to-primary/85 px-6 py-10 text-center text-primary-foreground shadow-lift sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full border border-primary-foreground/15"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-20 -start-10 h-56 w-56 rounded-full border border-primary-foreground/10"
              aria-hidden="true"
            />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
              A1 → B1
            </p>
            <h2 className="mx-auto mt-2 max-w-xl text-2xl font-extrabold sm:text-3xl">
              {t("brand.promise")}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-primary-foreground/80">
              {t("welcome.step3Body")}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={start}
                className={buttonCn(
                  "accent",
                  "lg",
                  "w-full sm:w-auto shadow-lift",
                )}
              >
                {t("welcome.cta")}
                <ArrowRight className="h-4 w-4 flip-rtl" aria-hidden="true" />
              </button>
              {configured ? (
                <button
                  type="button"
                  onClick={guest}
                  className={buttonCn(
                    "ghost",
                    "lg",
                    "w-full text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto",
                  )}
                >
                  {t("welcome.guest")}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-start">
          <Brand compact />
          <p className="text-xs text-muted-foreground">{t("welcome.footer")}</p>
        </div>
      </footer>
    </div>
  );
}
