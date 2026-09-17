import { describe, expect, it } from 'vitest';
import { verifyParentIdentity } from './nativeParentAuth';

describe('verifyParentIdentity', () => {
  it('falls back to math on web where native biometrics are unavailable', async () => {
    await expect(verifyParentIdentity('Parents only')).resolves.toBe('fallback');
  });
});
