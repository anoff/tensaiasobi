import { useEffect, useState } from 'react';
import type { BookPage, StickerSave } from '../../data/stickerRules';
import { useTranslation } from '../../hooks/useTranslation';
import { paperForLocale, sheetLayout, type PaperSize } from '../../print/layout';
import { BUTTER, INK, hardShadow } from '../../theme/blockTable';

interface PrintDialogProps {
  book: StickerSave;
  /** The page on screen, or undefined while choosing a background. */
  page: BookPage | undefined;
  pageNumber: number;
  onClose: () => void;
}

type Job = 'page' | 'sheet';

/** Grown-up print options: paper size, page background, and the two PDFs. Opened behind the 2 s hold. */
export function PrintDialog({ book, page, pageNumber, onClose }: PrintDialogProps) {
  const { t } = useTranslation();
  const [paper, setPaper] = useState<PaperSize>(() =>
    paperForLocale(typeof navigator === 'undefined' ? undefined : navigator.language)
  );
  const [background, setBackground] = useState(true);
  const [busy, setBusy] = useState<Job | null>(null);
  const [sheetCount, setSheetCount] = useState<number | null>(null);

  // Count lazily too: the print module (and its SVG url map) only loads once a grown-up opens this.
  useEffect(() => {
    let live = true;
    void import('../../print/pdf').then((m) => live && setSheetCount(m.sheetStickers(book).length));
    return () => {
      live = false;
    };
  }, [book]);
  const sheets = sheetCount === null ? 0 : sheetLayout(paper, sheetCount).pages.length;

  const run = async (job: Job) => {
    setBusy(job);
    try {
      const pdf = await import('../../print/pdf');
      const doc =
        job === 'page' && page ? await pdf.pagePdf(book, page, paper, background) : await pdf.sheetPdf(book, paper);
      await pdf.savePdf(doc, job === 'page' ? `tensaiasobi-page-${pageNumber}.pdf` : 'tensaiasobi-stickers.pdf');
    } catch (e) {
      console.error('print failed', e);
    } finally {
      setBusy(null);
    }
  };

  const chip = (on: boolean) => ({
    backgroundColor: on ? BUTTER : '#fff',
    borderColor: INK,
    color: INK,
    boxShadow: on ? hardShadow(2, 3) : undefined,
  });
  const action =
    'flex w-full items-center justify-center rounded-2xl border-[3px] px-4 py-3 text-base font-black disabled:opacity-40';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(42, 28, 20, 0.45)' }}
      data-testid="print-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t.stickerBook.printTitle}
      onPointerDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className="w-full max-w-xs space-y-4 rounded-3xl border-[3px] p-4"
        style={{ backgroundColor: '#fff', borderColor: INK, boxShadow: hardShadow(4, 5) }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: INK }}>
            {t.stickerBook.printTitle}
          </h2>
          <button
            type="button"
            data-testid="print-close"
            aria-label="✕"
            disabled={busy !== null}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] font-black"
            style={{ borderColor: INK, color: INK }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-extrabold" style={{ color: INK }}>
            {t.stickerBook.printPaper}
          </p>
          <div className="flex gap-2">
            {(['a4', 'letter'] as const).map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`print-paper-${p}`}
                aria-pressed={paper === p}
                onClick={() => setPaper(p)}
                className="flex-1 rounded-full border-[3px] px-3 py-1.5 text-sm font-black"
                style={chip(paper === p)}
              >
                {p === 'a4' ? 'A4' : 'Letter'}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-extrabold" style={{ color: INK }}>
          <input
            type="checkbox"
            data-testid="print-background"
            checked={background}
            onChange={(e) => setBackground(e.target.checked)}
            className="h-5 w-5 accent-[#ffc21a]"
          />
          {t.stickerBook.printBackground}
        </label>

        <div className="space-y-2">
          <button
            type="button"
            data-testid="print-page"
            disabled={!page || busy !== null}
            onClick={() => run('page')}
            className={action}
            style={{ backgroundColor: BUTTER, borderColor: INK, color: INK, boxShadow: hardShadow(3, 4) }}
          >
            {busy === 'page' ? t.stickerBook.printBusy : t.stickerBook.printPage}
          </button>
          <button
            type="button"
            data-testid="print-sheet"
            disabled={!sheetCount || busy !== null}
            onClick={() => run('sheet')}
            className={action}
            style={{ backgroundColor: '#fff', borderColor: INK, color: INK, boxShadow: hardShadow(3, 4) }}
          >
            {busy === 'sheet' ? t.stickerBook.printBusy : t.stickerBook.printSheet}
          </button>
          <p className="text-center text-xs font-bold" style={{ color: '#6b5a4c' }} data-testid="print-sheet-count">
            {t.stickerBook.printSheetCount.replace('{n}', String(sheetCount ?? 0)).replace('{pages}', String(sheets))}
          </p>
        </div>
      </div>
    </div>
  );
}
