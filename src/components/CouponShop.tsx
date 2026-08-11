import { useTranslation } from '../hooks/useTranslation';
import type { Coupon } from '../types/gamification';

interface CouponShopProps {
  coupons: Coupon[];
  /** Requests to award a coupon; the caller is responsible for confirming before granting it */
  onAwardCoupon: (id: string) => void;
  playPop: () => void;
}

export function CouponShop({ coupons, onAwardCoupon, playPop }: CouponShopProps) {
  const { t } = useTranslation();

  const earnedCoupons = coupons.filter((c) => c.earnedCount > 0);

  const couponName = (coupon: Coupon) =>
    (t.coupons.couponNames as Record<string, string>)[coupon.nameKey] ?? coupon.nameKey;

  const handleAwardClick = (coupon: Coupon) => {
    playPop();
    onAwardCoupon(coupon.id);
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tight">{t.coupons.title}</h2>
      </div>

      {/* Earned Coupons */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 mb-2 px-1">{t.coupons.earnedTitle}</h3>
        {earnedCoupons.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6 italic">{t.coupons.none}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {earnedCoupons.map((coupon) => (
              <div
                key={coupon.id}
                data-testid={`earned-coupon-${coupon.id}`}
                className="flex flex-col items-center gap-0.5 rounded-2xl p-3 border-2 bg-gradient-to-b from-green-50 to-emerald-50 border-green-300 shadow-sm select-none"
              >
                <span className="text-3xl leading-none">{coupon.emoji}</span>
                <span className="text-xs font-semibold text-gray-700 text-center truncate w-full">
                  {couponName(coupon)}
                </span>
                <span className="text-xs font-bold text-green-600">
                  {t.coupons.earnedCount.replace('{count}', coupon.earnedCount.toString())}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Coupons Catalog */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-500 mb-1 px-1">{t.coupons.catalogTitle}</h3>
        {coupons.map((coupon) => {
          const isEarned = coupon.earnedCount > 0;
          return (
            <div
              key={coupon.id}
              className={`relative flex items-center gap-3 rounded-2xl p-4 border-2 transition-all duration-300 ${
                isEarned
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                  : 'bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-300'
              }`}
            >
              <span className="text-4xl leading-none shrink-0">{coupon.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{couponName(coupon)}</p>
                {isEarned && (
                  <p className="text-xs font-bold text-green-600">
                    {t.coupons.earnedCount.replace('{count}', coupon.earnedCount.toString())}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {coupon.enabled ? (
                  <button
                    data-testid={`award-coupon-${coupon.id}`}
                    onClick={() => handleAwardClick(coupon)}
                    className="bg-gradient-to-b from-violet-400 to-violet-500 text-white text-xs font-bold rounded-full px-4 py-1.5 shadow-md hover:scale-105 active:scale-95 transition-transform duration-150"
                  >
                    {t.coupons.award}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded-full px-3 py-1.5">
                    {t.coupons.disabled}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CouponShop;
