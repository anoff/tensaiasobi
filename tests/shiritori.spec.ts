import { test, expect, Page } from '@playwright/test';

// Helper to switch language using the test IDs
async function switchLanguage(page: Page, lang: 'en' | 'de' | 'ja') {
  const trigger = page.getByTestId('lang-dropdown-trigger');
  await expect(trigger).toBeVisible();
  
  const flags = { en: '🇬🇧', de: '🇩🇪', ja: '🇯🇵' } as const;
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
const cleanWesternWord = (word: string): string => {
  return word.toLowerCase().replace(/[^a-zäöüßа-я]/g, '');
};

const getStartChar = (word: string, lang: string): string => {
  if (!word) return '';
  if (lang === 'ja') {
    return word[0];
  }
  const cleaned = cleanWesternWord(word);
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
  const cleaned = cleanWesternWord(word);
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
  });

  const languages = ['en', 'de', 'ja'] as const;

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
      await expect(options).toHaveCount(9);

      // Find the correct matching option based on start/end letter compatibility
      let correctOptionLocator = null;

      for (let i = 0; i < 9; i++) {
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

  test('Verify incorrect match resets streak', async ({ page }) => {
    await switchLanguage(page, 'en');
    await page.getByTestId('launch-shiritori').click();

    const activeCard = page.getByTestId('active-card');
    const activeWord = await activeCard.getAttribute('data-word');
    const activeEndChar = getEndChar(activeWord || '', 'en');

    const options = page.getByTestId('shiritori-option');
    let wrongOptionLocator = null;

    for (let i = 0; i < 9; i++) {
      const option = options.nth(i);
      const word = await option.getAttribute('data-word');
      const startChar = getStartChar(word || '', 'en');
      if (!areCharsCompatible(activeEndChar, startChar, 'en')) {
        wrongOptionLocator = option;
        break;
      }
    }

    if (wrongOptionLocator) {
      await wrongOptionLocator.click();
      const streakCounter = page.locator('.bg-amber-100');
      await expect(streakCounter).toHaveText(/0/);
    }
  });

  test('Verify Japanese "ん" rule triggers game over', async ({ page }) => {
    await switchLanguage(page, 'ja');
    await page.getByTestId('launch-shiritori').click();

    const activeCard = page.getByTestId('active-card');
    const activeWord = await activeCard.getAttribute('data-word');
    const activeEndChar = getEndChar(activeWord || '', 'ja');

    const options = page.getByTestId('shiritori-option');
    let nOptionLocator = null;

    for (let i = 0; i < 9; i++) {
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
