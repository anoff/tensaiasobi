# plan-ios.md — tensaiasobi iOS Distribution (Capacitor 8)

## Goal
Ship the existing Vite + React + Tailwind webapp as a native iOS application via
App Store + TestFlight, keeping the web codebase as the single source of truth.

## Framework decision (2026)
**Capacitor 8 (Ionic)** — wraps the existing webapp in a native WKWebView shell and
produces a real Xcode project / `.ipa`. Chosen over Expo/React Native (would require
rewriting all 13 games) and Tauri 2 Mobile (younger iOS support, same WebView ceiling).
The app is already mobile-first (`100dvh`, `overscroll-contain`, state-based screen
switching in `src/App.tsx`, no router), `localStorage`-based persistence, and all games
are canvas/SVG/CSS which run at full speed in WKWebView.

## Prerequisites
- macOS with Xcode (latest stable)
- Apple Developer Program membership ($99/yr)
- Apple ID enabled for App Store Connect + TestFlight
- Node 20+ (already satisfied)

## Phase 1 — Add Capacitor shell
1. Install deps:
   - `npm i @capacitor/core @capacitor/cli @capacitor/ios`
   - `npm i @capacitor/app @capacitor/status-bar`
   - `npm i -D @capacitor/assets`
2. Init: `npx cap init "tensaiasobi" com.tensaiasobi.app --web-dir=dist`
3. `npx cap add ios`
4. Create `capacitor.config.ts`:
   - `webDir: 'dist'`, `appId: 'com.tensaiasobi.app'`, `appName: 'tensaiasobi'`
   - `backgroundColor` / statusBar color matching `#f0f9ff`
   - enable `@capacitor/app` back handling

## Phase 2 — Web app adjustments (existing files)
5. `vite.config.ts:50` → set `base: './'` so asset URLs resolve inside `capacitor://localhost`.
6. `index.html` → add `viewport-fit=cover` to the viewport meta tag.
7. `src/index.css` → add safe-area utilities using `env(safe-area-inset-*)`.
8. `src/App.tsx:271` → apply safe-area padding to header/main; disable
   overscroll bounce, double-tap zoom, long-press callout, and text selection in games.
9. Verify `localStorage` keys (streaks, stars, town, vouchers) persist in WKWebView (no change expected).

## Phase 3 — Native polish
10. Create a 1024×1024 source icon (required by `@capacitor/assets`).
11. `npx @capacitor/assets generate --ios` → generate icons + splash screens from
    `public/pwa-512.png` / `maskable-icon.png`.
12. Confirm status bar styling; keep existing `useWakeLock` (`src/App.tsx:659`).

## Phase 4 — Build & sign on Mac
13. `npm run build` then `npx cap sync ios`.
14. `npx cap open ios`; in Xcode set:
    - unique Bundle ID (register `com.tensaiasobi.app` in the Developer portal)
    - Team (signing, automatic)
    - Deployment Target iOS 15+
15. Archive: `Product → Archive`, upload via TestFlight for internal testing.

## Phase 4.5 — Local testing without the App Store
Three tiers, none require App Store review. Start with Tier 1, validate with Tier 2.

**Tier 1 — iOS Simulator (no account needed)**
```
npm run build && npx cap sync ios
npx cap run ios      # builds + launches in Simulator
```
Or `npx cap open ios` → Run (⌘R). Fastest iteration loop for layout, safe-areas, and games.

**Tier 2 — Real iPhone with a free Apple ID (no $99/yr)**
1. Plug the iPhone into the Mac and trust the computer.
2. Xcode → Preferences → Accounts → add your Apple ID.
3. `npx cap run ios --device` (or run from Xcode and select your iPhone).
4. On the iPhone: Settings → General → VPN & Device Management → trust your developer certificate.
- Caveats: provisioning expires after **7 days** (re-run the build to re-sign), limited to ~3 apps,
  no push/background entitlements. Produces the exact same `.ipa` the App Store would — full native shell.

**Tier 3 — PWA on your iPhone (zero install)**
The app is already a PWA. Host the web build (GitHub Pages), open it in Safari on the iPhone,
then Share → Add to Home Screen. Since Capacitor wraps the same web build in WKWebView this validates
~95% of the experience; only the native shell and `@capacitor/*` plugins are skipped.
For live iteration on-device: `npx cap serve` serves the build over LAN to the phone browser.

