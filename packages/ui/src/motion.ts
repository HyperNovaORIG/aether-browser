import { motion as tokens } from "./tokens";

/**
 * Re-exports of canonical motion presets. The renderer imports these from
 * `@aether/ui/motion` so we have a single source of truth for animations.
 */
export const spring = tokens.spring;
export const springSoft = tokens.springSoft;
export const ease = tokens.ease;
export const durations = tokens.durations;

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durations.fast / 1000, ease },
} as const;

export const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: spring,
} as const;

export const slideRight = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: spring,
} as const;
