# Tech Stack

## Framework & Runtime
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript 5** (strict mode enabled)

## Styling
- **Tailwind CSS 4** via `@tailwindcss/postcss`
- Utility-first approach, no component library
- Custom CSS variables for theming (light/dark via `prefers-color-scheme`)
- Fonts: Geist Sans and Geist Mono loaded via `next/font/google`

## Linting
- **ESLint 9** with flat config (`eslint.config.mjs`)
- Uses `eslint-config-next` (core-web-vitals + TypeScript rules)

## Key Libraries (planned)
- `chess.js` — move validation and board logic
- `stockfish.js` / `stockfish.wasm` — engine analysis in Web Worker
- `chessground` or `react-chessboard` — interactive board rendering
- `fast-check` — property-based testing (dev dependency)

## Path Aliases
- `@/*` maps to project root (configured in tsconfig.json)

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
