# Backlog — after Slice A

Residual work from the takeover review. **Slice A is done** (game catalog, wipe-via-catalog, sound default off, reduced motion, parent-chrome a11y, Capacitor back, Vitest). Do not re-litigate those.

When picking this up, start at the top of the next slice. Product beats engineering hygiene; hygiene beats art.

---

## Slice B — parent controls that match real use

- [x] **Age-band menu filter.** Parent setting (little / big, or 3–5 / 6–8) that hides launchers. A three-year-old should not land on Shiritori and City Dispatch next to Doodle. Add an `ageBand` (or similar) field on `src/games/catalog.ts` so this does not become a fifth drifted list.
- [x] **Session timer.** Parent picks “10 quiet minutes, then menu / lock.” Restaurant use case. Optional overlay when time is up; does not replace challenge-for-coupon, it sits beside it.
- [x] **Custom coupons, free.** Parents can add/edit real-world rewards (“15 extra minutes at the playground”) and star costs in the parent cabin. Do not gate this on premium.

## Slice C — family on one phone

- [ ] **Multi-child profiles.** Names, independent stars / streaks / town / coupons. Two siblings sharing a device is a real-family bug today (`localStorage` is one blob). This is the change that may finally justify a small store; do not add Zustand before this.
- [ ] **Save schema version + migrations.** Version the persisted blob so profile split and future keys do not require another hardcoded wipe list. Build on `clearPersistedProgress()` in `src/games/catalog.ts`.

## Slice D — native parent gate

- [x] **Face ID / device passcode first, math as fallback.** Spec already lives in [issue-parent-gate-biometrics.md](./issue-parent-gate-biometrics.md). Do not make algebra the primary UX; keep the equation for web / failed biometrics.

## Slice E — engineering hygiene

- [x] **`GameFX` context.** Stop drilling `playPop` / `playSuccess` / `playError` / `onStarEarned` / `challengeMode` into every game. Catalog render in `App.tsx` is the seam.
- [x] **Split logic out of huge game files.** Pure generators + unit tests, same pattern as `fruitMathPopLogic.ts` / `fairSharePicnic.ts`. Priority: `LetterTrace.tsx`, `ShapeTrace.tsx`, `Shiritori.tsx`, `PuzzleGame.tsx` (all 600–1000 lines).

## Slice F — art direction (gradual)

- [ ] **SVG for signature surfaces.** Emoji stays the iteration language. Menu launchers stay emoji — custom candy SVGs looked worse and sat off-center. Puzzle art in `public/puzzles/` is the existing SVG path to build on, not the home grid.

## Already-specced town follow-ups (optional, after B–C)

- [ ] Town day/night + weather — [issue-town-environment.md](./issue-town-environment.md)
- [ ] Town juice / feel — [issue-town-juice.md](./issue-town-juice.md)
- [ ] Town milestones — [issue-town-milestones.md](./issue-town-milestones.md)

---

## Explicitly do not do

These were considered and rejected or deferred hard:

- **Do not lock games behind freemium.** The catalog is the product. If monetization happens, sell parent features (profiles, custom coupons, extra town packs), never hide Shiritori. Ignore the “hide premium games” split in [freemium.md](./freemium.md) / [issue-freemium.md](./issue-freemium.md).
- **No RevenueCat / IAP** until B and C exist.
- **No React Router.** Hardware back is enough.
- **No i18next.** Five parallel locale objects with `TranslationSchema` are the right weight.
- **No Zustand** until multi-profile forces a real store.
- **No full WCAG audit of every mini-game** as a slice. Parent chrome + reduced motion landed in Slice A; in-game emoji labels are opportunistic.

---

## Slice A (done) — do not redo

Catalog, challenge/parent-dashboard/wipe derived from it, sound default off, idle pulse removed, `prefers-reduced-motion`, `<html lang>`, parent-gate dialog, Capacitor back, Vitest for existing generators.
