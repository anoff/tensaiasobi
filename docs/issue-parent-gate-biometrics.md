# Feature Issue 4: Device-Default Lock System for Parental Verification (Face ID/Passcode Fallback)

## 1. Goal
Upgrade the math-based [src/components/ParentGate.tsx](src/components/ParentGate.tsx) to first attempt native device-level verification (Face ID / Touch ID / Device Passcode patternfallback) via Capacitor's secure LocalAuthentication policies. 

Using native biometric security paired with a primary device Passcode ensures the gateway is **100% toddler-proof**, while providing parents with a quick, elegant way to access dashboard/subscription settings without doing mental math tasks.

---

## 2. Proposed Changes & Implementation Strategy

### Step A: Install Native Verification Dependencies
Install `@capacitor-community/native-biometric` (which supports automatic passcode/PIN fallback layers natively on both iOS and Android).
```bash
npm install @capacitor-community/native-biometric
npx cap sync
```

### Step B: Refactor the Parental Verification Portal (`src/components/ParentGate.tsx`)
1. Detect if the app is executing within a native platform (using Capacitor Core utilities).
2. If on a native platform, try executing the system identity prompter immediately on mounting:
   - Call `NativeBiometric.isAvailable()`.
   - Call `NativeBiometric.verifyIdentity()`, passing custom prompt titles/reasons, and importantly, setting `usePin: true`. This parameter configuration tells iOS to trigger the standard device **Passcode Screen** (or pattern/PIN on Android) if biometric options fail or aren't registered.
3. If identity verification resolves with success, invoke `onSuccess()`.
4. If authentication fails, is rejected/canceled, or native biometrics/passcode locks are inactive on the underlying hardware, gracefully fall back to displaying the standard mathematical algebra equation dialog interface as an elegant fallback.

---

## 3. UI/UX Details

- **Device Interface Bridge:** When entering settings, iOS will dim screen elements and focus cleanly on the system Face ID scanning wheel. If that fails or the camera is obscured, the OS smoothly prompts for the family passcode.
- **Algebra Fail-Safe:** If parents dismiss or cancel the native permission prompt, they see our friendly pastel-bordered equation box inside [src/components/ParentGate.tsx](src/components/ParentGate.tsx) with a short message: *"Biometric failed. Please compute this equation instead!"*

---

## 4. Native Project Configurations

### iOS Framework Integration (`ios/App/App/Info.plist`)
To invoke Apple's `LocalAuthentication` framework system, append the biometrics usage explanation string to the workspace list:
```xml
<key>NSFaceIDUsageDescription</key>
<string>We use verification keys to safely confirm adulthood before showing Parent settings.</string>
```

---

## 5. Verification & Testing Playbook

### Manual Verification
1. Run target app on an iOS physical device or active Simulator containing registered face parameters.
2. Navigate to dashboard settings gear.
3. **With Biometrics Active:** Confirm that the standard FaceID circle pops up immediately. Authenticate and verify it navigates cleanly to Settings.
4. **With Biometrics Cancelled:** Press target "Cancel" on the native scanner window. Verify that the UI drops back to the mathematical equation input box without errors or app crashes.
5. **No Password Set (Web Fallback):** Access the web deployment (Vite standard index). Confirm it ignores native prompts entirely and presents the math box immediately.
