import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { SettingsProvider, useSettings } from "@/providers/SettingsProvider";
import { AuthProvider } from "@/state/AuthProvider";
import { AiAccessProvider } from "@/state/AiAccessProvider";
import { ProgressProvider, useProgress } from "@/state/ProgressProvider";
import { CustomScenariosProvider } from "@/state/CustomScenariosProvider";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { PwaManager } from "@/components/layout/PwaManager";
import { RequireApp, RequireOnboarding, RootRoute } from "@/components/layout/RouteGates";
import { AuthPage } from "@/pages/AuthPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TutorPage } from "@/pages/TutorPage";
import { TutorSessionPage } from "@/pages/TutorSessionPage";
import { CustomScenarioPage } from "@/pages/CustomScenarioPage";
import { GrammarPage } from "@/pages/GrammarPage";
import { BuilderPage } from "@/pages/BuilderPage";
import { VocabularyPage } from "@/pages/VocabularyPage";
import { VocabularyReviewPage } from "@/pages/VocabularyReviewPage";
import { CurriculumPage } from "@/pages/CurriculumPage";
import { ListeningPage } from "@/pages/ListeningPage";
import { PronunciationPage } from "@/pages/PronunciationPage";
import { ProgressPage } from "@/pages/ProgressPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * When a learner signs in on a new device, adopt the language and theme they
 * saved in their profile — but never overwrite a choice already made locally.
 */
function ProfilePreferenceBridge() {
  const { progress } = useProgress();
  const { adoptProfilePreferences } = useSettings();
  const profile = progress?.profile;

  useEffect(() => {
    if (profile) adoptProfilePreferences(profile);
  }, [profile, adoptProfilePreferences]);

  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AuthProvider>
          <AiAccessProvider>
            <ProgressProvider>
              <CustomScenariosProvider>
                <ProfilePreferenceBridge />
                <BrowserRouter>
                  <ScrollToTop />
                  <PwaManager />
                  <Routes>
                  <Route path="/" element={<RootRoute />} />
                  <Route path="/auth" element={<AuthPage />} />

                  <Route element={<RequireOnboarding />}>
                    <Route path="/onboarding" element={<OnboardingPage />} />
                  </Route>

                  <Route element={<RequireApp />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/tutor" element={<TutorPage />} />
                    <Route
                      path="/tutor/create"
                      element={<CustomScenarioPage />}
                    />
                    <Route
                      path="/tutor/create/:scenarioId"
                      element={<CustomScenarioPage />}
                    />
                    <Route
                      path="/tutor/:scenarioId"
                      element={<TutorSessionPage />}
                    />
                    <Route path="/grammar" element={<GrammarPage />} />
                    <Route path="/builder" element={<BuilderPage />} />
                    <Route path="/curriculum" element={<CurriculumPage />} />
                    <Route path="/listening" element={<ListeningPage />} />
                    <Route
                      path="/pronunciation"
                      element={<PronunciationPage />}
                    />
                    <Route path="/vocabulary" element={<VocabularyPage />} />
                    <Route
                      path="/vocabulary/review"
                      element={<VocabularyReviewPage />}
                    />
                    <Route path="/progress" element={<ProgressPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                  </Routes>
                </BrowserRouter>
              </CustomScenariosProvider>
            </ProgressProvider>
          </AiAccessProvider>
        </AuthProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
