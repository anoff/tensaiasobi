import { test, expect, Page } from '@playwright/test';

// Helper to switch language using the test IDs
async function switchLanguage(page: Page, lang: 'en' | 'de' | 'ja') {
  // Click the trigger button
  const trigger = page.getByTestId('lang-dropdown-trigger');
  await expect(trigger).toBeVisible();
  
  // Check if the current active language is already the target.
  const flags = { en: '🇬🇧', de: '🇩🇪', ja: '🇯🇵' } as const;
  const activeText = await trigger.innerText();
  if (activeText.includes(flags[lang])) {
    return; // Already in target language
  }

  await trigger.click();

  // Click the target language button
  const option = page.getByTestId(`lang-select-${lang}`);
  await expect(option).toBeVisible();
  await option.click();
}

test.describe('tensaiasobi E2E Game Interaction Checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const languages = ['en', 'de', 'ja'] as const;

  for (const lang of languages) {
    test(`Verify all games start and first interaction works in ${lang.toUpperCase()}`, async ({ page }) => {
      // 1. Switch Language dynamically
      await switchLanguage(page, lang);

      // Verify the launcher grid exists by checking the Math launcher
      const mathLauncher = page.getByTestId('launch-math');
      await expect(mathLauncher).toBeVisible();

      const gameKeys = ['math', 'odd', 'doodle', 'memory', 'maze', 'trace', 'anlaut'] as const;

      for (const gameKey of gameKeys) {
        // 2. Launch Game
        const launcher = page.getByTestId(`launch-${gameKey}`);
        await expect(launcher).toBeVisible();
        await launcher.click();

        // 3. Perform First Interaction & Verify it loaded
        switch (gameKey) {
          case 'math': {
            // Check that equation and options are visible
            const equation = page.getByTestId('math-equation');
            await expect(equation).toBeVisible();
            const option = page.getByTestId('math-answer-option').first();
            await expect(option).toBeVisible();

            // Click the option
            await option.click();

            // All options should be disabled after choosing
            await expect(option).toBeDisabled();
            break;
          }

          case 'odd': {
            // Check that emoji options are visible
            const option = page.getByTestId('odd-emoji-option').first();
            await expect(option).toBeVisible();

            // Click the option
            await option.click();

            // All options should be disabled after choosing
            await expect(option).toBeDisabled();
            break;
          }

          case 'doodle': {
            const canvas = page.getByTestId('doodle-canvas');
            await expect(canvas).toBeVisible();

            // Draw a stroke on the canvas
            const box = await canvas.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
              await page.mouse.down();
              await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
              await page.mouse.up();
            }

            // Click the clear button
            const clearBtn = page.getByTestId('doodle-clear');
            await expect(clearBtn).toBeVisible();
            await clearBtn.click();
            break;
          }

          case 'memory': {
            const card = page.getByTestId('memory-card').first();
            await expect(card).toBeVisible();

            // Click card to flip it
            await card.click();
            break;
          }

          case 'maze': {
            const canvas = page.getByTestId('maze-canvas');
            await expect(canvas).toBeVisible();

            // Drag mouse/finger on canvas to draw a path
            const box = await canvas.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
              await page.mouse.move(box.x + 50, box.y + 50);
              await page.mouse.down();
              await page.mouse.move(box.x + 100, box.y + 100);
              await page.mouse.up();
            }
            break;
          }

          case 'trace': {
            const canvas = page.getByTestId('trace-canvas');
            await expect(canvas).toBeVisible();

            // Drag mouse/finger on canvas
            const box = await canvas.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
              await page.mouse.move(box.x + 50, box.y + 50);
              await page.mouse.down();
              await page.mouse.move(box.x + 100, box.y + 100);
              await page.mouse.up();
            }
            break;
          }

          case 'anlaut': {
            // Check that options are visible
            const option = page.getByTestId('anlaut-option').first();
            await expect(option).toBeVisible();

            // Click the option
            await option.click();

            // If incorrect, the option is disabled. If correct, the layout changes and options are unmounted.
            // Therefore, we wait for any state transitions and check if it is still visible; if so, it must be disabled.
            await page.waitForTimeout(200);
            if (await option.isVisible()) {
              await expect(option).toBeDisabled();
            }
            break;
          }
        }

        // 4. Return to Main Menu using Home button
        const homeBtn = page.getByTestId('home-button');
        await expect(homeBtn).toBeVisible();
        await homeBtn.click();

        // Verify we are back to main menu by checking game launcher button is visible
        await expect(page.getByTestId(`launch-${gameKey}`)).toBeVisible();
      }
    });
  }
});
