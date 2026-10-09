import { Capacitor } from '@capacitor/core';
import type { ParentAuthResult } from './nativeParentAuth';

/**
 * Parent lock for the web / PWA build: a passkey on this device, so Face ID,
 * Touch ID, a fingerprint or the device passcode opens the parent gate.
 *
 * The check stays on the device (no server verifies the signature). That is
 * enough to keep children out; it is not account security. The native app
 * uses nativeParentAuth instead: passkeys need a real https origin, not capacitor://.
 */

const STORAGE_KEY = 'settings_parent_passkey_id';
const PASSKEY_NAME = 'tensaiasobi parent lock';
// Authenticator data flags (byte 32), bit 2: the user was verified (Face ID, fingerprint, passcode).
const FLAG_USER_VERIFIED = 0x04;

function toBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

function storedPasskeyId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Whether this browser can create a passkey that unlocks with the device lock. */
export async function canUseParentPasskey(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return false;
  if (!window.isSecureContext || typeof PublicKeyCredential === 'undefined' || !navigator.credentials) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasParentPasskey(): boolean {
  return !Capacitor.isNativePlatform() && storedPasskeyId() !== null;
}

/** Stops using the passkey here. The passkey itself stays in the device's password manager. */
export function forgetParentPasskey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing was stored either.
  }
}

/** Creates the passkey. Call it straight from a tap: Safari only prompts for a user gesture. */
export async function registerParentPasskey(): Promise<boolean> {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        rp: { name: 'tensaiasobi' },
        user: { id: randomBytes(16), name: PASSKEY_NAME, displayName: PASSKEY_NAME },
        challenge: randomBytes(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256 (Windows Hello)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
        timeout: 60_000,
      },
    });
    if (!(credential instanceof PublicKeyCredential)) return false;
    localStorage.setItem(STORAGE_KEY, toBase64Url(credential.rawId));
    return true;
  } catch {
    return false;
  }
}

/** Asks for the device lock. Call it straight from a tap: Safari only prompts for a user gesture. */
export async function verifyParentPasskey(signal?: AbortSignal): Promise<ParentAuthResult> {
  const id = storedPasskeyId();
  if (!id) return 'fallback';
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: 'public-key', id: fromBase64Url(id) }],
        userVerification: 'required',
        timeout: 60_000,
      },
      signal,
    });
    if (!(credential instanceof PublicKeyCredential) || toBase64Url(credential.rawId) !== id) return 'fallback';
    const { authenticatorData } = credential.response as AuthenticatorAssertionResponse;
    return new Uint8Array(authenticatorData)[32] & FLAG_USER_VERIFIED ? 'success' : 'fallback';
  } catch {
    return 'fallback';
  }
}
