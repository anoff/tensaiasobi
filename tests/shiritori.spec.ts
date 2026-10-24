import { test, expect, Page } from '@playwright/test';

// Helper to switch language using the test IDs
async function switchLanguage(page: Page, lang: 'en' | 'de' | 'ja' | 'fr' | 'ko') {
  const trigger = page.getByTestId('lang-dropdown-trigger');
  await expect(trigger).toBeVisible();
  
  const flags = { en: '🇬🇧', de: '🇩🇪', ja: '🇯🇵', fr: '🇫🇷', ko: '🇰🇷' } as const;
  const activeText = await trigger.innerText();
  if (activeText.includes(flags[lang])) {
    return; // Already in target language
  }

  await trigger.click();
  const option = page.getByTestId(`lang-select-${lang}`);
  await expect(option).toBeVisible();
  await option.click();
}

// Letter extraction logic (same as the game implementation)
const cleanWesternWord = (word: string, lang?: string): string => {
  let cleaned = word.toLowerCase();
  if (lang === 'fr') {
    cleaned = cleaned
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae');
  }
  return cleaned.replace(/[^a-zäöüßа-я]/g, '');
};

const getStartChar = (word: string, lang: string): string => {
  if (!word) return '';
  if (lang === 'ja' || lang === 'ko') {
    return word[0];
  }
  const cleaned = cleanWesternWord(word, lang);
  return cleaned.length > 0 ? cleaned[0].toUpperCase() : '';
};

const getEndChar = (word: string, lang: string): string => {
  if (!word) return '';
  if (lang === 'ja') {
    let trimmed = word;
    while (trimmed.endsWith('ー') && trimmed.length > 1) {
      trimmed = trimmed.slice(0, -1);
    }
    const last = trimmed[trimmed.length - 1];
    const smallToBig: Record<string, string> = {
      'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
      'っ': 'つ',
      'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
      'ゎ': 'わ'
    };
    return smallToBig[last] || last;
  }
  if (lang === 'ko') {
    return word[word.length - 1];
  }
  const cleaned = cleanWesternWord(word, lang);
  return cleaned.length > 0 ? cleaned[cleaned.length - 1].toUpperCase() : '';
};

const KANA_BASE_MAP: Record<string, string> = {
  'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
  'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
  'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
  'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
  'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
};

const areCharsCompatible = (endChar: string, startChar: string, lang: string): boolean => {
  if (!endChar || !startChar) return false;
  if (lang === 'ja') {
    const base1 = KANA_BASE_MAP[endChar] || endChar;
    const base2 = KANA_BASE_MAP[startChar] || startChar;
    return base1 === base2;
  }
  return endChar.toUpperCase() === startChar.toUpperCase();
};

