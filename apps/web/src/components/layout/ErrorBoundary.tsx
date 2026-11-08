import { Component, type ErrorInfo, type ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last line of defence. A render error should never leave the learner staring
 * at a blank page, and no progress is affected because it is saved separately.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[web] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        dir="rtl"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"
      >
        <LogoMark className="h-14 w-14" />
        <h1 className="text-2xl font-extrabold">
          حصلت مشكلة غير متوقعة
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          حافظنا على أي حاجة اتكتبت. جرّب تحديث الصفحة، وتقدمك محفوظ على جهازك.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          تحديث الصفحة
        </button>
        <p className="german-inline text-xs text-muted-foreground">
          Deutsch Brücke · Something went wrong. Your saved progress is safe.
        </p>
      </div>
    );
  }
}
