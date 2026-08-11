# 🚀 TensaiAsobi: Freemium & Monetization Strategy

This document outlines the marketing, pricing, and compliance strategy for monetizing the application using a family-centric, safe, and intuitive **Freemium Model** across our target global markets: Japan, Germany, South Korea, and English-speaking countries.

---

## 1. Core Monetization Philosophy

To ensure the app remains child-friendly, uncluttered, and compliant with app store rules for kids, we avoid invasive ads, aggressive upsell dialogs, or multiple microtransactions.

Instead, we employ a dual-option monetization strategy offered exclusively within the Parent Cabin:
1.  **Monthly Premium Pass:** Low-threshold recurring subscription with a 3-day free trial (credit card upfront natively via App Store, or a direct serverless sandbox trial).
2.  **Lifetime Pass (Lifetime Premium Pass):** A single-tier one-time purchase with no recurring fees.

*   **Safety & Trust:** Children should never see paywalls or buy triggers. All monetization touchpoints occur inside the Parent Dashboard behind a localized Math Gate.
*   **High Initial Utility:** The app must be highly functional and enjoyable in its free configuration to earn brand loyalty before asking for an upgrade.

---

## 2. Freemium Value Partitioning (Free vs. Premium)

| Category | Free Tier | Premium Tier |
| :--- | :--- | :--- |
| **All-Access Games** | Full unlimited access to 5 foundational games: <br>• Math Game<br>• Emoji Match<br>• Animal Memory Match<br>• Odd One Out<br>• Magic Doodle Pad | Unlimited access to all 12+ games, including advanced logic and language games:<br>• Shiritori (Japanese word chain)<br>• Puzzle Game / physics puzzles<br>• Dispatch Game<br>• Letter/Shape Trace |
| **Puzzles & Levels** | Access to Level 1 / basic configurations of all games (e.g., standard grids or layouts). | Access to hard modes, complex shapes (silhouettes), time-attack modes, and custom presets. |
| **Town Builder / Shop** | Full basic gameplay loop. Earn stars and buy town items/decorations. | Premium town decorations, special sound effects, and secret item categories. |
| **Profiles & Sync** | Single child profile on the active device. | **Multi-Profile Support:** Custom names, independent star/streak counts, and personalized avatars for up to 4 children. |
| **Parent Vouchers** | Default vouchers (e.g., gummy bears, movie night) with standard costs. | **Dynamic Custom Vouchers:** Create custom real-world rewards (e.g., "15 minutes extra playground time") and modify star costs. |

---

## 3. Targeted Regional Pricing Matrix (Monthly Subscription vs. Lifetime Purchase)

We target an accessible monthly pricing model paired with a high-value one-time purchase sweet spot under **$10 USD (or local currency equivalent)** to ensure both options remain friction-free impulse choices for parents.

| Country / Region | Monthly Subscription Price | One-Time Lifetime Pass Price | Country Context & Messaging Focus |
| :--- | :--- | :--- | :--- |
| **United States / English** | **$1.49 USD** | **$9.99 USD** | **Core Focus:** Fun learning, Screen-time safety, Parent-approved gamification, Multi-device Family Sharing. |
| **Germany / Eurozone** | **€1.49 EUR** | **€9.99 EUR** | **Core Focus:** Offline-first gameplay (Data-Privacy/GDPR compliant), Zero tracking, No hidden costs. |
| **Japan**| **¥200 JPY** | **¥1,500 JPY** | **Core Focus:** Native educational utility (Shiritori/Trace), cognitive development, high-tier safe screen aesthetics. |
| **South Korea** | **₩2,000 KRW** | **₩15,000 KRW** | **Core Focus:** High educational utility, cognitive and fine-motor coordination metrics, creative logic builder. |

---

## 4. Localized Up-Sell Marketing Angles

When marketing the **Monthly Subscription** and the **Lifetime Pass** in the Parent Dashboard, we frame the purchase focusing on the unique values resonant in each locale:

### 🇩🇪 Germany: The Privacy & Trust Angle
> **"Voller Zugriff ab 1,49 €/Monat oder einmalig zahlen für immer – komplett offline und ohne Daten-Tracking."**
> *Highlight:* 100% kid-safe, no hidden costs, works perfectly in the car/on airplanes without internet connection. Strictly privacy-first.

### 🇯🇵 Japan: The Educational & Independence Angle
> **"月額200円または買い切り1,500円でお子様の成長に合わせた、広告なしの知育プレイ空間。"**
> *Highlight:* Premium access releases full Shiritori spelling paths, structured letter-tracing guidelines, and advanced spatial math games. Encourages self-guided logical development.

### 🇰🇷 South Korea: The Cognitive Strategy Angle
> **"월 2,000원 또는 평생 소장 15,000원으로 즐기는 안전한 창의력 놀이터."**
> *Highlight:* Strengthens cognitive skills, creative construction in the Town Builder, and fine-motor handwriting accuracy with premium templates.

### 🇺🇸 English-Speaking: The Screen-Time Value Angle
> **"Unlock everything for $1.49/mo or $9.99 lifetime. Zero ads, total safety."**
> *Highlight:* Complete access to every trace template, multi-child profiles, unlimited custom family rewards, and offline capability.

---

## 5. Technical Implementation Blueprint (iOS & Web)

1.  **State Schema (`isPremium`)**:
    Add `isPremium` to the primary state manager inside [src/App.tsx](src/App.tsx) and expose it globally via a shared React Context or passing down props. Save state locally via `useLocalStorage` so the setting persists offline.
2.  **Parental Protection Gates**:
    Maintain premium purchase triggers strictly beneath [src/components/ParentGate.tsx](src/components/ParentGate.tsx). Children should never be presented with purchasing overlays or loading spinners.
3.  **Local Dynamic Flag Locking**:
    When rendering game nodes on the homepage menu grid or specific puzzle matrices, query the local context:
    ```typescript
    const isAvailable = isFreeGame || isPremium;
    ```
    If not available, overlay a subtle lock symbol indicating to parents (in the dashboard) that it is a Premium-exclusive feature.
