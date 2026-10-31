import { test, expect, type Locator, type Page } from '@playwright/test';

const KEY = 'gamification_stickers';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function save(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 1,
    earned: [],
    day: '',
    dayCount: 0,
    placedPieces: [],
    ownedAccessories: [],
    placements: {},
    seenCount: 0,
    ...over,
  });
}

async function seed(page: Page, values: Record<string, string>) {
  await page.addInitScript((v) => {
    // Seed only on the first load so reloads keep what the app wrote.
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, val] of Object.entries(v)) localStorage.setItem(k, val);
  }, values);
}

async function stars(page: Page) {
  return Number((await page.getByTestId('stars-total').innerText()).replace(/\D/g, '') || '0');
}

/** Answer one Math Pop question right and wait for the next one. */
async function answerMath(page: Page) {
  const equation = page.getByTestId('math-equation');
  // A fresh question shows "?" and enabled options.
  await expect(equation).toContainText('?', { timeout: 5000 });
  await expect(page.getByTestId('math-answer-option').first()).toBeEnabled();
  const text = await equation.innerText();
  const [a, b] = (text.match(/\d+/g) ?? []).map(Number);
  const op = await equation.locator('[data-operation]').getAttribute('data-operation');
  const answer = op === 'minus' ? a - b : a + b;
  const options = page.getByTestId('math-answer-option');
  const n = await options.count();
  for (let i = 0; i < n; i++) {
    if ((await options.nth(i).innerText()).trim().split(/\s+/)[0] === String(answer)) {
      await options.nth(i).click();
      break;
    }
  }
  await expect(equation).not.toContainText('?');
}

