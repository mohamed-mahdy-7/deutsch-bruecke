import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativeUrl: string): string {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

describe("responsive layout invariants", () => {
  const appShell = read("./AppShell.tsx");
  const app = read("../../App.tsx");
  const css = read("../../styles/index.css");
  const html = read("../../../index.html");
  const chat = read("../../pages/TutorSessionPage.tsx");
  const modal = read("../ui/Modal.tsx");

  it("keeps the desktop sidebar as a fixed-height, internally scrolling column", () => {
    expect(appShell).toContain("lg:h-dvh");
    expect(appShell).toContain("lg:overflow-hidden");
    expect(appShell).toContain("h-dvh shrink-0");
    expect(appShell).toContain("min-h-0 flex-1");
    expect(appShell).toContain("overflow-y-auto");
    expect(appShell).toContain("overscroll-contain");
  });

  it("scrolls the main content independently on desktop", () => {
    expect(appShell).toContain('data-app-scroll=""');
    expect(appShell).toContain("lg:overflow-y-auto");
    expect(appShell).toContain("lg:min-h-0");
  });

  it("renders every desktop nav item on mobile through the shared drawer", () => {
    expect(appShell).toContain("NAV_ITEMS.map((item)");
    expect(appShell).toContain('role="dialog"');
    expect(appShell).toContain('aria-modal="true"');
    expect(appShell).toContain('aria-controls="mobile-sidebar"');
    expect(appShell).toContain('aria-expanded={drawerOpen}');
    expect(appShell).toContain('document.body.style.overflow = "hidden"');
    expect(appShell).toContain('key === "Escape"');
    expect(appShell).toContain("scrollIntoView");
  });

  it("keeps the mobile bottom nav as a subset of the desktop nav", () => {
    expect(appShell).toContain("MOBILE_PATHS");
    expect(appShell).toContain("grid grid-cols-5");
  });

  it("declares safe-area handling and the viewport-fit meta", () => {
    expect(html).toContain("viewport-fit=cover");
    expect(css).toContain(".safe-top");
    expect(css).toContain(".safe-bottom");
    expect(modal).toContain("env(safe-area-inset-bottom");
  });

  it("makes touch targets comfortable on coarse pointers", () => {
    expect(css).toContain("@media (pointer: coarse)");
    expect(css).toContain(".touch-target");
    expect(appShell).toContain("min-h-11");
  });

  it("keeps the chat composer inside a scrollable, viewport-sized card", () => {
    expect(chat).toContain("h-[calc(100dvh-9rem)]");
    expect(chat).toContain("min-h-0 flex-1");
    expect(chat).toContain("overflow-y-auto");
    expect(chat).toContain("scroll-mt-20");
  });

  it("matches every desktop nav item to a real route", () => {
    const navItemsMatch = appShell.match(
      /\{ to: "(\/[^"]+)", key: "nav\.[^"]+", icon: [A-Za-z]+ \}/g,
    );
    expect(navItemsMatch).not.toBeNull();
    const paths = (navItemsMatch ?? []).map((entry) => {
      const match = entry.match(/to: "(\/[^"]+)"/);
      return match ? match[1] : "";
    });
    const routePaths = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
    for (const path of paths) {
      expect(routePaths).toContain(path);
    }
  });
});
