# Responsive audit report — Deutsch Brücke

## What was broken

1. Desktop sidebar (`apps/web/src/components/layout/AppShell.tsx`):
   - `aside` was `sticky top-0 … h-dvh` with no `overflow-hidden`, and the middle `<nav>` had `flex-1` but no `min-h-0`/`overflow-y-auto`. With nine nav items plus the streak card and profile card the column was taller than the viewport; the footer spilled below the fold and was unreachable.
   - Main content shared the same page scroll, so long pages did not scroll independently inside the shell.
2. Mobile navigation exposed only five of the nine sidebar routes (`/dashboard`, `/tutor`, `/curriculum`, `/vocabulary`, `/progress`); `/grammar`, `/builder`, `/listening`, `/pronunciation` had no mobile entry point.
3. Chat card used a fixed `h-[68dvh] min-h-[28rem]` inside the normal page flow; on short phones the composer sat below the fold and the bottom nav could overlap it.
4. Safe-area handling covered only the bottom inset (`.safe-bottom`); the top/side insets from notched devices were ignored.
5. Touch targets were mixed: many secondary buttons were 32–40 px high (`size="sm"`, icon buttons, tabs, chat actions).

## Root cause

- Missing `min-h-0` on the flex child that owns the scroll area (classic flex clipping).
- No internal scroll container on the sidebar; the page itself scrolled everything.
- Mobile bottom nav was filtered to five routes and there was no drawer for the rest.
- `100dvh` was used on the body but the shell did not constrain desktop height, so the sidebar could not scroll.
- No safe-area top padding; `viewport-fit=cover` was set but only `.safe-bottom` consumed `env()`.

## Changes made

- `AppShell.tsx`: shell is `min-h-dvh lg:h-dvh lg:overflow-hidden`; sidebar is `h-dvh … overflow-hidden` with brand (shrink-0), a `min-h-0 flex-1 overflow-y-auto` nav, and a `shrink-0` footer. Active nav item is scrolled into view on route change. Added a collapsible desktop rail (persisted in localStorage) with icon-only mode. Added an accessible mobile drawer (hamburger, overlay, Escape/outside-tap/route-change close, focus trap, body scroll lock) that reuses the same `SidebarNav`/`SidebarFooter`, so all nine routes + profile are reachable. Header gained a hamburger and safe-top padding; main gained `lg:min-h-0 lg:overflow-y-auto` and `data-app-scroll`.
- `ScrollToTop.tsx`: resets both `window` and the desktop scroll container.
- `index.css`: added `.safe-top`, coarse-pointer `.touch-target`, safe-area bottom-sheet padding in `Modal`.
- `Modal.tsx`: bottom-sheet now adds `pb-[calc(1.25rem+env(safe-area-inset-bottom))]`.
- `Tabs.tsx`: segmented tabs are at least 44 px tall on mobile.
- `TutorSessionPage.tsx`: chat card is `h-[calc(100dvh-9rem)]` on phones (68dvh from `sm`), message list has `min-h-0`, composer scrolls into view on focus.
- `WelcomePage.tsx`, `AuthPage.tsx`, `OnboardingPage.tsx`: safe-top headers and larger primary CTA/tabs where needed.
- `Button.tsx`, `SpeakerButton.tsx`, `ChatBubble.tsx`, `DashboardPage.tsx`, `ProfilePage.tsx`, `CurriculumPage.tsx`, `AuthPage.tsx`: added `touch-target` (coarse-pointer 44 px minimum).
- `i18n.ts`: added `aria.openMenu`, `aria.closeMenu`, `aria.collapseSidebar`, `aria.expandSidebar` (Arabic + English).
- `responsive.test.ts`: structural regression guards for the invariants above.

## Verified (in-app Chromium browser)

Viewport sizes tested for every route: 360×640, 390×844, 414×896, 768×1024, 1024×768, 1280×720, 1440×900, 1280×600. Routes tested: `/`, `/auth`, `/onboarding`, `/dashboard`, `/tutor`, `/tutor/create`, `/tutor/cafe`, `/grammar`, `/builder`, `/curriculum`, `/listening`, `/pronunciation`, `/vocabulary`, `/vocabulary/review`, `/progress`, `/profile`, `/does-not-exist`.

Checks performed per size:
- `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal page overflow) — passed on all 15 routes × 8 sizes.
- Desktop sidebar: 9 nav links present, all reachable by scrolling the nav, nav scrolls when needed, active item scrolled into view (verified on `/pronunciation` at 1280×600).
- Mobile drawer: opens via hamburger, 9 nav links + profile, focus trap (Tab wraps), Escape closes and restores focus, overlay click closes, route change closes, body scroll lock applied.
- Mobile bottom nav: 5 links, fixed, safe-area bottom padding.
- Independent main scroll on desktop: verified (`overflow-y: auto`, scrollHeight > clientHeight).
- LTR (English) + light mode: no overflow on all routes; drawer opens from the left.
- RTL (Arabic) + dark mode: default verified.

Screenshots saved in `responsive-report/screenshots/`:
- `360-dashboard-ar-dark.jpg`
- `360-drawer-open.jpg`
- `360-chat-ar-dark.jpg`
- `768-dashboard-ar-dark.jpg`
- `1024-dashboard-ar-dark.jpg`
- `1280x600-chat-ar-dark.jpg`
- `1440-dashboard-ar-dark.jpg`
- `360-dashboard-en-light.jpg`
- `1280-dashboard-en-light.jpg`
- `welcome-360-ar-dark.jpg`
- `onboarding-360-ar-dark.jpg`

## Could not verify

- Native iOS/Android runtimes (no SDK/Xcode/device on this Windows machine); Capacitor sync was run but not launched.
- Real on-screen keyboard behaviour (visualViewport resize) — simulated via focus scroll-into-view only; device-level keyboard overlap was not exercised.
- Notch/safe-area insets in a real device — `env(safe-area-inset-*)` is in place but could only be checked with `env()` resolving to 0 in the desktop browser.
- Playwright/Cypress is not installed, so the automated checks above were run through the in-app Chromium browser rather than a committed test runner. The repository test suite (`npm test`) contains structural guards (`responsive.test.ts`) but not a live layout engine; jsdom does not compute CSS, so pixel-level overflow cannot be asserted there.
- API/AI live calls, Supabase auth/sync, and Redis were not part of this audit and remain runtime-unverified (demo/guest paths used).

## Test results

- `npm test` (web): 92 tests passed (12 files).
- `npm run typecheck` (web): passed.
- `npm run build` (web): passed (pre-existing ~597 kB chunk-size warning remains).