## Phase 5 — App Store submission
16. Category: Kids / Games, age rating 4+.
17. Privacy: app collects no data (all local storage, no analytics/network) → declare "No data collected".
18. Guideline 4.2 (websites-as-apps) is satisfied by offline Workbox caching (already present via
    `vite-plugin-pwa`), native shell, splash, and icons.

## Phase 6 — Registration & account setup (one-time)
1. **Apple ID**: create at appleid.apple.com (enable 2FA) — required for everything below.
2. **Enroll in Apple Developer Program** at developer.apple.com ($99/yr or regional equivalent):
   - Individual: personal + billing info.
   - Organization: needs a D-U-N-S number, legal entity, and tax/banking details.
   - Approval typically takes minutes to 48 h.
3. **Register the App ID** (developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → "+" → App):
   - Bundle ID: `com.tensaiasobi.app`. No extra capabilities needed for this app.
4. **Create the app record** (developer.apple.com → App Store Connect → My Apps → "+"):
   - Platform: iOS; Name: "tensaiasobi" (must be unique across the App Store); Primary language;
     Bundle ID: the one registered above; SKU: any unique string (e.g. `tensaiasobi001`).
5. **Agreements, Tax & Banking** (App Store Connect → Agreements, Tax, and Banking):
   - Required before distributing. Set the price tier to Free (tier 0) if the app is free.

## Phase 7 — First build to TestFlight
1. `npx cap open ios` (after `npm run build && npx cap sync ios`).
2. Xcode → target → Signing & Capabilities:
   - Check "Automatically manage signing".
   - Team: your developer team (Xcode → Preferences → Accounts → add Apple ID first).
   - Bundle Identifier: `com.tensaiasobi.app` (already set). Deployment Target: iOS 15.0 (already set).
3. Set Version `1.0.0` and Build `1` (target → General).
4. Sanity check on a device/simulator via Phase 4.5 (Tier 1 or 2).
5. Product → Archive (destination: "Any iOS Device").
6. Window → Organizer → your archive → Distribute App → App Store Connect → Upload (automatic signing).
7. App Store Connect → TestFlight:
   - Add yourself to the Internal Testing group (up to 100 testers, no beta review).
   - Answer the Export Compliance question (app uses only standard HTTPS → "No").
   - The build appears after processing (~10–30 min); install it via the TestFlight app on your iPhone.

## Phase 8 — App Store release
1. App Store Connect → your app → App Store tab → prepare the version:
   - Screenshots (6.9" iPhone required; 6.5" and 12.9" iPad recommended).
   - Description, What's New, keywords, Support URL (repo), Privacy Policy URL (required even if no data is collected).
   - Category: Games → Educational (or Kids). Age rating questionnaire: 4+.
2. Submit for review (typically 24–48 h). Guideline 4.2 is satisfied by offline Workbox caching +
   the native shell, splash, and icons (already present).

## Phase 9 — Future update workflow (every release)
1. Web changes: `npm run build && npx cap sync ios`.
2. Bump the **Build** number (Xcode → target → General → Build). App Store requires a strictly
   increasing build number for every upload.
3. Optionally bump **Version** (semver) for user-visible releases.
4. Archive → Distribute → Upload (same as Phase 7).
5. TestFlight → build appears → add to Internal Testing to smoke-test.
6. App Store Connect → App → Submit for Review.
   - Note: every update, even JS-only, goes through review. For instant JS-only updates without review,
     `@capacitor/live-update` (Capgo) is an option — currently out of scope.
7. Web (GitHub Pages) deploys are independent and unaffected.

## Notes / risks
- `navigator.vibrate` is unsupported on iOS/WKWebView; optional `@capacitor/haptics` upgrade.
- Web Audio may require a user gesture to start on iOS — app is muted by default ("Restaurant-safe").
- Service workers (PWA) can interfere with app updates; verify Workbox precache behavior in Capacitor.
- Each release = `npm run build` + `npx cap sync ios`; web (GitHub Pages) unchanged.

## Out of scope
- Android (same shell via `npx cap add android` later)
- In-app purchases, push notifications, account sync
