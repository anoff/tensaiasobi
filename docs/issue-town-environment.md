# Feature Issue 2: Interactive Day/Night Cycle & Weather Toggle

## 1. Goal
Introduce an interactive environmental controller allowing kids to toggle the Town Builder between Day Mode, Night Mode, and Rain/Cloudy weather. This encourages imaginative play, changes visual moods dynamically, and integrates glowing atmospheric cues.

---

## 2. Proposed Changes & Implementation Strategy

### Step A: Define Environment State (`src/games/TownBuilder.tsx`)
Create reactive state controls in `TownBuilder.tsx` to handle the environment configuration:
```typescript
type DayPhase = 'day' | 'night';
type WeatherPhase = 'sunny' | 'rainy';

const [timePhase, setTimePhase] = useState<DayPhase>('day');
const [weatherPhase, setWeatherPhase] = useState<WeatherPhase>('sunny');
```
Save these settings in localStorage so their custom weather choice remains saved on the device.

### Step B: UI Controls Placement
In the upper corner of the Town Builder canvas, place safe, oversized buttons for children to click:
- **Time Toggle:** A giant Sun ☀️ / Moon 🌙 button (swaps between Day and Night).
- **Weather Toggle:** A giant Cloud with Rain 🌧️ / Rainbow 🌈 button (swaps between Rain and Sunshine).

### Step C: CSS Theme Application
Use Tailwind classes to morph the entire grid canvas when environmental phases shift:
- **Day Mode (Sunny):** Warm, pastel sky-blue gradients (`from-sky-100 to-amber-50`), green grid squares, bright ambient visibility.
- **Night Mode (Dark):** Deep indigo/navy sky gradients (`from-slate-900 via-indigo-950 to-slate-950`), navy grid squares.
  - Apply custom glowing status classes to light-giving items: Houses (`🏠`, `🏰`) and Lanterns (`🏮`) get an outer glow filter (`drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]`) indicating they have turned their lights on!
- **Rain Mode:** Render a delicate overlay of diagonal falling raindrops onto the screen canvas.
  - Animating raindrops utilizing a fast lightweight CSS animation or a canvas backdrop loop.
  - Trees (`🌳`) and Ponds (`💧`) gain subtle shaking or rippling animations.

---

## 3. UI/UX Details

- **Night Palette Transition:** Color shifts should feel calm, warm, and comforting—perfect for wind-down play sessions before bedtime.
- **Vibrant Interactive Soundscapes:**
  - Toggling Night plays a relaxed crickets sound.
  - Toggling Day plays a happy dawn bird chirp.
  - Toggling Rain triggers soft, calming rain droplet patterns.

---

## 4. Verification Plan

### Manual Test Steps
1. Navigate to the Town Builder. Verify the UI is initially in bright Day mode.
2. Tap the **Sun/Moon** button. Verify the background transitions to starry navy.
3. Place a **House** (`🏠`) and **Lantern** (`🏮`) on the grid during Night mode. Verify they emit a warm golden glow.
4. Tap the **Weather** button. Verify soft animated rain lines sweep across the town environment.
