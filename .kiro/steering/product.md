# Product: Toby

Toby is a client-side chess game review application. Users import chess games (via PGN paste, Chess.com, or Lichess), analyze them move-by-move using Stockfish WASM running in the browser, and receive a comprehensive review including move classifications, accuracy scores, an evaluation graph, and a game summary.

Key characteristics:
- No backend or user accounts — all computation happens locally in the browser
- Stockfish engine runs in a Web Worker (WASM) to keep the UI responsive
- Supports Chess.com and Lichess public APIs for game imports
- Move classification based on win-percentage loss thresholds
- Architecture follows a pipeline: import → parse → analyze → classify → present
