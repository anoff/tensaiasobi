# Game Proposal Template

Copy and fill in all sections.

---

## [Game Name]

**Emoji**: (pick one that represents the game at a glance)
**Screen ID**: `(camelCase, e.g. countingBubbles)`
**Age target**: (e.g. 4–6 years)
**Learning category**: (see skill categories table)

---

### Concept

> One sentence: what does the player do, and what do they learn?

---

### Learning Objective

Concrete skill trained:
> e.g. "Phonemic awareness: the child identifies which word starts with the spoken sound."

---

### Core Mechanic

What the player physically does:
- Input type: `tap` / `drag` / `trace` / `swipe` / `tilt`
- Action: (describe the interaction in one sentence)
- Feedback loop: correct → (describe) | wrong → (describe)

---

### Difficulty Tiers

| Tier | Content / Rules change |
|------|----------------------|
| Easy | |
| Medium | |
| Hard | |

---

### Multilingual Notes

- `en`: 
- `de`: 
- `ja`: 
- `ko`: 
- `fr`: 
- Locale-specific content needed? Yes / No — explain if yes

---

### Star Reward

- Easy: 1 star
- Medium: 2 stars  
- Hard: 3 stars
- Justification for any deviation:

---

### Implementation Sketch

```tsx
// Props: standard GameProps
// Key state:
//   - question: { ... }
//   - options: string[]
//   - phase: 'playing' | 'success' | 'fail'
// Content generator: generateRound(difficulty: GameDifficulty)
// Canvas needed? Yes / No
// External assets? (list any files needed under public/)
```

---

### Fit Evaluation

| Criterion | Pass / Weak / Fail | Notes |
|-----------|-------------------|-------|
| Touch-first | | |
| Age-appropriate | | |
| Fast session (< 60s) | | |
| Educational clarity | | |
| Fun factor | | |
| Freshness | | |

---

### Variants / Extensions

1. 
2. 
3. 
