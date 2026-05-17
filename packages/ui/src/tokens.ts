/**
 * Aether design tokens — exported as plain TS so they can be consumed from
 * Tailwind config, CSS-in-JS and runtime code alike.
 *
 * Naming follows the Linear / Arc / Vercel convention:
 *   - `aether.bg.canvas`  – base background
 *   - `aether.bg.glass`   – semi-transparent layer
 *   - `aether.text.*`     – semantic text colours
 *   - `aether.accent.*`   – brand accents
 *
 * The dark theme is the default; the light theme reuses the same names so
 * components do not branch on `theme`. Themes are toggled by mounting a CSS
 * variable set at the `<html data-theme="...">` level.
 */

export const palette = {
  /* Brand */
  iris: "#7C5CFF",
  irisDeep: "#5B3CDB",
  cyan: "#5DE0E6",
  amber: "#FFB454",
  rose: "#FF6F91",

  /* Neutrals — Dark */
  ink900: "#0A0B0F",
  ink800: "#0F1117",
  ink700: "#161924",
  ink600: "#1D2030",
  ink500: "#262A3E",
  fog500: "#7780A8",
  fog300: "#A3ABC7",
  paper50: "#F5F7FB",

  /* Semantic */
  success: "#3DDC97",
  warning: "#FFB454",
  danger: "#FF5D6C",
  info: "#5DE0E6",
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;

export const spacing = {
  px: 1,
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const motion = {
  spring: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 } as const,
  springSoft: { type: "spring", stiffness: 220, damping: 28, mass: 0.9 } as const,
  ease: [0.32, 0.72, 0, 1] as const,
  durations: { instant: 80, fast: 160, base: 260, slow: 420 },
} as const;

export const elevation = {
  /** Subtle 1-px hairline for inline controls. */
  hairline: "inset 0 0 0 1px rgba(255,255,255,0.06)",
  /** Floating panels (Cmd+K, AI sidebar, tab previews). */
  panel:
    "0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 60px -10px rgba(8,10,30,0.45), 0 12px 30px -6px rgba(8,10,30,0.35)",
  /** Tooltips and contextual chips. */
  pop: "0 10px 30px -8px rgba(8,10,30,0.45)",
} as const;

export type Palette = typeof palette;
export type RadiiToken = keyof typeof radii;
