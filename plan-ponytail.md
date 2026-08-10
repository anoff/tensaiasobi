# Plan: ponytail audit of tensaiasobi

Audit of over-engineering across the repo (11739 lines of src + config, docs, deps). Ranked biggest cut first.

- `shrink` Canvas boilerplate (rAF loop, resizeCanvas, spawnParticles) verbatim in 4 games. One `useCanvasLoop` hook + shared particle util. [src/games/MazeGame.tsx:230]
- `shrink` Trace-validation geometry (getDistanceToSegment, getOutlineSamples, pointer handlers) duplicated. One shared trace-validation module. [src/games/ShapeTrace.tsx:948]
- `shrink` {playPop;playSuccess;playError;onStarEarned?;challengeMode?} GameProps redeclared in all 13 games. One shared type. [src/games/MathGame.tsx:15]
- `shrink` Identical `<Confetti width height numberOfPieces recycle={false}/>` block in 13 files. One `<GameConfetti>` component. [src/games/MathGame.tsx:175]
- `shrink` Answer-bubble button JSX (selected states + 2 reflection divs) in 3 games. One `AnswerBubble` component. [src/games/MathGame.tsx:217]
- `shrink` Streak+highscore localStorage load/save/reset + trophy badge duplicated in 4 games. One `useStreak` hook. [src/games/MathGame.tsx:107]
- `delete` `react-router-dom` dep, imported nowhere (state-based screen switching). Remove from package.json. [package.json:24]
- `shrink` getSafeLocalStorage/setSafeLocalStorage copied verbatim in 2 games while `useLocalStorage` exists. Consolidate. [src/games/AnlautGame.tsx:24]
- `shrink` Hand-rolled `sort(()=>Math.random()-0.5)` shuffle in ~12 spots + custom Fisher-Yates. One `shuffle()` util. [src/games/MathGame.tsx:90]
- `shrink` Star-multiplier difficulty ladder repeated in 5 games + PuzzleGame/EmojiMatch variants. One helper. [src/games/MazeGame.tsx:555]
- `delete` PuzzleGame `initialLocked` (always all-false); `locked` state and `isSyncing` guard stay — both are live. [src/games/PuzzleGame.tsx:119]
- `yagni` EmojiMatch hand-rolls 5-language score labels in getPlayerScoreLabel while `useTranslation` exists. [src/games/EmojiMatch.tsx:176]
- `yagni` Fly-up animation machinery (StarEarnAnimation, animIdRef, pendingAnimations, clearAnimation) duplicated in useStars/useChallenge. One shared hook. [src/hooks/useStars.ts:22]
- `shrink` `challengeActive ? addChallengeStars(amt) : addStars(amt)` ternary inlined 12x in App.tsx. Hoist one handler. [src/App.tsx:117]
- `shrink` TownBuilder computes total refund with same double grid-loop twice. One `computeTotalRefund()`. [src/games/TownBuilder.tsx:181]
- `yagni` LetterTrace re-implements `key={language}` remount via prevLanguage state; App already keys Shiritori. [src/games/LetterTrace.tsx:586]
- `delete` OddOneOutProps declares `playPop`, never destructured/used. [src/games/OddOneOut.tsx:11]
- `delete` PhysicsPuzzleGame `void playError; void challengeMode;` dead props accepted "for consistency". [src/games/PhysicsPuzzleGame.tsx:69]
- `delete` `StarEarnEvent` type, defined, never used. [src/types/gamification.ts:42]
- `delete` stale `lint_errors.log` in scratch dir. [scratch/lint_errors.log]
- `delete` DispatchGame `Cell.row`/`Cell.col`, never read (only `decoration` renders). [src/games/DispatchGame.tsx:11]
- `stdlib` `Array.from({length}, ()=>null)` where `.fill()` does it. [src/games/PuzzleGame.tsx:129]
- `yagni` DifficultySelector maps `'baby'/'toddler'/'kid'` aliases no game ever passes. [src/components/DifficultySelector.tsx:20]
- `yagni` Shiritori startEmoji/initialOptions useMemo duplicates start-word pick that initGame recomputes. [src/games/Shiritori.tsx:251]

Net: -650 lines, -1 dep possible. Scope: over-engineering only; correctness/security/performance excluded.

## Implementation phases

Split into 6 dependency-ordered phases; each is independently shippable and ends with a green `npm run lint && npm run build` before moving on.

### Phase 1 — Dead code & dep removal (~60 lines, -1 dep)
- `delete` react-router-dom dep [package.json:24]
- `delete` StarEarnEvent type [types/gamification.ts:42]
- `delete` OddOneOut `playPop` prop [OddOneOut.tsx:11]
- `delete` PhysicsPuzzleGame `void playError; void challengeMode;` [PhysicsPuzzleGame.tsx:69]
- `delete` DispatchGame `Cell.row/col` [DispatchGame.tsx:11]
- `delete` PuzzleGame `initialLocked` [PuzzleGame.tsx:119]
- `delete` DifficultySelector `'baby'/'toddler'/'kid'` aliases [DifficultySelector.tsx:20]
- `delete` scratch/lint_errors.log
> Zero-risk wins first; removes files/logic that later refactors would otherwise have to touch. (Note: audit finding about a MazeGame `'expert'` branch was erroneous — no such branch exists.)

