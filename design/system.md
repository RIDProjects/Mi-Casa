# Design system — Mi Casa Pro (synced from source)

Sources read: `finanzas-app/frontend/src/styles/globals.css`, `finanzas-app/frontend/tailwind.config.js`, `finanzas-app/mobile/src/theme/tokens.ts`. Light theme values below; the dark theme overrides the same `--ds-*` variables in globals.css.

## Colors (light)
| Token | Value | Usage | Source |
| --- | --- | --- | --- |
| surface | #f9f9ff | page background | globals.css `--ds-surface` |
| panel / surface-lowest | #ffffff | cards, inputs | globals.css `--ds-panel` |
| surface-low | #f0f3ff | hover, subtle blocks | globals.css `--ds-surface-low` |
| surface-container | #e7eeff | chips, tracks | globals.css `--ds-surface-container` |
| surface-gray | #f8fafc | table header rows | globals.css `--ds-surface-gray` |
| border-light | #e2e8f0 | card borders | globals.css `--ds-border-light` |
| outline-variant | #c3c6d7 | input borders | globals.css `--ds-outline-variant` |
| on-surface | #111c2d | primary text | globals.css `--ds-on-surface` |
| on-surface-variant | #434655 | secondary text | globals.css `--ds-on-surface-variant` |
| outline | #737686 | muted text | globals.css `--ds-outline` |
| primary | #004ac6 (button #2563eb, hover #1d4ed8) | actions | globals.css, tailwind.config.js |
| ok-ink | #15803d | positive text | globals.css `--ds-ok-ink` |
| warn-ink | #b45309 | warning text | globals.css `--ds-warn-ink` |
| danger-ink | #b91c1c | error / exceeded text | globals.css `--ds-danger-ink` |
| warning | #d97706 | warning fills (used at 10–20 % alpha) | tailwind.config.js |
| danger | #dc2626 | destructive fills | tailwind.config.js |
| success | #16a34a | progress fill within budget | tailwind.config.js |

## Typography
Inter (sans), Work Sans (titles), JetBrains Mono (labels). Scale: page-title 32/1.2 800, section-title 15/1.4 700, body 14/1.6, card-title 13 700, body-small 12, caption 11.5, label-upper 10 700 uppercase 0.05em. Source: tailwind.config.js `fontSize`.

## Spacing, radius, shadow
card-padding 18px, gutter 20px; radius card 12px, interactive 10px, input 8px; shadow-sm `0 1px 2px rgba(16,24,40,.05)`, shadow-md `0 1px 3px rgba(16,24,40,.06), 0 6px 16px -4px rgba(16,24,40,.08)`; focus ring `0 0 0 3px rgba(37,99,235,.18)`. Source: globals.css, tailwind.config.js.

## Components
- **Card**: panel fill, 1px border-light, radius 12, shadow-sm.
- **btn-primary**: #2563eb, white text, radius 10, 1px #1d4ed8 border. **btn-secondary**: white, 1px outline-variant.
- **Input**: min-height 40, 1px outline-variant, radius 8; focus border #2563eb + ring.
- **Label**: 11px, 600, 0.04em tracking, uppercase.
- **Table header**: surface-gray background, label-upper text.
