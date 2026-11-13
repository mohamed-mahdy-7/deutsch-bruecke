import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll between screens, while leaving in-page anchor behaviour alone.
 * On desktop the app scrolls inside `main[data-app-scroll]` instead of the
 * window, so both scroll containers are reset.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const appScroller = document.querySelector<HTMLElement>(
      "[data-app-scroll]",
    );
    appScroller?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
