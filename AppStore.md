# 📱 tensaiasobi on iPhone & iPad

The iOS app is the same web app, wrapped in a native shell by [Capacitor 8](https://capacitorjs.com) (`ios/`). This guide puts it on **your own devices with a free Apple ID**, no paid developer account, and keeps it there. The App Store path is at the end.

**Short version** (on a Mac with Xcode, iPhone plugged in):

```bash
npm run ios:doctor                    # check the Mac, find your Apple ID's signing team
npm run ios:device                    # build, sign, install and open on the iPhone
npm run ios:auto-refresh -- install   # keep it from expiring after 7 days
```

## What a free Apple ID gets you

| | Free Apple ID | Apple Developer Program ($99/yr) |
| --- | --- | --- |
| Install on your own iPhones/iPads | ✅ | ✅ |
| How long a build keeps opening | **7 days**, then re-sign (automated below) | 1 year (TestFlight builds: 90 days) |
| Limits | 3 self-signed apps per device, 10 new app IDs per week | 100 registered devices per type per year |
| TestFlight / App Store | ❌ | ✅ |

Your kids' progress (stars, streaks, town, coupons) is stored on the device inside the app. **Re-installing or re-signing keeps it. Deleting the app erases it.**

## Option A: Mac + Xcode (recommended)

### One-time setup

1. **Xcode 26 or newer** from the Mac App Store. Open it once and let it install the iOS components. Capacitor 8 needs Xcode 26.
2. **Node.js 22**, e.g. `brew install node@22` or from [nodejs.org](https://nodejs.org).
3. **Sign in to Xcode with your Apple ID**: Xcode → Settings… → Accounts → **+**. A free Apple ID is enough. Xcode creates a *Personal Team* for it, which is what signs the app.
4. **Check the Mac:**
   ```bash
   git clone https://github.com/anoff/tensaiasobi.git && cd tensaiasobi
   npm run ios:doctor
   ```
   Doctor installs the npm packages, finds your Personal Team and saves it to `ios/local.env` (git-ignored, see [`ios/local.env.example`](ios/local.env.example)), and lists the devices this Mac can see. Fix anything it flags and run it again until it says *Ready*.
5. **Prepare the iPhone/iPad:**
   - Connect it with a cable, unlock it, tap **Trust This Computer**.
   - Turn on **Developer Mode**: Settings → Privacy & Security → Developer Mode → On, restart, confirm *Turn On*. The switch only shows up after the device has been connected to Xcode once; run `npm run ios:device` once if it's missing.

### Install

```bash
npm run ios:device
```

This builds the web app for iOS, copies it into the Xcode project, has Xcode register the device and create a (free) provisioning profile, signs a Release build, installs it with `devicectl` and opens it. It takes a few minutes the first time and about a minute after that.

The first time only:

- **macOS** may ask whether `codesign` can use your key. Choose **Always Allow** so later runs, including the background refresh, don't hang on this prompt.
- **iOS** refuses to open apps from a new developer. On the device go to Settings → General → **VPN & Device Management** → *Apple Development: your Apple ID* → **Trust**, then tap the app.

After the first cable install, the device also works **over Wi-Fi** when it is unlocked and on the same network as the Mac. Xcode → Window → Devices and Simulators shows whether the Mac can see it.

Options (`npm run ios:device -- --help`):

| | |
| --- | --- |
| `--device "Kid's iPad"` | pick a device by name or UDID; repeat for several. Or set `IOS_DEVICE="iPad,iPhone"` in `ios/local.env` |
| `--debug` | Debug build, so Safari → Develop → *device* opens the Web Inspector |
| `--skip-web` | reuse the last web build (native-only changes) |
| `--no-launch` | install without opening the app |

### Keep it running (the 7-day limit)

Builds signed with a free Apple ID stop opening after 7 days. Running `npm run ios:device` again fixes that and keeps all progress. To have the Mac do it for you:

```bash
npm run ios:auto-refresh -- install          # or: install --pull (see below)
npm run ios:auto-refresh -- status           # devices, expiry dates, recent log
npm run ios:auto-refresh -- uninstall
```

This installs a background job (`~/Library/LaunchAgents/com.tensaiasobi.ios-refresh.plist`) that runs every 3 hours. It re-signs and re-installs the app on every device you deployed to with `ios:device` once less than 2 days are left. It never opens the app on the device. If a device can't be reached and the app is about to expire, you get a macOS notification. Things to know:

- The Mac must be awake and logged in, and the device must be unlocked on the same Wi-Fi (or plugged in) at some point while the job runs.
- `--pull` also runs `git pull` in this checkout every 3 hours and installs new commits right away, so merged changes reach the devices without you doing anything. It only pulls when there are no uncommitted changes. Use a separate clone for this if you develop in this one.
- Log: `~/Library/Logs/tensaiasobi-ios-refresh.log`.

### Simulator (no Apple ID needed)

```bash
npm run ios:sim                              # newest iPhone simulator
npm run ios:sim -- --simulator "iPad Pro 13-inch (M5)"
```

### Working in Xcode directly

`npm run ios:open` builds the web app, syncs it and opens `ios/App/App.xcodeproj`. Press ▶︎ to run. If you pick a team under *Signing & Capabilities*, Xcode writes it into `project.pbxproj`. Don't commit that (`git checkout ios/App/App.xcodeproj/project.pbxproj`); the scripts pass the team from `ios/local.env` instead.

## Option B: no Mac, sideload the CI build

The [iOS Build workflow](.github/workflows/ios.yml) builds an **unsigned** `.ipa` on GitHub's macOS runners. It runs on PRs that touch the iOS setup (download it under the run's *Artifacts*) and on every push to `master`, which also replaces the [`ios-latest` pre-release](https://github.com/anoff/tensaiasobi/releases/tag/ios-latest).

An iPhone won't install an unsigned app. A sideloading tool signs it with your Apple ID on the way in, with the same free-account limits as above:

- **[SideStore](https://sidestore.io)**: after a one-time setup with a computer, it re-signs apps on the iPhone itself over Wi-Fi.
- **[AltStore Classic](https://altstore.io)**: AltServer on a Mac or PC re-signs in the background while both are on the same Wi-Fi.
- **[Sideloadly](https://sideloadly.io)** (Mac/Windows): install from the computer, with optional auto-refresh.

Download `tensaiasobi-unsigned.ipa` from the release (on the iPhone for SideStore, on the computer otherwise) and open it in the tool. These are third-party tools that sign in to Apple with your Apple ID, so read their docs and consider a separate Apple ID for sideloading. `npm run ios:ipa` builds the same `.ipa` locally into `ios/App/output/`.

The workflow needs no secrets. It can't sign the app because free signing needs the Apple ID in Xcode and a profile tied to your device.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `No Apple ID found in Xcode` | Xcode → Settings… → Accounts → sign in, then `npm run ios:doctor`. |
| `Several signing teams found` | Set `IOS_TEAM_ID=` in `ios/local.env` to the team to use (doctor lists them). |
| `bundle identifier … is not available` / `Failed to register bundle identifier` | Someone else registered `com.tensaiasobi.app`. Set `IOS_BUNDLE_ID=com.yourname.tensaiasobi` in `ios/local.env`. A new bundle ID is a separate app, so progress doesn't carry over. |
| `maximum number of apps for free development profiles` | Free Apple IDs can have 3 self-signed apps per device. Delete one you don't need. |
| `No reachable iPhone` | Plug it in and unlock it, or unlock it on the Mac's Wi-Fi. `npm run ios:doctor` shows what the Mac sees. |
| `Developer Mode is off` | Settings → Privacy & Security → Developer Mode, then restart. |
| App installed but won't open (*Untrusted Developer*) | Settings → General → VPN & Device Management → trust your Apple ID. |
| App opens and closes immediately after a week | The 7 days are up. Run `npm run ios:device`; progress is kept. |
| Background refresh hangs or fails on signing | Run `npm run ios:device` once by hand and answer the keychain prompt with **Always Allow**. |
| Build fails right after an Xcode update | `sudo xcodebuild -runFirstLaunch`, then `xcodebuild -downloadPlatform iOS`. |

## How the iOS build is put together

- **Web build:** `npm run build:ios` (`vite build --mode ios`) is the normal build without the service worker, which can't run on WKWebView's `capacitor://` scheme. `npx cap sync ios` copies `dist/` into `ios/App/App/public`. The scripts run both.
- **Native shell:** `capacitor.config.ts` sets the paper background (`#ffe7c2`) and dark status-bar text. Safe areas are handled in CSS (`pt-safe`/`pb-safe`). Plugins: App (back button), Status Bar, and Native Biometric (Face ID/passcode for the parent gate, see `NSFaceIDUsageDescription` in `ios/App/App/Info.plist`). The web/PWA version can do the same with a passkey, set up under Settings → Parent lock. iPhones run in portrait; iPads rotate.
- **Progress storage:** the games keep progress in the web view's `localStorage`. iOS keeps it across updates and re-signing, but may clear it if the device runs critically low on storage. Moving it to `@capacitor/preferences` would rule that out.
- **Versions:** `MARKETING_VERSION` in the Xcode project is the version users see. The build number is the git commit count, set by every script and the workflow, so it always goes up.
- **Icon & splash:** sources are `assets/icon.png` (1024×1024, no transparency) and `assets/splash.png` / `splash-dark.png` (2732×2732). Regenerate with `npm run ios:assets`.
- **Scripts:** `scripts/ios/*.sh`, configured by `ios/local.env`. Environment variables of the same name win, e.g. `IOS_DEVICE="Kid's iPad" npm run ios:device`.

## Later: TestFlight and the App Store

Needs the paid [Apple Developer Program](https://developer.apple.com/programs/). [plan-ios.md](plan-ios.md) (phases 6–9) has the step-by-step. Already in place: bundle ID, arm64-only, increasing build numbers, the export-compliance flag (`ITSAppUsesNonExemptEncryption = NO`), icon and launch screen. Still to do:

- Join the program, then set `IOS_TEAM_ID` in `ios/local.env` to the new (paid) team. Builds then last a year.
- Create the app in App Store Connect, archive it (`npm run ios:open`, then Product → Archive) and upload it to TestFlight.
- Store listing: screenshots, description, a privacy policy URL and the privacy questionnaire (*no data collected*: everything stays on the device).
- The **Kids category** requires a parental gate in front of links that leave the app. The GitHub link under the version number on the home screen needs one, or should be hidden in the iOS app.
