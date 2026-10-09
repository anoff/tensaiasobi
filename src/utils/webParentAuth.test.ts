import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canUseParentPasskey,
  forgetParentPasskey,
  hasParentPasskey,
  registerParentPasskey,
  verifyParentPasskey,
} from './webParentAuth';

const native = vi.hoisted(() => ({ value: false }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

// Bytes whose base64 contains "+" and "/", to check the URL-safe encoding.
const RAW_ID = new Uint8Array([0xfb, 0xff, 0xbf, 0x01]);
const STORED_ID = '-_-_AQ';

class FakePublicKeyCredential {
  static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn(async () => true);
  rawId: ArrayBuffer;
  response: unknown;
  constructor(rawId: Uint8Array, response: unknown = {}) {
    this.rawId = rawId.slice().buffer;
    this.response = response;
  }
}

// Authenticator data: 32-byte RP ID hash, then the flags byte (0x01 user present, 0x04 user verified).
function assertion(flags: number, rawId: Uint8Array = RAW_ID) {
  const authenticatorData = new Uint8Array(37);
  authenticatorData[32] = flags;
  return new FakePublicKeyCredential(rawId, { authenticatorData: authenticatorData.buffer });
}

const credentials = { create: vi.fn(), get: vi.fn() };

beforeEach(() => {
  native.value = false;
  localStorage.clear();
  credentials.create.mockReset();
  credentials.get.mockReset();
  FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
  vi.stubGlobal('PublicKeyCredential', FakePublicKeyCredential);
  vi.stubGlobal('isSecureContext', true);
  Object.defineProperty(navigator, 'credentials', { value: credentials, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canUseParentPasskey', () => {
  it('is true when the device can verify its user', async () => {
    await expect(canUseParentPasskey()).resolves.toBe(true);
  });

  it('is false without WebAuthn, outside https, without a platform authenticator, or in the native app', async () => {
    FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValueOnce(false);
    await expect(canUseParentPasskey()).resolves.toBe(false);

    FakePublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValueOnce(new Error('nope'));
    await expect(canUseParentPasskey()).resolves.toBe(false);

    vi.stubGlobal('isSecureContext', false);
    await expect(canUseParentPasskey()).resolves.toBe(false);
    vi.stubGlobal('isSecureContext', true);

    native.value = true;
    await expect(canUseParentPasskey()).resolves.toBe(false);
    native.value = false;

    vi.stubGlobal('PublicKeyCredential', undefined);
    await expect(canUseParentPasskey()).resolves.toBe(false);
  });
});

describe('registerParentPasskey', () => {
  it('creates a device-bound, user-verified passkey and remembers its id', async () => {
    credentials.create.mockResolvedValue(new FakePublicKeyCredential(RAW_ID));

    await expect(registerParentPasskey()).resolves.toBe(true);

    const { publicKey } = credentials.create.mock.calls[0][0];
    expect(publicKey.authenticatorSelection).toEqual({
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    });
    expect(hasParentPasskey()).toBe(true);
    expect(localStorage.getItem('settings_parent_passkey_id')).toBe(STORED_ID);
  });

  it('stores nothing when the parent cancels', async () => {
    credentials.create.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));

    await expect(registerParentPasskey()).resolves.toBe(false);
    expect(hasParentPasskey()).toBe(false);
  });
});

describe('verifyParentPasskey', () => {
  beforeEach(() => {
    localStorage.setItem('settings_parent_passkey_id', STORED_ID);
  });

  it('succeeds when the device verified the user with the stored passkey', async () => {
    credentials.get.mockResolvedValue(assertion(0x05));

    await expect(verifyParentPasskey()).resolves.toBe('success');

    const { publicKey } = credentials.get.mock.calls[0][0];
    expect(publicKey.userVerification).toBe('required');
    expect(Array.from(publicKey.allowCredentials[0].id)).toEqual(Array.from(RAW_ID));
  });

  it('falls back when the user was only present, not verified', async () => {
    credentials.get.mockResolvedValue(assertion(0x01));
    await expect(verifyParentPasskey()).resolves.toBe('fallback');
  });

  it('falls back when another credential answered', async () => {
    credentials.get.mockResolvedValue(assertion(0x05, new Uint8Array([1, 2, 3])));
    await expect(verifyParentPasskey()).resolves.toBe('fallback');
  });

  it('falls back when the prompt is cancelled or fails', async () => {
    credentials.get.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
    await expect(verifyParentPasskey()).resolves.toBe('fallback');
  });

  it('falls back without asking when no passkey is set up', async () => {
    forgetParentPasskey();
    await expect(verifyParentPasskey()).resolves.toBe('fallback');
    expect(credentials.get).not.toHaveBeenCalled();
  });
});

describe('hasParentPasskey', () => {
  it('is false in the native app even with a stored id', () => {
    localStorage.setItem('settings_parent_passkey_id', STORED_ID);
    native.value = true;
    expect(hasParentPasskey()).toBe(false);
  });
});
