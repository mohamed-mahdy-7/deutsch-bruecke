import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Resets scroll between screens, while leaving in-page anchor behaviour alone. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
