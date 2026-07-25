# Project Structure

```
toby/
├── app/                    # Next.js App Router pages and layouts
│   ├── layout.tsx          # Root layout (fonts, global styles)
│   ├── page.tsx            # Landing/import page
│   ├── globals.css         # Tailwind import + CSS custom properties
│   └── review/             # (planned) Game review page
│       └── page.tsx
├── lib/                    # (planned) Core logic modules
│   ├── fetcher.ts          # Chess.com / Lichess API client
│   ├── pgn-parser.ts       # PGN parsing
│   ├── stockfish/          # Stockfish engine integration
│   │   ├── engine.ts       # StockfishEngine class
│   │   └── worker.ts       # Web Worker entry point
│   ├── classifier.ts       # Move classification
│   ├── accuracy.ts         # Accuracy scoring
│   ├── win-percent.ts      # Centipawn → win% conversion
│   └── types.ts            # Shared TypeScript interfaces
├── components/             # (planned) React UI components
│   ├── Board.tsx           # Interactive chessboard
│   ├── MoveList.tsx        # Move list with grades
│   ├── EvalGraph.tsx       # Evaluation chart
│   ├── GameSummary.tsx     # Accuracy + stats panel
│   ├── ImportPanel.tsx     # PGN input / API fetch UI
│   ├── AnalysisProgress.tsx # Progress bar
│   └── GameSelector.tsx    # Game list from APIs
├── public/                 # Static assets
│   └── stockfish/          # (planned) WASM binary
├── .kiro/                  # Kiro specs and steering
│   ├── specs/              # Feature specifications
│   └── steering/           # Project conventions
├── next.config.ts          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
├── postcss.config.mjs      # PostCSS (Tailwind) config
├── eslint.config.mjs       # ESLint flat config
└── package.json            # Dependencies and scripts
```

## Conventions
- Pages live in `app/` following Next.js App Router conventions (file-based routing)
- Shared logic goes in `lib/` — pure functions and classes, no React dependencies
- Reusable UI components go in `components/` — React components with Tailwind styling
- Heavy computation (Stockfish) runs in Web Workers, never on the main thread
- Types shared across modules live in `lib/types.ts`
- Static assets (WASM binaries, SVGs) go in `public/`
