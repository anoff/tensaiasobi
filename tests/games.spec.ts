import { test, expect, Page } from '@playwright/test';

// Helper to switch language using the test IDs
async function switchLanguage(page: Page, lang: 'en' | 'de' | 'ja' | 'fr' | 'ko') {
  // Click the trigger button
  const trigger = page.getByTestId('lang-dropdown-trigger');
  await expect(trigger).toBeVisible();
  
  // Check if the current active language is already the target.
  const flags = { en: '🇬🇧', de: '🇩🇪', ja: '🇯🇵', fr: '🇫🇷', ko: '🇰🇷' } as const;
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

  const languages = ['en', 'de', 'ja', 'fr', 'ko'] as const;

  for (const lang of languages) {
    test(`Verify all games start and first interaction works in ${lang.toUpperCase()}`, async ({ page }) => {
      // 1. Switch Language dynamically
      await switchLanguage(page, lang);

      // Verify the launcher grid exists by checking the Math launcher
      const mathLauncher = page.getByTestId('launch-math');
      await expect(mathLauncher).toBeVisible();

      const gameKeys = ['math', 'odd', 'doodle', 'memory', 'maze', 'trace', 'letterTrace', 'anlaut', 'dispatch', 'physics', 'tower-sort', 'shadow', 'magnet-fishing'] as const;

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

            // Verify download behavior
            const downloadBtn = page.getByTestId('doodle-download');
            await expect(downloadBtn).toBeVisible();

            const downloadPromise = page.waitForEvent('download');
            await downloadBtn.click();
            const download = await downloadPromise;

            // Assert filename matches tensaiasobi-YYYY-MM-DD.png
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const expectedFilename = `tensaiasobi-${year}-${month}-${day}.png`;
            expect(download.suggestedFilename()).toBe(expectedFilename);

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

          case 'letterTrace': {
            const canvas = page.getByTestId('letter-trace-canvas');
            await expect(canvas).toBeVisible();

            // Verify the letter palette is visible, along with the level selector for
            // languages that offer more than one script (Japanese: Hiragana/Katakana).
            if (lang === 'ja') {
              await expect(page.getByTestId('letter-trace-level-hiragana')).toBeVisible();
            }
            await expect(page.getByTestId('letter-trace-letter-option').first()).toBeVisible();

            // Drag mouse/finger on canvas to attempt tracing the first stroke
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

          case 'dispatch': {
            const startBtn = page.getByTestId('dispatch-start');
            await expect(startBtn).toBeVisible();
            await startBtn.click();

            // Wait for a road cell/event to appear or just tap a vehicle button
            const vehicleBtn = page.getByTestId('dispatch-vehicle-police');
            await expect(vehicleBtn).toBeVisible();
            await vehicleBtn.click();
            break;
          }

          case 'physics': {
            // Wait for the seesaw pans and weight tray to render
            const leftPan = page.getByTestId('physics-pan-left');
            const rightPan = page.getByTestId('physics-pan-right');
            await expect(leftPan).toBeVisible();
            await expect(rightPan).toBeVisible();

            // Tap a weight from the tray
            const trayButton = page.getByTestId('physics-tray-weight').first();
            await expect(trayButton).toBeVisible();
            await trayButton.click();
            break;
          }

          case 'tower-sort': {
            // Check that at least two tower buttons are visible
            const tower = page.getByTestId('tower-sort-tower').first();
            await expect(tower).toBeVisible();

            // Select the first tower then a second tower to attempt a move
            await tower.click();
            const secondTower = page.getByTestId('tower-sort-tower').nth(1);
            await expect(secondTower).toBeVisible();
            await secondTower.click();
            break;
          }

          case 'shadow': {
            const stage = page.getByTestId('shadow-stage');
            await expect(stage).toBeVisible();

            // Move the flashlight by dragging within the stage
            const box = await stage.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
              await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
              await page.mouse.down();
              await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
              await page.mouse.up();
            }

            // Tap one of the answer choices
            const choice = page.getByTestId('shadow-choice').first();
            await expect(choice).toBeVisible();
            await choice.click();
            break;
          }

          case 'magnet-fishing': {
            const stage = page.getByTestId('magnet-stage');
            await expect(stage).toBeVisible();

            const bin = page.getByTestId('magnet-bin');
            await expect(bin).toBeVisible();
            const binBox = await bin.boundingBox();
            expect(binBox).not.toBeNull();

            // Collect all magnetic items, depositing whenever capacity is reached.
            for (let rounds = 0; rounds < 10; rounds += 1) {
              const magneticItem = page.getByTestId('magnet-item-magnetic').first();
              const itemBox = await magneticItem.boundingBox().catch(() => null);
              if (!itemBox || !binBox) break;

              // Hover the magnet over the item for a moment so it snaps.
              await page.mouse.move(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2);
              await page.mouse.down();
              await page.waitForTimeout(150);

              // Move directly onto the bin and release to deposit.
              await page.mouse.move(binBox.x + binBox.width / 2, binBox.y + binBox.height / 2);
              await page.mouse.up();
              await page.waitForTimeout(200);
            }

            // Wait for victory UI after all items are deposited.
            await expect(page.getByTestId('magnet-play-again')).toBeVisible({ timeout: 5000 });
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

  test('Verify Maze Game drawing continuation and play/reset flow', async ({ page }) => {
    // 1. Launch Maze Game
    const launcher = page.getByTestId('launch-maze');
    await expect(launcher).toBeVisible();
    await launcher.click();

    const canvas = page.getByTestId('maze-canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Draw first segment near the top-left start cell
      await page.mouse.move(box.x + 30, box.y + 30);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 80);
      await page.mouse.up();

      // Wait a short time to simulate user release
      await page.waitForTimeout(100);

      // Continue drawing from the end area
      await page.mouse.move(box.x + 80, box.y + 80);
      await page.mouse.down();
      await page.mouse.move(box.x + 130, box.y + 130);
      await page.mouse.up();

      // Check if Reset button is visible and active
      const resetBtn = page.getByTestId('maze-reset');
      await expect(resetBtn).toBeVisible();
      await expect(resetBtn).not.toBeDisabled();
    }
  });
});
