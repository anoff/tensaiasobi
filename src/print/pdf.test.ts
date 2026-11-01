import { describe, expect, it } from 'vitest';
import { emptyStickerSave } from '../data/stickerRules';
import { ACCESSORIES, GENERAL_STICKERS, MOODS, SCENE_PIECES, SHELF_STICKERS, SHELVES } from '../data/stickers';
import { hasPrintArt, sheetStickers } from './pdf';

describe('print pdf data', () => {
  it('has vector print art for every sticker, scene piece, mood, general sticker and accessory', () => {
    const ids = [
      ...SHELVES.flatMap((s) => SHELF_STICKERS[s].map((c) => c.id)),
      ...SHELVES.flatMap((s) => SCENE_PIECES[s].map((p) => p.id)),
      ...MOODS.map((m) => m.id),
      ...GENERAL_STICKERS.map((g) => g.id),
      ...ACCESSORIES.map((a) => `acc_${a.id}`),
    ];
    expect(ids.length).toBeGreaterThan(100);
    expect(ids.filter((id) => !hasPrintArt(id))).toEqual([]);
  });

  it('puts each owned sticker on the sheet once, in earn order, gold if any copy is shiny', () => {
    const book = {
      ...emptyStickerSave(),
      copies: [
        { uid: 'c1', id: 'numbers_02', shiny: false },
        { uid: 'c2', id: 'numbers_01', shiny: false },
        { uid: 'c3', id: 'numbers_02', shiny: true },
        { uid: 'c4', id: 'not_a_sticker', shiny: false },
      ],
    };
    expect(sheetStickers(book)).toEqual([
      { id: 'numbers_02', shiny: true },
      { id: 'numbers_01', shiny: false },
    ]);
  });
});
