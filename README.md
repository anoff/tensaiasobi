# tensaiasobi
give your kids something to do 

A modern, lightning-fast static web app designed for young children (ages 3-8). This project provides quick, educational, and fun mini-games perfect for short bursts of playtime, like waiting at a restaurant. 

**Live Demo:** [Insert GitHub Pages Link Here]

## 🎯 Project Goals
- **Instant Load & Performance:** Powered by Vite and React for snappy state transitions and rendering.
- **Progress Tracking:** Saves game settings and the child's streaks/milestones locally on the device using `localStorage`.
- **Kid-Friendly UX:** Mobile-first, massive tap targets, intuitive interactions, and strictly positive feedback loops (no "Game Over" screens).
- **Restaurant-Safe:** Muted by default. Relies on visual feedback (confetti, screen flashes, emojis) instead of sound effects.

## 🛠️ Tech Stack
- **Bundler & Tooling:** Vite (Fast, optimized production builds for GitHub Pages)
- **Frontend Framework:** React 18+ (Component-based architecture for game states)
- **Styling:** Tailwind CSS (For rapid, responsive layout development and heavy interactive feedback)
- **State Persistence:** Web Storage API (`localStorage`)
- **Hosting:** GitHub Pages

## 🕹️ The Games

The home screen sorts games into four colour-coded shelves. The 🧸 Preschool / 🎒 School switch hides games that don't fit the age, sets the starting level, and locks the level that doesn't fit. See [docs/game-review.md](docs/game-review.md) for the reasoning and ideas for new games.

**🔢 Numbers** (butter)
- **Math Pop 🎈**: add and subtract on a notebook sheet. Easy has fruit pictures and works within 5, medium within 10, hard within 20.
- **Croc Compare 🐊**: the crocodile eats the bigger side. Fruit groups, then numbers, then <, =, > on hard.
- **Number Train 🚂**: count the passengers, then tap the right station.
- **Fair Share Picnic 🧺**: share snacks equally (early division).
- **Balance ⚖️**: level the seesaw. Weights show dots on easy and medium. *(school)*

**🔤 Language** (coral)
- **Letter Pairs 🔠**: upper → lower case, then picture → its first letter, then letter → picture. Japanese: picture → first hiragana, hiragana → katakana, hiragana → romaji.
- **Letters ✏️**: trace letters (Latin, Hiragana, Katakana, Hangul).
- **Syllable Drum 🥁**: drum once per syllable (Gi-raf-fe = 3). Japanese counts morae.
- **First Sound 🔤**: find the starting letter. *(school)*
- **Missing Letter ✍️**: fill the gap in M_USE. *(school)*
- **Word Chain 🔗**: shiritori, matching the last letter to the next word's first letter. Easy and medium show the words. *(school)*

**🧠 Logic** (leaf)
- **Odd One 🧐**: pick the one that doesn't belong.
- **Pattern Train 🚃**: what wagon comes next? AB, then AAB/ABC, then a gap in the middle on hard.
- **Animal Genie 🧞**: think of an animal, the genie asks yes/no questions and guesses it. On easy and medium the animals that no longer fit fade out.
- **Match 🐯**: memory pairs.
- **Shadow 🔦**: identify a silhouette with a flashlight. *(preschool)*
- **Pearl Finder 🤿**: sort pearls into matching clams. *(preschool)*
- **Magic Puzzle 🧩**: interlocking SVG jigsaw.
- **Tower Sort 🗼**: stack matching emojis. *(school)*

**🎲 Just for fun** (chalk / pebble / coal). These unlock after a learn-first star goal.
- **Doodle Pad 🎨**, **Trace ⭐** *(preschool)*, **Mazes 🗺️**, **Emoji Match ⚡** (Time Attack or 2-player duel), **City Dispatch 🚒**
- **My Town 🏘️**: spend stars on a 6×6 sandbox.
- **Coupons 🎟️**: parent-approved real-world rewards.


## 🚀 Local Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/anoff/tensaiasobi.git](https://github.com/anoff/tensaiasobi.git)
   cd tensaiasobi

```
 2. **Install dependencies:**
   ```bash
   npm install
   
   ```
 3. **Run the development server:**
   ```bash
   npm run dev
   
   ```
 4. **Build for GitHub Pages:**
   ```bash
   npm run build
   npm run preview
   
   ```
## 🤝 Contributing
Feel free to fork this project and add your own mini-games using React components. Just keep the dependencies light and the UI chunky!
