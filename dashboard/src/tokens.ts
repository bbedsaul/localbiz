export type Theme = 'dark' | 'light';

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceHigh: string;
  border: string;
  borderHi: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accentDim: string;
  accentHi: string;
  amber: string;
  amberDim: string;
  red: string;
  redDim: string;
  blue: string;
  blueDim: string;
  purple: string;
  purpleDim: string;
  green: string;
  greenDim: string;
}

const darkTheme: ThemeTokens = {
  bg: "#0c0e0f",
  surface: "#131618",
  surfaceHigh: "#1a1d20",
  border: "#232729",
  borderHi: "#2e3335",
  text: "#e2e8ea",
  muted: "#5a6369",
  dim: "#3a4248",
  accent: "#00b97d",
  accentDim: "#003d2a",
  accentHi: "#00e699",
  amber: "#f59e0b",
  amberDim: "#3d2800",
  red: "#ef4444",
  redDim: "#3d0f0f",
  blue: "#3b82f6",
  blueDim: "#0f1f3d",
  purple: "#a855f7",
  purpleDim: "#1f0a3d",
  green: "#22c55e",
  greenDim: "#0a3d1f",
};

const lightTheme: ThemeTokens = {
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceHigh: "#f1f5f9",
  border: "#e2e8f0",
  borderHi: "#cbd5e1",
  text: "#0f172a",
  muted: "#64748b",
  dim: "#94a3b8",
  accent: "#059669",
  accentDim: "#d1fae5",
  accentHi: "#047857",
  amber: "#d97706",
  amberDim: "#fef3c7",
  red: "#dc2626",
  redDim: "#fee2e2",
  blue: "#2563eb",
  blueDim: "#dbeafe",
  purple: "#9333ea",
  purpleDim: "#f3e8ff",
  green: "#16a34a",
  greenDim: "#dcfce7",
};

export const themes = { dark: darkTheme, light: lightTheme };

// Default export for backward compatibility (will be overridden by context)
export let T: ThemeTokens = darkTheme;

export function setTheme(theme: Theme) {
  T = themes[theme];
}