test.describe('tensaiasobi Shiritori Game E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-big').click();
  });

  const languages = ['en', 'de', 'ja', 'fr', 'ko'] as const;

  for (const lang of languages) {
    test(`Verify Shiritori game initializes and play round works in ${lang.toUpperCase()}`, async ({ page }) => {
      // 1. Switch language and launch game
      await switchLanguage(page, lang);
      const launcher = page.getByTestId('launch-shiritori');
      await expect(launcher).toBeVisible();
      await launcher.click();

      // Verify page title
      const title = page.locator('h2');
      await expect(title).toBeVisible();

      // 2. Locate active card and retrieve attributes
      const activeCard = page.getByTestId('active-card');
      await expect(activeCard).toBeVisible();
      const activeWord = await activeCard.getAttribute('data-word');
      expect(activeWord).not.toBeNull();
      const activeEndChar = getEndChar(activeWord || '', lang);

      // 3. Locate options
      const options = page.getByTestId('shiritori-option');
      // School starts on medium: four pictures, words hidden until a miss.
      await expect(options).toHaveCount(4);
      await expect(page.getByTestId('shiritori-option-label')).toHaveCount(0);

      // Find the correct matching option based on start/end letter compatibility
      let correctOptionLocator = null;

      for (let i = 0; i < 4; i++) {
        const option = options.nth(i);
        const word = await option.getAttribute('data-word');
        const startChar = getStartChar(word || '', lang);
        
        if (areCharsCompatible(activeEndChar, startChar, lang)) {
          // Verify if it doesn't end with 'ん' in Japanese (if we want a normal play)
          if (lang === 'ja' && getEndChar(word || '', 'ja') === 'ん') {
            // Keep this as a trap option
            continue;
          }
          correctOptionLocator = option;
        }
      }

      // If we found a valid correct option, click it
      if (correctOptionLocator) {
        await correctOptionLocator.click();
        
        // Streak counter should show at least 1 after correct match
        const streakCounter = page.locator('.bg-amber-100');
        await expect(streakCounter).toBeVisible();
        const text = await streakCounter.innerText();
        expect(text).toContain('1');
      }
    });
  }

  test('Verify incorrect match resets streak and reveals the words on medium', async ({ page }) => {
    await switchLanguage(page, 'en');
    await page.getByTestId('launch-shiritori').click();

    const activeCard = page.getByTestId('active-card');
    const activeWord = await activeCard.getAttribute('data-word');
    const activeEndChar = getEndChar(activeWord || '', 'en');

    const options = page.getByTestId('shiritori-option');
    const labels = page.getByTestId('shiritori-option-label');
    await expect(options).toHaveCount(4);
    await expect(labels).toHaveCount(0);

    let wrongOptionLocator = null;
    for (let i = 0; i < 4; i++) {
      const option = options.nth(i);
      const word = await option.getAttribute('data-word');
      const startChar = getStartChar(word || '', 'en');
      if (!areCharsCompatible(activeEndChar, startChar, 'en')) {
        wrongOptionLocator = option;
        break;
      }
    }

    // The generator always fills the other three slots with non-matching words.
    expect(wrongOptionLocator).not.toBeNull();
    await wrongOptionLocator!.click();
    const streakCounter = page.locator('.bg-amber-100');
    await expect(streakCounter).toHaveText(/0/);

    // One miss brings the words back on every option, and they stay.
    await expect(labels).toHaveCount(4);
    await page.waitForTimeout(800);
    await expect(labels).toHaveCount(4);
  });

  test('Verify hard keeps the words hidden after a wrong pick', async ({ page }) => {
    await switchLanguage(page, 'en');
    await page.getByTestId('launch-shiritori').click();
    await page.getByTestId('difficulty-hard').click();

    const activeCard = page.getByTestId('active-card');
    const activeWord = await activeCard.getAttribute('data-word');
    const activeEndChar = getEndChar(activeWord || '', 'en');

    const options = page.getByTestId('shiritori-option');
    const labels = page.getByTestId('shiritori-option-label');
    await expect(options).toHaveCount(6);
    await expect(labels).toHaveCount(0);

    let wrongOptionLocator = null;
    for (let i = 0; i < 6; i++) {
      const option = options.nth(i);
      const word = await option.getAttribute('data-word');
      if (!areCharsCompatible(activeEndChar, getStartChar(word || '', 'en'), 'en')) {
        wrongOptionLocator = option;
        break;
      }
    }

    expect(wrongOptionLocator).not.toBeNull();
    await wrongOptionLocator!.click();
    await expect(page.locator('.bg-amber-100')).toHaveText(/0/);
    await expect(labels).toHaveCount(0);
  });

  test('Verify Japanese "ん" rule triggers game over', async ({ page }) => {
    await switchLanguage(page, 'ja');
    await page.getByTestId('launch-shiritori').click();
    // The ん trap only appears on the six-picture hard board.
    await page.getByTestId('difficulty-hard').click();

    const activeCard = page.getByTestId('active-card');
    const activeWord = await activeCard.getAttribute('data-word');
    const activeEndChar = getEndChar(activeWord || '', 'ja');

    const options = page.getByTestId('shiritori-option');
    let nOptionLocator = null;
    await expect(options).toHaveCount(6);
    await expect(page.getByTestId('shiritori-option-label')).toHaveCount(0);

    for (let i = 0; i < 6; i++) {
      const option = options.nth(i);
      const word = await option.getAttribute('data-word');
      const startChar = getStartChar(word || '', 'ja');
      const endChar = getEndChar(word || '', 'ja');
      
      if (areCharsCompatible(activeEndChar, startChar, 'ja') && endChar === 'ん') {
        nOptionLocator = option;
        break;
      }
    }

    if (nOptionLocator) {
      await nOptionLocator.click();
      const gameOverTitle = page.locator('h3');
      await expect(gameOverTitle).toBeVisible();
      const text = await gameOverTitle.innerText();
      expect(text).toContain('おしまい');
    }
  });
});

