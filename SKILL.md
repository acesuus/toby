---
name: chess-app-design
description: Visual identity and UI/UX guidance for the chess game review app. Use whenever building or revising any screen, component, or the mascot character — covers color tokens, typography, layout, board theming, and the quality bar to hold every screen to.
---

# Chess App Design

## North star

Match Chess.com's *information discipline* — how confidently it prioritizes the board, then the eval/move data, then everything else — but drop its corporate-utilitarian skin. The reference feeling is a well-loved wooden game table at a cafe, not a SaaS dashboard: warm, tactile, unhurried, with a mascot that has an actual personality living in the room. Minimalist means restraint (one strong accent, generous whitespace, quiet chrome). Cozy means warmth (off-white instead of stark white, soft shadows tinted brown instead of black, a mascot that shows up at the right emotional beats instead of decorating every screen).

Avoid the current AI-generated-design tell: warm cream (#F4F1EA) paired with a terracotta accent (#D97757). It's the single most overused "cozy" combo right now. The palette below is deliberately shifted away from it — hold that line when extending it.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#EDE6D8` (Linen) | App background — warm, muted, more oat-fabric than glossy cream |
| `--surface` | `#F7F2E7` (Parchment) | Cards, panels — one step lighter than bg for gentle lift |
| `--ink` | `#2E2620` (Espresso) | Primary text — warm near-black, never pure black |
| `--ink-muted` | `#6B5F52` (Ash Umber) | Secondary text, labels, captions |
| `--accent` | `#5C6E51` (Moss) | Primary accent — a desaturated forest green, a quiet nod to the board felt without copying anyone's brand green |
| `--accent-warm` | `#C1793B` (Ember) | Secondary accent — used sparingly: mascot, CTAs, streaks/badges. Warmer and more ochre than the terracotta cliché above |
| `--good` | `#8FA772` (Sprout) | Best/excellent move tags |
| `--caution` | `#C1793B` (Ember) | Inaccuracy/mistake tags |
| `--danger` | `#A8422F` (Brick) | Blunder tags — muted brick, not a harsh pure red |

Dark mode: invert to `--bg: #211B16` (Walnut), `--surface: #2B241D`, text becomes Parchment, accents brighten ~8–10% for contrast. Don't just flip to gray — keep everything warm in both modes.

## Typography

- **Display** (headlines, section titles, the mascot's speech): a warm serif with some character at large sizes — Fraunces or Lora. Used with restraint: headlines and callouts only, never body copy.
- **Body/UI** (labels, buttons, paragraphs): a clean humanist sans — Inter or Source Sans 3. This carries almost all the interface.
- **Notation/data** (move lists, PGN, eval numbers, coordinates): a monospace — JetBrains Mono. This is where the app gets to feel precise and serious even inside a cozy shell; don't soften this face.

## Layout & the board

- Generous whitespace over dense packing. When in doubt, add margin before adding a border.
- Cards: 12–16px radius, soft shadows tinted with `--ink` at low opacity (e.g. `rgba(46,38,32,0.08)`), never a flat black shadow.
- Three-tier hierarchy on every review screen, in priority order: **board** (largest, always visible) → **move list / eval graph** (secondary, scrollable) → **summary/stats cards** (tertiary, below the fold on mobile). Never let these compete for attention at once.
- Board theme: warm wood, not chess.com green or Lichess blue. Light square `#F2E6D3`, dark square `#6B4A38` — a real wooden-board pairing that ties the 64 squares back into the rest of the palette instead of sitting apart from it as a generic green/tan insert.
- Keep the board itself quiet. All the cozy personality (mascot, warm accents, serif headlines) lives in the chrome *around* the board — the 64 squares stay clean and legible, same as a serious analysis tool should.

## Mascot

The mascot is the emotional register of the app — it shows up at specific beats, not as ambient decoration:

- **Game review complete** — reacts to the result (a celebratory pose for a high-accuracy game, a wry/sympathetic one after a rough one).
- **Coach callouts** — a small inline avatar (24–32px) next to the AI coach's text, so its voice has a face.
- **Empty states** — a larger pose (120–200px) inviting the first action ("paste a game to get started"), doing the job a generic empty-state illustration usually does.
- **Milestones/streaks** — puzzle streaks, accuracy PRs, etc.

Rules: never place it on top of the board or move list — it lives in summary cards, the coach panel, and empty states. Give it 4–6 core poses (neutral/greeting, celebrating, concerned, thinking, idle/sleeping) rather than one static image reused everywhere; a mascot that never changes expression reads as a logo, not a character. Voice matches `--accent-warm`: encouraging but honest — it doesn't sugarcoat a blunder, it frames it as fixable.

This skill assumes the mascot's actual character design (species, silhouette, etc.) is decided separately — happy to help brainstorm concepts once you're ready to lock that in.

## Motion

Purposeful, not decorative: move highlights animate in (~150ms), the eval bar transitions smoothly rather than jumping, move-list rows get a subtle hover state. No page-load flourishes, no ambient background motion — the coziness comes from color and shadow, not animation.

## Quality bar, borrowed from Chess.com

- Color *and* icon for move classifications, never color alone (accessibility).
- Every interactive row/card has a visible hover and active state.
- Board stays fixed and prioritized on mobile; side panels stack below or slide in rather than shrinking the board.
- Visible keyboard focus states throughout, reduced motion respected.
