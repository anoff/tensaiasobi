import { Capacitor } from '@capacitor/core';

export type ParentAuthResult = 'success' | 'fallback';

/**
 * Try Face ID / Touch ID / device passcode on native shells.
 * Web and any native failure (cancel, unavailable) return `fallback` so the math gate can show.
 */
export async function verifyParentIdentity(reason: string): Promise<ParentAuthResult> {
  if (!Capacitor.isNativePlatform()) return 'fallback';

  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    const available = await NativeBiometric.isAvailable({ useFallback: true });
    if (!available.isAvailable && !available.deviceIsSecure) return 'fallback';

    await NativeBiometric.verifyIdentity({
      reason,
      title: reason,
      useFallback: true,
    });
    return 'success';
  } catch {
    return 'fallback';
  }
}
