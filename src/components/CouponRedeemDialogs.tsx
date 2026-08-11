import { useTranslation } from '../hooks/useTranslation';
import GameConfetti from './GameConfetti';
import KidButton from './KidButton';
import type { Coupon } from '../types/gamification';
import type { TranslationSchema } from '../locales';

function couponName(coupon: Coupon, t: TranslationSchema): string {
  return (t.coupons.couponNames as Record<string, string>)[coupon.nameKey] ?? coupon.nameKey;
}

interface RedeemConfirmDialogProps {
  coupon: Coupon;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Second (custom) confirmation step required before an earned coupon is consumed */
export function RedeemConfirmDialog({ coupon, onCancel, onConfirm }: RedeemConfirmDialogProps) {
  const { t } = useTranslation();
  const name = couponName(coupon, t);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-3xl border-4 border-violet-300 p-6 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        data-testid="redeem-confirm-dialog"
      >
        <span className="text-5xl block mb-2">{coupon.emoji}</span>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.coupons.redeemConfirmTitle}</h2>
        <p className="text-slate-600 mb-6 text-sm">
          {t.coupons.redeemConfirmBody.replace('{name}', name)}
        </p>
        <div className="flex gap-4">
          <button
            type="button"
            data-testid="redeem-confirm-cancel"
            onClick={onCancel}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-2xl transition-colors cursor-pointer text-sm"
          >
            {t.parentGate.cancel}
          </button>
          <button
            type="button"
            data-testid="redeem-confirm-submit"
            onClick={onConfirm}
            className="flex-1 bg-violet-500 hover:bg-violet-600 text-white font-bold py-3 rounded-2xl transition-colors cursor-pointer text-sm"
          >
            {t.coupons.redeemConfirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CouponCelebrationProps {
  coupon: Coupon;
  onClose: () => void;
}

/** Celebration overlay shown right after a coupon has been successfully redeemed */
export function CouponCelebration({ coupon, onClose }: CouponCelebrationProps) {
  const { t } = useTranslation();
  const name = couponName(coupon, t);

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300"
      data-testid="coupon-celebration"
    >
      <GameConfetti pieces={200} recycle={false} />
      <div className="bg-white rounded-[3rem] border-8 border-violet-400 p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <span className="text-8xl block animate-bounce">{coupon.emoji}🎉</span>
        <h2 className="text-3xl font-black text-violet-800 leading-tight">
          {t.coupons.celebrationTitle}
        </h2>
        <p className="text-slate-500 font-extrabold text-sm">
          {t.coupons.celebrationBody.replace('{name}', name)}
        </p>
        <KidButton
          color="green"
          size="lg"
          data-testid="coupon-celebration-close"
          onClick={onClose}
          className="w-full rounded-2xl tracking-wider uppercase"
        >
          {t.coupons.celebrationClose}
        </KidButton>
      </div>
    </div>
  );
}