test.describe('Word Chain fits a phone screen', () => {
  // Every option must be tappable without scrolling on a typical phone, with
  // or without the words that a miss reveals on medium.
  async function scrollToTop(page: Page) {
    // String form: the tests tsconfig has no DOM lib.
    await page.evaluate(`window.scrollTo(0, 0);
      document.querySelectorAll('*').forEach((el) => { el.scrollTop = 0; });`);
  }

  async function expectOptionsInViewport(page: Page, count: number) {
    await scrollToTop(page);
    const options = page.getByTestId('shiritori-option');
    await expect(options).toHaveCount(count);
    const viewport = page.viewportSize()!;
    for (let i = 0; i < count; i++) {
      const box = await options.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
  }

  async function pickWrong(page: Page, count: number, lang: 'en' | 'ja' = 'en') {
    const activeWord = await page.getByTestId('active-card').getAttribute('data-word');
    const activeEndChar = getEndChar(activeWord || '', lang);
    const options = page.getByTestId('shiritori-option');
    for (let i = 0; i < count; i++) {
      const word = await options.nth(i).getAttribute('data-word');
      if (!areCharsCompatible(activeEndChar, getStartChar(word || '', lang), lang)) {
        await options.nth(i).click();
        return;
      }
    }
    throw new Error('no wrong option on the board');
  }

  async function openWordChain(page: Page, lang: 'en' | 'ja' = 'en') {
    await page.goto('/');
    await page.getByTestId('age-mode-big').click();
    await switchLanguage(page, lang);
    await page.getByTestId('launch-shiritori').click();
    await expect(page.getByTestId('active-card')).toBeVisible();
  }

  // The panda's speech sits on the card's top edge; it must stay clear of the options.
  async function expectSpeechClearOfOptions(page: Page) {
    const speech = await page.getByTestId('panda-speech').boundingBox();
    expect(speech).not.toBeNull();
    expect(speech!.y).toBeGreaterThanOrEqual(0);
    const firstOption = await page.getByTestId('shiritori-option').first().boundingBox();
    expect(speech!.y + speech!.height).toBeLessThan(firstOption!.y);
  }

  // Japanese has the longest button and help lines, so it is the real risk.
  for (const lang of ['en', 'ja'] as const) {
    for (const mode of ['solo', 'panda'] as const) {
      test(`390x844 ${lang.toUpperCase()} ${mode}: medium, medium after a miss and hard show every option without scrolling`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openWordChain(page, lang);
        if (mode === 'panda') {
          await page.getByTestId('shiritori-mode-panda').click();
          await expect(page.getByTestId('panda-speech')).toBeVisible();
        }

        await expectOptionsInViewport(page, 4);
        if (mode === 'panda') await expectSpeechClearOfOptions(page);

        await pickWrong(page, 4, lang);
        await expect(page.getByTestId('shiritori-option-label')).toHaveCount(4);
        await expectOptionsInViewport(page, 4);
        if (mode === 'panda') await expectSpeechClearOfOptions(page);

        await page.getByTestId('difficulty-hard').click();
        await expectOptionsInViewport(page, 6);
        if (mode === 'panda') await expectSpeechClearOfOptions(page);
        await pickWrong(page, 6, lang);
        await expectOptionsInViewport(page, 6);
      });
    }
  }

  test('360x640: nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await openWordChain(page);

    const noSideScroll = async () => {
      // Page and the <main> scroller must not be wider than the screen.
      const overflow = await page.evaluate<number[]>(`[document.documentElement, ...document.querySelectorAll('main')]
        .map((el) => el.scrollWidth - el.clientWidth)`);
      for (const extra of overflow) expect(extra).toBeLessThanOrEqual(0);
    };

    await noSideScroll();
    await pickWrong(page, 4);
    await expect(page.getByTestId('shiritori-option-label')).toHaveCount(4);
    await noSideScroll();
    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('shiritori-option')).toHaveCount(6);
    await noSideScroll();
  });
});
