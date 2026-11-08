import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/state/AuthProvider";
import { useProgress } from "@/state/ProgressProvider";
import { WelcomePage } from "@/pages/WelcomePage";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { AppShell } from "@/components/layout/AppShell";

/**
 * `/` decides between the landing page, onboarding and the signed-in app.
 * Guests are first-class citizens and follow the same gate as accounts.
 */
export function RootRoute() {
  const { mode } = useAuth();
  const { progress, loading } = useProgress();

  if (mode === "loading") return <LoadingScreen />;
  if (mode === "anonymous") return <WelcomePage />;
  if (loading || !progress) return <LoadingScreen />;
  if (!progress.profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

/** All learning routes require a guest session or account with onboarding done. */
export function RequireApp() {
  const { mode } = useAuth();
  const { progress, loading } = useProgress();

  if (mode === "loading") return <LoadingScreen />;
  if (mode === "anonymous") return <Navigate to="/" replace />;
  if (loading || !progress) return <LoadingScreen />;
  if (!progress.profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <AppShell />;
}

/** Onboarding is available to guests and accounts but not to visitors. */
export function RequireOnboarding() {
  const { mode } = useAuth();
  const { progress, loading } = useProgress();

  if (mode === "loading") return <LoadingScreen />;
  if (mode === "anonymous") return <Navigate to="/" replace />;
  if (loading || !progress) return <LoadingScreen />;
  if (progress.profile.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  );
}
