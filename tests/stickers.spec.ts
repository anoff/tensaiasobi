import { test, expect, type Locator, type Page } from '@playwright/test';

const KEY = 'gamification_stickers';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Owned copies for a v2 save: one plain copy per id (repeat an id for duplicates). */
const copies = (ids: string[], shiny: string[] = []) => ids.map((id, i) => ({ uid: `c${i + 1}`, id, shiny: shiny.includes(id) }));

function save(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 2,
    copies: [],
    daily: { date: '', k: 0 },
    pages: [],
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
  const b = (await to.boundingBox())!;
  await dragToPoint(page, from, b.x + b.width / 2, b.y + b.height / 2);
}

async function dragToPoint(page: Page, from: Locator, x: number, y: number) {
  const a = (await from.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
  await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
}

test.describe('Sticker Book', () => {
  test('the first round of the day always drops a capsule from that game\'s shelf; a tap opens it', async ({ page }) => {
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
    await expect(award).toHaveAttribute('data-shelf', 'numbers');
    await expect(award).toHaveAttribute('data-count', '1');
    await expect(page.getByTestId('capsule-machine')).toBeVisible();
    await expect(page.getByTestId('capsule').locator('img')).toBeVisible();
    await expect(page.getByTestId('sticker-award-panda')).toBeVisible();
    // The capsule waits for a tap: a wiggle hint from 1.5 s, no self-open before 4 s.
    await expect(award).toHaveAttribute('data-phase', 'hint', { timeout: 3000 });
    await expect(page.getByTestId('capsule')).toHaveClass(/capsule-wiggle/);
    await page.waitForTimeout(1000);
    await expect(award).toHaveAttribute('data-phase', 'hint');
    await page.getByTestId('capsule').click();
    await expect(award).toHaveAttribute('data-phase', 'reveal');
    await expect(page.getByTestId('award-sticker')).toBeVisible();
    await expect(page.getByTestId('award-caption')).toHaveText('New sticker!');
    // The reveal leaves on its own.
    await expect(award).toHaveCount(0, { timeout: 4000 });
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).daily.k, KEY)).toBe(1);

    await page.getByTestId('home-button').click();
    await expect(page.getByTestId('home-sticker-new')).toHaveText('+1');
    await page.getByTestId('launch-sticker-book').click();
    await expect(page.getByTestId('book-shelf-count-numbers')).toContainText('1 /');
    await expect(page.getByTestId('book-stickers-language').getByTestId('sticker-slot')).toHaveCount(0);

    await page.getByTestId('home-button').click();
    await expect(page.getByTestId('home-sticker-new')).toHaveCount(0);
  });

  test('a duplicate says "Again!" with a ×2 badge; an untapped capsule opens itself at 4 s; fits 320x568', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 320, height: 568 });
    // Every id on the Numbers shelf is owned once, so the first capsule of the day is a duplicate.
    const pool = [
      ...Array.from({ length: 18 }, (_, i) => `numbers_${String(i + 1).padStart(2, '0')}`),
      ...['owl_conductor', 'engine', 'car_balls', 'car_shapes'].map((p) => `scene_numbers_${p}`),
      ...['cheer', 'surprised', 'sleepy', 'proud'].map((m) => `mood_owl_${m}`),
    ];
    await seed(page, { [KEY]: save({ copies: copies(pool), seenCount: pool.length }) });
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await page.getByTestId('difficulty-easy').click();
    for (let i = 0; i < 5; i++) await answerMath(page);
    const award = page.getByTestId('sticker-award');
    await expect(award).toHaveAttribute('data-count', '2');
    await expect(award).not.toHaveAttribute('data-phase', 'reveal');
    // Fallback only: nobody taps, so it opens itself (never stuck).
    await expect(award).toHaveAttribute('data-phase', 'reveal', { timeout: 6000 });
    await expect(page.getByTestId('award-caption')).toHaveText('Again!');
    await expect(page.getByTestId('award-count')).toHaveText('×2');
    // On a 320x568 phone the sticker and caption clear the panda and machine and stay on screen.
    const caption = (await page.getByTestId('award-caption').boundingBox())!;
    const sticker = (await page.getByTestId('award-sticker').boundingBox())!;
    const machine = (await page.getByTestId('capsule-machine').boundingBox())!;
    const panda = (await page.getByTestId('sticker-award-panda').boundingBox())!;
    for (const b of [caption, sticker, machine, panda]) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(320);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(568);
    }
    expect(caption.y + caption.height).toBeLessThanOrEqual(Math.min(machine.y, panda.y));
    // A tap after the reveal closes it at once, even on the panda (it never swallows the tap).
    await page.mouse.click(panda.x + panda.width / 2, panda.y + panda.height / 2);
    await expect(award).toHaveCount(0, { timeout: 600 });
  });

  test('late in the day the drop curve makes a capsule (almost) never drop, with no countdown shown', async ({ page }) => {
    test.setTimeout(60_000);
    // k = 40 → p = 1 / (2^41 − 1): effectively no drop, without any cap in the code.
    await seed(page, { [KEY]: save({ daily: { date: today(), k: 40 } }) });
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await page.getByTestId('difficulty-easy').click();
    for (let i = 0; i < 5; i++) await answerMath(page);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('sticker-award')).toHaveCount(0);
  });

  test('an old v1 book is discarded without a crash and the kid starts with an empty v2 book', async ({ page }) => {
    const v1 = JSON.stringify({
      version: 1,
      earned: ['numbers_01', 'numbers_02'],
      day: today(),
      dayCount: 5,
      placedPieces: [],
      ownedAccessories: ['crown'],
      placements: {},
      seenCount: 0,
    });
    await seed(page, { [KEY]: v1 });
    await page.goto('/');
    await expect(page.getByTestId('home-sticker-new')).toHaveCount(0);
    await page.getByTestId('launch-sticker-book').click();
    await expect(page.getByTestId('sticker-book')).toBeVisible();
    await expect(page.getByTestId('sticker-slot')).toHaveCount(0);
  });

  test('duplicates stack with a ×N badge and shiny copies wear the gold rim', async ({ page }) => {
    await seed(page, {
      [KEY]: save({ copies: copies(['numbers_01', 'numbers_01', 'numbers_02'], ['numbers_02']), seenCount: 3 }),
    });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    const dup = page.locator('[data-testid="sticker-slot"][data-sticker="numbers_01"]');
    await expect(dup.getByTestId('sticker-count')).toHaveText('×2');
    await expect(dup.locator('[data-shiny="true"]')).toHaveCount(0);
    const shiny = page.locator('[data-testid="sticker-slot"][data-sticker="numbers_02"]');
    // The Art Director's pre-built shiny PNG: gold rim, sparkle baked in.
    await expect(shiny.locator('[data-shiny="true"] img').first()).toHaveAttribute('src', /numbers_02_shiny/);
    await expect(shiny.getByTestId('sticker-count')).toHaveCount(0);
    await expect(page.getByTestId('book-shelf-count-numbers')).toContainText('2 /');
  });

  test('an old town with items becomes the thank-you sticker and the town save is removed', async ({ page }) => {
    await seed(page, { gamification_town: JSON.stringify([[null, { id: 'house', emoji: '🏠' }]]) });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    await expect(page.getByTestId('book-specials').getByTestId('sticker-slot')).toHaveAttribute('data-sticker', 'general_thank_you');
    expect(await page.evaluate(() => localStorage.getItem('gamification_town'))).toBeNull();
  });

  test('my pages: drag copies from the tray, one placement per copy, size, turn, dress one copy, autosave', async ({ page }) => {
    await seed(page, {
      [KEY]: save({ copies: copies(['numbers_01', 'numbers_01', 'numbers_02']), seenCount: 3 }),
      gamification_stars: '15',
    });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    // The collection opens by default; a slot shows the sticker big, without the accessory tray.
    await expect(page.getByTestId('book-tab-collection')).toHaveAttribute('aria-selected', 'true');
    await page.locator('[data-testid="sticker-slot"][data-sticker="numbers_01"]').click();
    await expect(page.getByTestId('sticker-detail')).toBeVisible();
    await expect(page.getByTestId('accessory-tray')).toHaveCount(0);
    await page.getByTestId('sticker-detail-close').click();

    // No subtitle in the slim top bar: just the count; the hint lives inside an empty page.
    await expect(page.getByTestId('sticker-book-count')).toHaveText('2/105');
    await expect(page.getByTestId('book-panda')).toHaveCount(0);
    await page.getByTestId('book-tab-pages').click();
    // Scene backgrounds are the slot-free page card: no dashed placeholder shapes.
    for (const img of await page.getByTestId('page-backgrounds').locator('img').all()) {
      expect(await img.getAttribute('src')).not.toContain('outline');
    }
    await page.getByTestId('page-bg-paper').click();
    const board = page.getByTestId('page-board');
    await expect(board).toHaveAttribute('data-background', 'paper');
    // A blank page is plain cream with only a faint hint: no placeholder shapes.
    await expect(board.locator('img')).toHaveCount(0);
    await expect(board.getByTestId('page-empty-hint')).toHaveText('Drag stickers onto your page');
    await expect(page.getByTestId('page-label')).toHaveText('1/1');
    await expect(page.getByTestId('page-prev')).toHaveCount(0);
    const tray1 = page.locator('[data-testid="tray-sticker"][data-sticker="numbers_01"]');
    await expect(tray1).toHaveAttribute('data-free', '2');
    await expect(tray1.getByTestId('tray-count')).toHaveText('×2');

    // ×2 means two placements: one dragged, one tapped (lands in the middle), then it leaves the tray.
    await dragTo(page, tray1, board);
    await expect(board.getByTestId('page-sticker')).toHaveCount(1);
    await expect(board.getByTestId('page-empty-hint')).toHaveCount(0);
    await expect(tray1).toHaveAttribute('data-free', '1');
    await tray1.click();
    await expect(board.locator('[data-testid="page-sticker"][data-sticker="numbers_01"]')).toHaveCount(2);
    await expect(tray1).toHaveCount(0);
    await expect(page.locator('[data-testid="tray-sticker"][data-sticker="numbers_02"]')).toHaveAttribute('data-free', '1');

    // Tap to select: dashed box with size, turn and accessory handles.
    const first = board.locator('[data-testid="page-sticker"][data-uid="c1"]');
    const second = board.locator('[data-testid="page-sticker"][data-uid="c2"]');
    // Both start near the middle: move the second copy aside.
    const bb = (await board.boundingBox())!;
    await dragToPoint(page, second, bb.x + bb.width * 0.8, bb.y + bb.height * 0.7);
    await first.click();
    await expect(first).toHaveAttribute('data-selected', 'true');
    await expect(first.getByTestId('page-selection')).toBeVisible();
    await expect(first).toHaveAttribute('data-size', '1');
    await first.getByTestId('handle-size').click();
    await expect(first).toHaveAttribute('data-size', '2');
    const handle = first.getByTestId('handle-rotate');
    const fb = (await first.boundingBox())!;
    await dragToPoint(page, handle, fb.x + fb.width + 30, fb.y + fb.height / 2);
    await expect(first).not.toHaveAttribute('data-rotation', '0');

    // Accessories go on this copy only.
    await first.getByTestId('handle-accessory').click();
    await expect(page.getByTestId('sticker-detail')).toBeVisible();
    await page.getByTestId('buy-crown').click();
    await expect(page.getByTestId('accessory-crown')).toHaveAttribute('data-owned', 'true');
    // 5 stars left: the next one is too dear and just shakes.
    await page.getByTestId('buy-party_hat').click();
    await expect(page.getByTestId('not-enough-stars')).toBeVisible();
    await dragTo(page, page.getByTestId('accessory-crown'), page.getByTestId('sticker-detail-box'));
    await expect(page.getByTestId('sticker-detail-box').getByTestId('placed-accessory')).toHaveAttribute('data-accessory', 'crown');
    await page.getByTestId('sticker-detail-close').click();
    await expect(first.getByTestId('placed-accessory')).toHaveAttribute('data-accessory', 'crown');
    await expect(second.getByTestId('placed-accessory')).toHaveCount(0);

    // Autosaved: everything is back after a reload.
    await page.reload();
    await page.getByTestId('launch-sticker-book').click();
    await page.getByTestId('book-tab-pages').click();
    await expect(board.getByTestId('page-sticker')).toHaveCount(2);
    await expect(first).toHaveAttribute('data-size', '2');
    await expect(first.getByTestId('placed-accessory')).toHaveAttribute('data-accessory', 'crown');
    // Owned globally: the other copy can wear it without buying again.
    await second.click();
    await second.getByTestId('handle-accessory').click();
    await expect(page.getByTestId('accessory-crown')).toHaveAttribute('data-owned', 'true');
    await expect(page.getByTestId('buy-crown')).toHaveCount(0);
    await page.getByTestId('sticker-detail-close').click();

    // Dragging a placed copy back onto the tray peels it off.
    await dragTo(page, second, page.getByTestId('page-tray'));
    await expect(board.getByTestId('page-sticker')).toHaveCount(1);
    await expect(tray1).toHaveAttribute('data-free', '1');

    // On the last page the right arrow is "+": a second page on a scene background.
    await expect(page.getByTestId('page-next')).toHaveCount(0);
    await page.getByTestId('page-new').click();
    await page.getByTestId('page-bg-numbers').click();
    await expect(page.getByTestId('page-label')).toHaveText('2/2');
    await expect(board).toHaveAttribute('data-background', 'numbers');
    await expect(board.locator('img')).toHaveAttribute('src', /page_numbers/);
    await page.getByTestId('page-prev').click();
    await expect(page.getByTestId('page-label')).toHaveText('1/2');
    await expect(page.getByTestId('page-next')).toBeVisible();
    await expect(page.getByTestId('page-new')).toHaveCount(0);
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.version).toBe(2);
    expect(stored.pages.map((p: { background: string }) => p.background)).toEqual(['paper', 'numbers']);
    expect(stored.placements.c1).toEqual([expect.objectContaining({ accessoryId: 'crown' })]);

    await page.getByTestId('home-button').click();
    expect(await stars(page)).toBe(5);
  });

  test('print: a 2 s grown-up hold opens print; the page and the sticker sheet download as PDFs on web', async ({
    page,
  }) => {
    await seed(page, {
      [KEY]: save({
        copies: copies(['numbers_01', 'numbers_02', 'logic_01'], ['numbers_02']),
        pages: [
          {
            id: 'p1',
            background: 'numbers',
            stickers: [
              { uid: 'c1', x: 0.3, y: 0.4, size: 1, rotation: 20 },
              { uid: 'c2', x: 0.7, y: 0.6, size: 2, rotation: -10 },
            ],
          },
        ],
        ownedAccessories: ['crown'],
        placements: { c1: [{ accessoryId: 'crown', x: 0.5, y: 0.2 }] },
        seenCount: 3,
      }),
    });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    await page.getByTestId('book-tab-pages').click();
    await expect(page.getByTestId('page-board').getByTestId('page-sticker')).toHaveCount(2);

    // A quick tap is not enough: the print button sits behind the 2 s parent gate.
    const print = page.getByTestId('page-print');
    await print.click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('print-dialog')).toHaveCount(0);
    const pb = (await print.boundingBox())!;
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2300);
    await page.mouse.up();
    const dialog = page.getByTestId('print-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('print-background')).toBeChecked();
    await expect(page.getByTestId('print-sheet-count')).toContainText('3');

    const pdfOf = async (button: string) => {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId(button).click()]);
      const path = await download.path();
      const { readFileSync } = await import('node:fs');
      const bytes = readFileSync(path!);
      return {
        name: download.suggestedFilename(),
        head: bytes.subarray(0, 5).toString(),
        text: bytes.toString('latin1'),
      };
    };
    await page.getByTestId('print-paper-letter').click();
    await expect(page.getByTestId('print-paper-letter')).toHaveAttribute('aria-pressed', 'true');
    const pagePdf = await pdfOf('print-page');
    expect(pagePdf.name).toBe('tensaiasobi-page-1.pdf');
    expect(pagePdf.head).toBe('%PDF-');
    // Letter portrait (612 x 792 pt), like the page on screen, with the 200 dpi background image.
    expect(pagePdf.text).toMatch(/\/MediaBox \[0 0 612\.?\d* 792\.?\d*\]/);
    expect(pagePdf.text).toContain('/Subtype /Image');

    await page.getByTestId('print-paper-a4').click();
    const sheet = await pdfOf('print-sheet');
    expect(sheet.name).toBe('tensaiasobi-stickers.pdf');
    expect(sheet.head).toBe('%PDF-');
    // A4 portrait, vector only: no images on the sheet.
    expect(sheet.text).toMatch(/\/MediaBox \[0 0 595\.\d+ 841\.\d+\]/);
    expect(sheet.text).not.toContain('/Subtype /Image');
    await page.getByTestId('print-close').click();
    await expect(dialog).toHaveCount(0);
  });

  /** Tab labels or the book title cut short with an ellipsis. */
  const TRUNCATED_TABS = "[...document.querySelectorAll('[role=tab] span, [data-testid=book-top-bar] h2')].filter((e) => e.scrollWidth > e.clientWidth).length";

  test('my pages is mostly page: 48 px bar, 40 px tabs, an A4 page of 480+ px, 72 px tray, no scroll; fits 320x568', async ({
    page,
  }) => {
    const pages = Array.from({ length: 3 }, (_, i) => ({
      id: `p${i + 1}`,
      background: 'paper',
      stickers: i === 0 ? [{ uid: 'c1', x: 0.5, y: 0.5, size: 1, rotation: 0 }] : [],
    }));
    await seed(page, {
      [KEY]: save({ copies: copies(['numbers_01', 'numbers_02', 'logic_01']), pages, seenCount: 3 }),
    });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    const bar = (await page.getByTestId('book-top-bar').boundingBox())!;
    expect(bar.height).toBe(48);
    for (const id of ['home-button', 'page-print', 'stars-total']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(bar.y);
      expect(b.y + b.height).toBeLessThanOrEqual(bar.y + bar.height);
    }
    const tabs = (await page.getByRole('tablist').boundingBox())!;
    expect(tabs.height).toBe(40);
    expect(await page.evaluate<number>(TRUNCATED_TABS)).toBe(0);
    expect(tabs.y).toBeCloseTo(bar.y + bar.height, 0);
    // Collection starts right under the same header.
    const shelf = (await page.getByTestId('book-shelf-numbers').boundingBox())!;
    expect(shelf.y - (tabs.y + tabs.height)).toBeLessThanOrEqual(12);

    await page.getByTestId('book-tab-pages').click();
    const board = page.getByTestId('page-board');
    await expect(page.getByTestId('page-label')).toHaveText('3/3');
    const bb = (await board.boundingBox())!;
    const tray = (await page.getByTestId('page-tray').boundingBox())!;
    expect(bb.height).toBeGreaterThanOrEqual(480);
    expect(bb.height / bb.width).toBeCloseTo(Math.SQRT2, 1);
    expect(Math.abs(bb.x + bb.width / 2 - 375 / 2)).toBeLessThanOrEqual(1);
    expect(tray.height).toBe(72);
    expect(tray.y).toBeGreaterThanOrEqual(bb.y + bb.height);
    expect(tray.y + tray.height).toBeLessThanOrEqual(812);
    // Nothing scrolls on My pages: no scroll container (other than the sideways tray) has hidden content.
    expect(await page.evaluate<number>('document.documentElement.scrollHeight')).toBeLessThanOrEqual(812);
    expect(
      await page.evaluate<string[]>(
        "[...document.querySelectorAll('main, [data-testid=sticker-book] *')].filter((e) => !e.closest('[data-testid=page-tray]') && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1).map((e) => e.outerHTML.slice(0, 120))",
      ),
    ).toEqual([]);
    // Arrows sit on the page edges, mid-height, with the "n/N" label inside the bottom corner.
    const prev = (await page.getByTestId('page-prev').boundingBox())!;
    const plus = (await page.getByTestId('page-new').boundingBox())!;
    const label = (await page.getByTestId('page-label').boundingBox())!;
    expect(prev.width).toBe(36);
    expect(prev.x).toBeGreaterThanOrEqual(bb.x);
    expect(plus.x + plus.width).toBeLessThanOrEqual(bb.x + bb.width);
    expect(Math.abs(prev.y + prev.height / 2 - (bb.y + bb.height / 2))).toBeLessThanOrEqual(2);
    expect(label.y + label.height).toBeLessThanOrEqual(bb.y + bb.height);
    expect(label.y).toBeGreaterThan(bb.y + bb.height - 30);
    await page.getByTestId('page-prev').click();
    await expect(page.getByTestId('page-label')).toHaveText('2/3');
    await page.getByTestId('page-prev').click();
    await expect(page.getByTestId('page-empty-hint')).toHaveCount(0);

    // The grab handle folds the tray to 24 px and the page keeps its size.
    await page.getByTestId('tray-handle').click();
    await expect(page.getByTestId('page-tray')).toHaveAttribute('data-open', 'false');
    expect((await page.getByTestId('page-tray').boundingBox())!.height).toBe(24);
    await page.getByTestId('tray-handle').click();
    await expect(page.getByTestId('tray-sticker').first()).toBeVisible();
    expect((await page.getByTestId('tray-sticker').first().boundingBox())!.width).toBe(56);

    // 320x568: the same layout shrinks, no sideways scroll.
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(async () => {
      const small = (await board.boundingBox())!;
      const t2 = (await page.getByTestId('page-tray').boundingBox())!;
      expect(small.x).toBeGreaterThanOrEqual(0);
      expect(small.x + small.width).toBeLessThanOrEqual(320);
      expect(small.height).toBeGreaterThan(300);
      expect(t2.y).toBeGreaterThanOrEqual(small.y + small.height);
      expect(t2.y + t2.height).toBeLessThanOrEqual(568);
    }).toPass();
    for (const tab of ['collection', 'scenes', 'pages']) {
      const box = (await page.getByTestId(`book-tab-${tab}`).boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }
    expect(await page.evaluate<number>(TRUNCATED_TABS)).toBe(0);
    const star = (await page.getByTestId('stars-total').boundingBox())!;
    expect(star.x + star.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate<number>('document.documentElement.scrollWidth')).toBeLessThanOrEqual(320);
    expect(await page.evaluate<number>('document.documentElement.scrollHeight')).toBeLessThanOrEqual(568);

    // Wide screens: the same portrait page, centred, with the tray beside it.
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(async () => {
      const wide = (await board.boundingBox())!;
      const t3 = (await page.getByTestId('page-tray').boundingBox())!;
      expect(wide.height / wide.width).toBeCloseTo(Math.SQRT2, 1);
      expect(t3.x).toBeGreaterThanOrEqual(wide.x + wide.width);
    }).toPass();
  });

  test('my pages stop at 20: no "+" on the last page', async ({ page }) => {
    const pages = Array.from({ length: 20 }, (_, i) => ({ id: `p${i + 1}`, background: 'paper', stickers: [] }));
    await seed(page, { [KEY]: save({ copies: copies(['numbers_01']), pages, seenCount: 1 }) });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    await page.getByTestId('book-tab-pages').click();
    await expect(page.getByTestId('page-label')).toHaveText('20/20');
    await expect(page.getByTestId('page-new')).toHaveCount(0);
    await expect(page.getByTestId('page-next')).toHaveCount(0);
    await expect(page.getByTestId('page-prev')).toBeVisible();
  });

  test('the Numbers train scene snaps onto its outline page and a full scene shows the reward', async ({ page }) => {
    const pieces = ['scene_numbers_engine', 'scene_numbers_car_balls', 'scene_numbers_car_shapes', 'scene_numbers_owl_conductor'];
    await seed(page, { [KEY]: save({ copies: copies(pieces), placedPieces: pieces.slice(1), seenCount: 4 }) });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    await page.getByTestId('book-tab-scenes').click();
    const scene = page.getByTestId('scene-numbers');
    await expect(scene).toHaveAttribute('data-complete', 'false');
    // The Train day scene draws on the Art Director's outline page.
    await expect(scene.getByTestId('scene-page')).toBeVisible();
    const piece = scene.locator('[data-testid="scene-piece"][data-piece="scene_numbers_engine"]');
    await piece.scrollIntoViewIfNeeded();
    await dragTo(page, piece, scene.locator('[data-testid="scene-ghost"][data-piece="scene_numbers_engine"]'));
    await expect(scene).toHaveAttribute('data-complete', 'true');
    await expect(scene.getByTestId('scene-reward')).toBeVisible();
  });

  test('an outline-page scene snaps a piece onto its dashed slot', async ({ page }) => {
    const garden = ['scene_logic_circle_tree', 'scene_logic_tortoise', 'scene_logic_triangle_tent', 'scene_logic_block_steps'];
    await seed(page, { [KEY]: save({ copies: copies(garden), placedPieces: garden.slice(0, 3), seenCount: 4 }) });
    await page.goto('/');
    await page.getByTestId('launch-sticker-book').click();
    await page.getByTestId('book-tab-scenes').click();
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
    // Nothing earned yet: every slot waits as a pebble silhouette of its sticker.
    for (const shelf of ['numbers', 'language', 'logic', 'play']) {
      await expect(page.getByTestId(`book-moods-${shelf}`).getByTestId('sticker-slot-empty')).toHaveCount(4);
    }
    await expect(page.getByTestId('book-stickers-play').getByTestId('sticker-slot-empty')).toHaveCount(18);
    await expect(page.getByTestId('book-stickers-play').locator('[data-silhouette="true"]')).toHaveCount(18);
    await expect(page.getByTestId('book-shelf-count-play')).toContainText('0 / 26');
    // Special scenes, one per category: Reading corner, Shape garden and Playground use the outline pages.
    await page.getByTestId('book-tab-scenes').click();
    await expect(page.getByTestId('book-tab-scenes')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('book-shelf-numbers')).toHaveCount(0);
    for (const shelf of ['language', 'logic', 'play']) {
      await expect(page.getByTestId(`book-scenes-${shelf}`).getByTestId(`scene-${shelf}`).getByTestId('scene-page')).toBeVisible();
    }
  });
});
