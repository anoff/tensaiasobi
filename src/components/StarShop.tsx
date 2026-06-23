import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { TOWN_ITEMS, SHOP_CATEGORIES } from '../data/townItems';
import type { Voucher } from '../types/gamification';

interface StarShopProps {
  stars: number;
  vouchers: Voucher[];
  onRedeemVoucher: (id: string) => void;
  playPop: () => void;
}

type Tab = 'items' | 'vouchers';

export function StarShop({
  stars,
  vouchers,
  onRedeemVoucher,
  playPop,
}: StarShopProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('items');

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    playPop();
  };

  const handleRedeem = (voucher: Voucher) => {
    if (voucher.redeemedAt) return;
    if (stars < voucher.cost) return;
    onRedeemVoucher(voucher.id);
  };

  const enabledVouchers = vouchers.filter((v) => v.enabled);

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tight">{t.shop.title}</h2>
        <div className="inline-flex items-center gap-1.5 mt-2 bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 rounded-full px-4 py-1.5 shadow-sm select-none">
          <span className="text-xl">⭐</span>
          <span className="text-lg font-black text-amber-800 tabular-nums">{stars}</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mx-auto bg-white/40 rounded-2xl p-1 border border-white/60 shadow-sm">
        <button
          onClick={() => handleTabChange('items')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
            tab === 'items'
              ? 'bg-gradient-to-b from-pink-400 to-pink-500 text-white shadow-md scale-105'
              : 'text-gray-500 hover:bg-white/60'
          }`}
        >
          🏘️ {t.shop.items}
        </button>
        <button
          onClick={() => handleTabChange('vouchers')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
            tab === 'vouchers'
              ? 'bg-gradient-to-b from-violet-400 to-violet-500 text-white shadow-md scale-105'
              : 'text-gray-500 hover:bg-white/60'
          }`}
        >
          🎟️ {t.shop.vouchers}
        </button>
      </div>

      {/* Items Tab */}
      {tab === 'items' && (
        <div className="flex flex-col gap-5">
          {SHOP_CATEGORIES.map((cat) => {
            const items = TOWN_ITEMS.filter((i) => i.category === cat.id);
            if (items.length === 0) return null;

            return (
              <div key={cat.id}>
                <h3 className="text-sm font-bold text-gray-500 mb-2 px-1">
                  {cat.emoji}{' '}
                  {(t.town.categories as Record<string, string>)[cat.nameKey] ?? cat.nameKey}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((item) => {
                    const canAfford = stars >= item.cost;
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col items-center gap-0.5 rounded-2xl p-3 border-2 transition-all duration-200 select-none ${
                          canAfford
                            ? 'bg-gradient-to-b from-white to-sky-50 border-sky-200 shadow-sm'
                            : 'bg-gray-100 border-gray-200 opacity-50'
                        }`}
                      >
                        <span className="text-3xl leading-none">{item.emoji}</span>
                        <span className="text-xs font-semibold text-gray-700 text-center truncate w-full">
                          {(t.town.items as Record<string, string>)[item.nameKey] ?? item.nameKey}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            canAfford ? 'text-amber-600' : 'text-gray-400'
                          }`}
                        >
                          ⭐ {item.cost}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vouchers Tab */}
      {tab === 'vouchers' && (
        <div className="flex flex-col gap-3">
          {enabledVouchers.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8 italic">
              No vouchers available
            </p>
          )}
          {enabledVouchers.map((voucher) => {
            const isRedeemed = !!voucher.redeemedAt;
            const canAfford = stars >= voucher.cost;

            return (
              <div
                key={voucher.id}
                className={`relative flex items-center gap-3 rounded-2xl p-4 border-2 transition-all duration-300 ${
                  isRedeemed
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                    : canAfford
                      ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                      : 'bg-gray-100 border-gray-200 opacity-60'
                }`}
              >
                <span className="text-4xl leading-none shrink-0">{voucher.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">
                    {(t.shop.voucherNames as Record<string, string>)[voucher.nameKey] ??
                      voucher.nameKey}
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      isRedeemed
                        ? 'text-green-600'
                        : canAfford
                          ? 'text-amber-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {t.shop.cost}: ⭐ {voucher.cost}
                  </p>
                </div>
                <div className="shrink-0">
                  {isRedeemed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 rounded-full px-3 py-1.5">
                      {t.shop.redeemed}
                    </span>
                  ) : canAfford ? (
                    <button
                      onClick={() => handleRedeem(voucher)}
                      className="bg-gradient-to-b from-violet-400 to-violet-500 text-white text-xs font-bold rounded-full px-4 py-1.5 shadow-md hover:scale-105 active:scale-95 transition-transform duration-150"
                    >
                      {t.shop.redeem}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded-full px-3 py-1.5">
                      {t.shop.notEnough}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StarShop;
