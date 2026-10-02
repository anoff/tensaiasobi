import { test, expect } from '@playwright/test';
import { openGame } from './ageLevels';

test.describe('City Dispatch', () => {
  test('the city ignores taps until a vehicle is picked, and the picked one stands out', async ({ page }) => {
    await openGame(page, 'launch-dispatch', 'little', 'easy');
    await page.getByTestId('dispatch-start').click();

    const emergency = page.locator('[data-testid="dispatch-cell"][data-event]').first();
    await expect(emergency).toBeVisible();
    const type = (await emergency.getAttribute('data-event'))!;

    // No vehicle yet: the emergency can't be tapped.
    await expect(emergency).toBeDisabled();

    await page.getByTestId(`dispatch-vehicle-${type}`).click();
    await expect(page.getByTestId(`dispatch-vehicle-${type}`)).toHaveAttribute('aria-pressed', 'true');
    for (const other of ['police', 'fire', 'ambulance'].filter((v) => v !== type)) {
      await expect(page.getByTestId(`dispatch-vehicle-${other}`)).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByTestId(`dispatch-vehicle-${other}`)).toHaveClass(/opacity-50/);
    }
    // Empty houses stay inert even with a vehicle picked.
    await expect(page.locator('[data-testid="dispatch-cell"]:not([data-event])').first()).toBeDisabled();

    await emergency.click();
    await expect(page.getByText(/: 1$/)).toBeVisible();
    await expect(page.getByTestId(`dispatch-vehicle-${type}`)).toHaveAttribute('aria-pressed', 'false');
  });
});
