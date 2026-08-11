---
name: game-ideas
description: 'Brainstorm and evaluate new kids game ideas for this app. Use when: proposing a new mini-game; checking if a game concept fits the repo style; designing educational games that teach a skill (math, language, phonics, logic, spatial reasoning, memory, motor skills); evaluating difficulty scaling, multilingual support, or touch-first UI for a game idea. Produces a structured game proposal with learning objective, mechanic, difficulty tiers, star reward, and implementation notes.'
argument-hint: 'Describe the game concept or learning goal (e.g. "counting game for 3-year-olds" or "teach Japanese hiragana")'
---

# Game Ideas — Brainstorm & Evaluation

This skill helps propose and evaluate new mini-games that fit the `tensaiasobi` kids app: mobile-first, touch-optimized, multilingual, with star-based rewards.

## Repo Context (Always Check)

- **Existing games**: MathGame, OddOneOut, DoodlePad, MemoryMatch, MazeGame, ShapeTrace, LetterTrace, AnlautGame, EmojiMatch, Shiritori, PuzzleGame, DispatchGame, PhysicsPuzzleGame, TowerSort, TownBuilder
- **Game interface**: `GameProps { playPop, playSuccess, playError, onStarEarned?, challengeMode? }`
- **Difficulty**: `'easy' | 'medium' | 'hard'` — each game defines its own generator
- **Shared UI**: `GameConfetti`, `DifficultySelector`, `AnswerBubble`, `StreakBadge`
- **Locales**: `en`, `de`, `ja`, `ko`, `fr` — all user-facing strings must go through `useTranslation`
- **Touch-first**: use `onTouchStart`/`onTouchMove`; no mouse-only interactions
- **Target age**: roughly 3–8 years; chunky targets (min 96px), simple rules
- **Reward**: star amount via `starMultiplier(difficulty)`, call `onStarEarned`

## Procedure

### 1. Understand the Request

Identify from the user's prompt:
- **Learning goal**: what skill or concept should the child practice?
- **Age range**: 3–4 (pre-reader, motor), 4–6 (phonics, counting), 6–8 (logic, reading, arithmetic)
- **Inspiration source** (if any): existing games, real-world toys, school exercises

### 2. Check for Overlap

Compare with [existing games above](#repo-context-always-check). Ask: does a close variant already exist? If so, name it and propose how the new game meaningfully differentiates.

### 3. Draft the Game Proposal

Output a structured proposal using the template in [./references/proposal-template.md](./references/proposal-template.md).

Key sections to fill:
- **Concept** — one-sentence pitch
- **Learning objective** — concrete skill trained (e.g. "phonemic awareness: matching initial consonant sounds")
- **Core mechanic** — what the player does (tap, drag, trace, sort, match…)
- **Difficulty tiers** — how easy/medium/hard differ
- **Multilingual notes** — any locale-specific content needed (e.g. hiragana for `ja`)
- **Star reward** — justify the difficulty multiplier (1× easy, 2× medium, 3× hard)
- **Implementation sketch** — React component shape, key state, canvas vs DOM

### 4. Evaluate Fit

Score the proposal against the app's design principles:

| Criterion | Questions to ask |
|-----------|-----------------|
| Touch-first | Can the whole mechanic be done with one finger on a small screen? |
| Age-appropriate | Is the rule explainable with no text (icons/emoji only for younger ages)? |
| Fast session | Can a round complete in < 60 seconds? |
| Educational clarity | Is the skill being trained obvious, not incidental? |
| Fun factor | Is there a satisfying "aha" moment or physical delight (drag, shake, pop)? |
| Freshness | Does it avoid duplicating an existing game's core loop? |

Flag any criterion that scores weak and propose a fix.

### 5. Suggest Variants / Extensions

List 1–3 quick variants or future extensions (e.g. "add timer for challenge mode", "use locale-specific vocabulary for `ja`").

### 6. Decide: Proceed to Spec?

If the idea passes evaluation, offer to:
- Load the `spec` skill to write a full feature specification
- Load the `coding` skill to scaffold the component
- Load the `ui` skill to design the visual layout

## Educational Skill Categories

Use these categories when describing what a game teaches:

| Category | Examples |
|----------|---------|
| **Numeracy** | counting, addition, subtraction, number recognition, ordering |
| **Phonics / Literacy** | initial sounds (Anlaut), letter recognition, rhyming, word building |
| **Logic** | sorting, classification, odd-one-out, sequencing, pattern recognition |
| **Spatial / Motor** | tracing, drawing, mazes, shape matching, jigsaw |
| **Memory** | card matching, sequence recall, visual attention |
| **Language** | vocabulary, word chaining (Shiritori), reading |
| **Physics / Cause-Effect** | balance, gravity, dispatch routing |
| **Creativity** | free drawing, town building |

## Good Game Idea Signals

- The child does the *same core action* many times with increasing variety (not a story they watch)
- Failure feedback is immediate and forgiving (shake + try again, no dead ends)
- Correct feedback is satisfying (pop, confetti, star flies up)
- Content is emoji- or image-driven so it works across all 5 locales with minimal translation
- Rule is demonstrable by watching one round

## Red Flags

- Requires reading to understand the rules (for age < 6)
- Core loop needs a keyboard
- Only fun once (no replayability from randomized content)
- Too close to an existing game without clear differentiation
