# Aether Design System

Aether's interface aims for the calm minimalism of Linear, the inviting
density of Notion, the buttery motion of Arc and the keyboard-first feel of
Raycast. Every surface is glass-clear, every motion is spring-physics, every
spacing is on an 4 px grid.

## Brand tokens

```
iris       #7C5CFF     primary brand, AI accent
iris-deep  #5B3CDB     pressed states, deep gradients
cyan       #5DE0E6     secondary AI accent
amber      #FFB454     warnings, attention nudges
rose       #FF6F91     destructive, important alerts
```

## Neutral palette (dark first)

```
ink-900   #0A0B0F   base background, "outer space"
ink-800   #0F1117   elevated panels (sidebar, chrome)
ink-700   #161924   cards, palette
ink-600   #1D2030   tiles, agent slots
ink-500   #262A3E   hover surfaces
fog-500   #7780A8   muted text
fog-300   #A3ABC7   primary body text
paper-50  #F5F7FB   light mode default text
```

## Typography

- **Display** — Inter Display (or SF Pro Display) for hero titles.
- **Body**    — Inter var with `cv11`, `ss01`, `ss03` features for legibility.
- **Mono**    — JetBrains Mono / SF Mono.
- Letter-spacing tightened by `-0.005em` system-wide for a premium feel.
- Use the `aether-grad-text` utility class for the brand iris→cyan gradient.

## Spacing & radii

- 4 px grid; named tokens in `@aether/ui/tokens.ts`.
- Radii: `xs (4)`, `sm (6)`, `md (10)`, `lg (16)`, `xl (22)`, full.
- Hairline borders (`rgba(255,255,255,0.06)`) on every panel.

## Elevation

| Token | Use |
|---|---|
| `shadow-hairline` | Inset 1-px stroke for inline controls |
| `shadow-panel` | Floating panels (palette, sidebar) |
| `shadow-pop` | Tooltips, contextual chips |

Composed with subtle inset highlights so panels glow rather than cast hard
shadows.

## Glass

The `.glass` utility composes `backdrop-filter: blur(24px) saturate(160%)`
with `background: rgba(15,17,23,0.55)` and a hairline border. Used for the
chrome, the sidebar, the command palette and any floating panel. Glass must
always be layered over a dark substrate to avoid blue-tinted artefacts.

## Motion

Three named presets in `@aether/ui/motion.ts`:

- `spring` — primary interactive (stiffness 380, damping 32, mass 0.7)
- `springSoft` — content reflows (stiffness 220, damping 28)
- `ease` — `[0.32, 0.72, 0, 1]` (Apple's "easeInOutQuart")

Durations:

- `instant` 80 ms — tooltips
- `fast` 160 ms — hover, focus
- `base` 260 ms — panel slide
- `slow` 420 ms — sheet open

All motion is reduced when the user prefers reduced motion.

## Tone

- Title case for actions ("New Tab", not "new tab").
- Sentence case for everything else.
- No marketing speak inside the product chrome. "Summarise this page" beats
  "AI-powered summarisation".
- Empty states explain what to do, never apologise.

## Components catalogue (MVP)

- TabRail / TabItem
- Toolbar (back/forward/reload, smart address, AI quick action)
- AISidebar (tabs: Chat / Agents / Memory)
- Command Palette
- ChatBubble (user / assistant, streaming caret)
- Agent Card (gradient icon, status pill, progress bar)
- Suggestion Pill

## Accessibility

- All interactive controls have visible focus rings (iris, 2 px outside).
- Colour contrast meets WCAG 2.1 AA for `fog-300` text on `ink-800/900`.
- All buttons have `aria-label` when icon-only.
- All shortcuts have screen-reader labels and are listed in Settings.