async function dragTo(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test.describe('Sticker Book', () => {
  test('a finished round earns the next sticker on that game\'s shelf, with the award and a home badge', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await page.getByTestId('difficulty-easy').click();
    for (let i = 0; i < 4; i++) await answerMath(page);
    await expect(page.getByTestId('sticker-award')).toHaveCount(0);
    await answerMath(page);
    const award = page.getByTestId('sticker-award');
    await expect(award).toBeVisible();
    await expect(award).toHaveAttribute('data-sticker', 'numbers_01');
    await expect(page.getByTestId('sticker-award-panda')).toBeVisible();
    // The award never blocks play and leaves on its own.
    await expect(award).toHaveCount(0, { timeout: 4000 });

    await page.getByTestId('home-button').click();
    await expect(page.getByTestId('home-sticker-new')).toHaveText('+1');
    await page.getByTestId('launch-sticker-book').click();
    const numbers = page.getByTestId('book-stickers-numbers');
    await expect(numbers.getByTestId('sticker-slot')).toHaveCount(1);
    await expect(numbers.getByTestId('sticker-slot')).toHaveAttribute('data-sticker', 'numbers_01');
    await expect(page.getByTestId('book-shelf-count-numbers')).toContainText('1 /');
    await expect(page.getByTestId('book-stickers-language').getByTestId('sticker-slot')).toHaveCount(0);

    await page.getByTestId('home-button').click();
    await expect(page.getByTestId('home-sticker-new')).toHaveCount(0);
  });

  test('the daily cap stops new stickers', async ({ page }) => {
    test.setTimeout(60_000);
    await seed(page, { [KEY]: save({ day: today(), dayCount: 5 }) });
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await page.getByTestId('difficulty-easy').click();
    for (let i = 0; i < 5; i++) await answerMath(page);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('sticker-award')).toHaveCount(0);
  });

  test('an old town with items becomes the thank-you sticker and the town save is removed', async ({ page }) => {
    await seed(page, { gamification_town: JSON.stringify([[null, { id: 'house', emoji: '🏠' }]]) });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    await expect(page.getByTestId('book-specials').getByTestId('sticker-slot')).toHaveAttribute('data-sticker', 'general_thank_you');
    expect(await page.evaluate(() => localStorage.getItem('gamification_town'))).toBeNull();
  });

  test('accessories are bought once with stars and stay on the sticker after a reload', async ({ page }) => {
    await seed(page, { [KEY]: save({ earned: ['numbers_01', 'numbers_02'], seenCount: 2 }), gamification_stars: '15' });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    await page.locator('[data-testid="sticker-slot"][data-sticker="numbers_01"]').click();
    await expect(page.getByTestId('sticker-detail')).toBeVisible();

    await page.getByTestId('buy-crown').click();
    await expect(page.getByTestId('accessory-crown')).toHaveAttribute('data-owned', 'true');
    // 5 stars left: the next one is too dear and just shakes.
    await page.getByTestId('buy-party_hat').click();
    await expect(page.getByTestId('not-enough-stars')).toBeVisible();
    await expect(page.getByTestId('accessory-party_hat')).toHaveAttribute('data-owned', 'false');

    await dragTo(page, page.getByTestId('accessory-crown'), page.getByTestId('sticker-detail-box'));
    await expect(page.getByTestId('sticker-detail-box').getByTestId('placed-accessory')).toHaveAttribute('data-accessory', 'crown');
    await page.getByTestId('sticker-detail-close').click();

    await page.reload();
    await page.getByTestId('launch-sticker-book').click();
    const first = page.locator('[data-testid="sticker-slot"][data-sticker="numbers_01"]');
    await expect(first.getByTestId('placed-accessory')).toHaveAttribute('data-accessory', 'crown');
    // Owned globally: the second sticker can wear it without buying again.
    await page.locator('[data-testid="sticker-slot"][data-sticker="numbers_02"]').click();
    await expect(page.getByTestId('accessory-crown')).toHaveAttribute('data-owned', 'true');
    await expect(page.getByTestId('buy-crown')).toHaveCount(0);
    await page.getByTestId('sticker-detail-close').click();
    await page.getByTestId('home-button').click();
    expect(await stars(page)).toBe(5);
  });

  test('scene pieces snap onto their outline and a full scene shows the reward', async ({ page }) => {
    const pieces = ['scene_engine', 'scene_car_balls', 'scene_car_shapes', 'scene_owl_conductor'];
    await seed(page, { [KEY]: save({ earned: pieces, placedPieces: pieces.slice(1), seenCount: 4 }) });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    const scene = page.getByTestId('scene-numbers');
    await expect(scene).toHaveAttribute('data-complete', 'false');
    const piece = scene.locator('[data-testid="scene-piece"][data-piece="scene_engine"]');
    await piece.scrollIntoViewIfNeeded();
    await dragTo(page, piece, scene.locator('[data-testid="scene-ghost"][data-piece="scene_engine"]'));
    await expect(scene).toHaveAttribute('data-complete', 'true');
    await expect(scene.getByTestId('scene-reward')).toBeVisible();
  });

  test('an outline-page scene snaps a piece onto its dashed slot', async ({ page }) => {
    const garden = ['scene_logic_circle_tree', 'scene_logic_tortoise', 'scene_logic_triangle_tent', 'scene_logic_block_steps'];
    await seed(page, { [KEY]: save({ earned: garden, placedPieces: garden.slice(0, 3), seenCount: 4 }) });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    const scene = page.getByTestId('scene-logic');
    const piece = scene.locator('[data-testid="scene-piece"][data-piece="scene_logic_block_steps"]');
    await piece.scrollIntoViewIfNeeded();
    // A drop far from the slot does not snap.
    await dragTo(page, piece, scene.getByTestId('scene-piece-placed').first());
    await expect(scene).toHaveAttribute('data-complete', 'false');
    await dragTo(page, piece, scene.locator('[data-testid="scene-ghost"][data-piece="scene_logic_block_steps"]'));
    await expect(scene).toHaveAttribute('data-complete', 'true');
    await expect(scene.getByTestId('scene-piece-placed')).toHaveCount(4);
  });

  test('one character per shelf, 4 moods each and an outline-page scene on every shelf', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    for (const c of ['owl', 'fox', 'tortoise', 'panda']) {
      await expect(page.getByTestId(`book-character-${c}`)).toHaveAttribute('data-has-art', 'true');
    }
    // Nothing earned yet: every slot waits as a dashed outline.
    for (const shelf of ['numbers', 'language', 'logic', 'play']) {
      await expect(page.getByTestId(`book-moods-${shelf}`).getByTestId('sticker-slot-empty')).toHaveCount(4);
    }
    await expect(page.getByTestId('book-stickers-play').getByTestId('sticker-slot-empty')).toHaveCount(12);
    await expect(page.getByTestId('book-shelf-count-play')).toContainText('0 / 20');
    // Reading corner, Shape garden and Playground use the Art Director's outline pages.
    for (const shelf of ['language', 'logic', 'play']) {
      await expect(page.getByTestId(`scene-${shelf}`).getByTestId('scene-page')).toBeVisible();
    }
});
});
