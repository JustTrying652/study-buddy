const THEME_KEY = "study-buddy:theme";

export type Theme = "light" | "dark";

export function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error("Could not save theme preference", e);
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getCurrentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

// Inlined into a blocking <script> in layout.tsx so the correct theme
// applies before first paint — avoids a flash of the wrong theme on load.
// Keep this in sync with the logic above if either changes.
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_KEY}');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;