### Phase 2 — Leaf utilities (~130 lines)
- `shrink` one `shuffle()` util, adopt in 8 games [MathGame.tsx:90]
- `shrink` consolidate `getSafeLocalStorage` -> `useLocalStorage` [AnlautGame.tsx:24]
- `shrink` `starMultiplier()` helper, adopt in 5 games [MazeGame.tsx:555]
- `shrink` `useStreak()` hook + badge, adopt in 4 games [MathGame.tsx:107]
> Independent helpers; each adoptable game-by-game, so risk stays low. (Note: the `getGridSize` dedupe finding was dropped — MazeGame returns `{cols,rows}` 4/6/8, DispatchGame returns a bare number 5/7/9; different shape and constants, not deduplicable without changing behavior.)

### Phase 3 — Shared game types & components (~210 lines)
- `shrink` shared `GameProps` type, adopt in all 13 games [MathGame.tsx:15]
- `shrink` `<GameConfetti>`, adopt in 12 games + App [MathGame.tsx:175]
- `shrink` `AnswerBubble`, adopt in MathGame/AnlautGame/Shiritori [MathGame.tsx:217]
> Builds on nothing new; the biggest single-repo reduction of copy-paste.
> DONE. `GameProps` added to types/game.ts; 11 games use it directly, OddOneOut/PhysicsPuzzleGame via `Omit`. `GameConfetti` takes `pieces`/`recycle` (App's celebration overlay is the only `recycle` user). `AnswerBubble` folds the default/emerald/red color chain + 2 reflection divs; per-game text classes passed via `className` (Shiritori keeps its `data-word`/`data-emoji` attrs for e2e). Deviations: Shiritori's default shadow 0.25 alpha → 0.3, reflection offsets unified; both imperceptible.

### Phase 4 — Canvas & trace module (~230 lines, the largest cut)
- `shrink` `useCanvasLoop` + shared particle utils, adopt in MazeGame/ShapeTrace/LetterTrace/DoodlePad [MazeGame.tsx:230]
- `shrink` shared trace-validation module (geometry + pointer handlers), adopt in ShapeTrace/LetterTrace [ShapeTrace.tsx:948]
> Touches the same 3 files, so doing both while the canvas refactor is fresh avoids touching them twice.
> DONE. `useCanvasLoop` (rAF + container-square resize + cleanup) adopted in the 3 loop games. `utils/particles.ts` (Particle, spawnParticles, drawParticles) replaces 3 copies. `utils/traceGeometry.ts` (getPixelCoord, getDistanceToPath, getPathSamples, getDistanceToSegment, parameterized getMarginSize) replaces the byte-identical geometry in both trace games. Deviations/notes: DoodlePad dropped (no rAF loop/particles — event-driven free-draw); validation *orchestration* (accuracy/completion thresholds, Check-button vs pointer-up, LetterTrace start-gate) kept per-game — parameterizing it would add more knobs than lines saved. Particle constants unified to MazeGame's (trace games were slightly smaller/slower; cosmetic).

### Phase 5 — Game-specific cleanups (~70 lines)
- `shrink` hoist `onStarEarned` ternary in App.tsx [App.tsx:117]
- `shrink` `computeTotalRefund()` in TownBuilder [TownBuilder.tsx:181]
- `yagni` drop Shiritori `startEmoji`/`initialOptions` useMemo [Shiritori.tsx:251]
- `yagni` replace LetterTrace `prevLanguage` with `key={language}` [LetterTrace.tsx:586]
- `yagni` move EmojiMatch `getPlayerScoreLabel` strings into locales [EmojiMatch.tsx:176]
> One-off polish per file; independent of Phases 2-4.
> DONE. `handleStarEarned` hoisted, 13 sites + TowerSort's swallowed `challengeMode={challengeActive}` dropped. TownBuilder `computeTotalRefund(grid)` shared by both delete-all loops (single-cell refunds left inline). Shiritori: two useMemos → one lazy `seed` state (getStartWord still called once, chain/options stay consistent). LetterTrace: `key={language}` in App, prevLanguage block deleted — tradeoff: en↔fr mid-letter progress no longer retained, but per-script reset on language switch matches Shiritori. EmojiMatch: `playerScore` locale key added to all 5 files; `{count}` placeholder matches the `{word}`/`{count}` convention.

### Phase 6 — Animation state consolidation (~40 lines)
- `yagni` merge fly-up machinery (StarEarnAnimation, animIdRef, pendingAnimations) into one shared hook for useStars + useChallenge [useStars.ts:22]
> Touches only the two hooks + their consumers (StarCounter, App). Saved for last since it's isolated from game files.
