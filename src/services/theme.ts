export type Theme = "auto" | "light" | "dark";

const KEY = "impara.theme";

function stored(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "auto";
  } catch {
    return "auto";
  }
}

function resolve(theme: Theme): boolean {
  return theme === "dark" || (theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
}

/** Aplică tema și o reține local, ca pagina următoare să pornească fără „flash” (vezi scriptul din index.html). */
export function applyTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // fără localStorage tema se aplică doar în această sesiune
  }
  document.documentElement.classList.toggle("dark", resolve(theme));
}

/** La pornire: aplică tema reținută și urmărește schimbările de temă ale sistemului (pentru „Auto”). */
export function initTheme(): void {
  document.documentElement.classList.toggle("dark", resolve(stored()));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (stored() === "auto") document.documentElement.classList.toggle("dark", resolve("auto"));
  });
}
