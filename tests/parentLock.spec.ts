import { test, expect, Page } from '@playwright/test';

// Helper to solve the ParentGate problem
async function solveParentGate(page: Page) {
  const gateTextElement = page.locator('form div.text-4xl');
  await expect(gateTextElement).toBeVisible();
  const text = await gateTextElement.innerText();
  const cleanExpr = text.replace(/×/g, '*').replace(/=/g, '').replace(/\?/g, '').trim();
  const answer = Function(`"use strict"; return (${cleanExpr})`)();
  await page.locator('form input[type="number"]').fill(answer.toString());
  await page.locator('form button[type="submit"]').click();
}

// A virtual platform authenticator stands in for Face ID / Touch ID / the device passcode.
async function addDeviceLock(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return { client, authenticatorId };
}

test.describe('Parent lock (passkey) on the web', () => {
  test('parents unlock settings with the device lock, falling back to the sum', async ({ page }) => {
    await page.goto('/');
    const { client, authenticatorId } = await addDeviceLock(page);
    const settingsTitle = page.locator('h2', { hasText: 'Settings' });
    const unlockButton = page.getByTestId('parent-gate-passkey');
    const closeSettings = page.getByRole('button', { name: 'Close Settings' });

    // Before setup the gate is the plain sum.
    await page.getByTestId('open-settings').click();
    await expect(page.getByText('Please solve this simple problem')).toBeVisible();
    await expect(unlockButton).toHaveCount(0);
    await solveParentGate(page);
    await expect(settingsTitle).toBeVisible();

    // Set up the parent lock.
    await page.getByTestId('parent-lock-set-up').click();
    await expect(page.getByTestId('parent-lock-on')).toBeVisible();
    await closeSettings.click();

    // After a reload the gate offers the device lock and it opens settings without the sum.
    await page.reload();
    await page.getByTestId('open-settings').click();
    await expect(page.getByText('Or solve this problem:')).toBeVisible();
    await unlockButton.click();
    await expect(settingsTitle).toBeVisible();
    await closeSettings.click();

    // A failed device check keeps the gate closed and leaves the sum as the way in.
    await client.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });
    await page.getByTestId('open-settings').click();
    await unlockButton.click();
    await expect(page.getByText('Device unlock wasn’t available')).toBeVisible();
    await expect(settingsTitle).toHaveCount(0);
    await solveParentGate(page);
    await expect(settingsTitle).toBeVisible();

    // Turning it off brings back the plain sum.
    await page.getByTestId('parent-lock-off').click();
    await expect(page.getByTestId('parent-lock-set-up')).toBeVisible();
    await closeSettings.click();
    await page.getByTestId('open-settings').click();
    await expect(page.getByText('Please solve this simple problem')).toBeVisible();
    await expect(unlockButton).toHaveCount(0);
  });

  test('settings hide the parent lock when the device has no lock to use', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('open-settings').click();
    await solveParentGate(page);
    await expect(page.locator('h2', { hasText: 'Settings' })).toBeVisible();
    await expect(page.getByTestId('parent-lock-setting')).toHaveCount(0);
  });
});
