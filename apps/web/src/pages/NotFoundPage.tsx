import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { useAppPreferences } from "@/state/useAppPreferences";
import { Brand } from "@/components/ui/Logo";
import { buttonCn } from "@/components/ui/Button";

export function NotFoundPage() {
  const { t } = useAppPreferences();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12 text-center">
      <Brand />
      <span className="mt-8 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-primary">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-4 text-6xl font-extrabold tracking-tight text-primary">
        404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold">{t("notfound.title")}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t("notfound.body")}
      </p>
      <Link
        to="/"
        className={buttonCn("primary", "md", "mt-5")}
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        {t("notfound.cta")}
      </Link>
      <p className="german-inline mt-8 text-xs text-muted-foreground">
        Deutsch Brücke · A1–B1
      </p>
    </div>
  );
}
