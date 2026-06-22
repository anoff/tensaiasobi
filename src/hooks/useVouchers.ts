import { useState, useCallback } from 'react';
import type { Voucher } from '../types/gamification';

const STORAGE_KEY = 'gamification_vouchers';

/** Preset voucher definitions */
const DEFAULT_VOUCHERS: Voucher[] = [
  { id: 'gummy_bear',   emoji: '🍬', nameKey: 'gummyBear',  cost: 50,  enabled: true },
  { id: 'ice_cream',    emoji: '🍦', nameKey: 'iceCream',   cost: 100, enabled: true },
  { id: 'movie_night',  emoji: '🎬', nameKey: 'movieNight', cost: 150, enabled: true },
  { id: 'new_toy',      emoji: '🧸', nameKey: 'newToy',     cost: 200, enabled: true },
  { id: 'gaming',       emoji: '🎮', nameKey: 'gaming',     cost: 300, enabled: true },
  { id: 'zoo',          emoji: '🦁', nameKey: 'zoo',        cost: 500, enabled: true },
];

function loadVouchers(): Voucher[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Voucher[];
      // Merge saved state with defaults to pick up any new preset vouchers
      return DEFAULT_VOUCHERS.map((def) => {
        const found = saved.find((v) => v.id === def.id);
        return found ? { ...def, cost: found.cost, enabled: found.enabled, redeemedAt: found.redeemedAt } : def;
      });
    }
    return DEFAULT_VOUCHERS.map((v) => ({ ...v }));
  } catch {
    return DEFAULT_VOUCHERS.map((v) => ({ ...v }));
  }
}

function saveVouchers(vouchers: Voucher[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vouchers));
  } catch (e) {
    console.error('Error saving vouchers', e);
  }
}

export interface UseVouchersReturn {
  vouchers: Voucher[];
  setVoucherCost: (id: string, cost: number) => void;
  toggleVoucher: (id: string) => void;
  redeemVoucher: (id: string, spendStars: (amount: number) => boolean) => boolean;
  resetVouchers: () => void;
}

export function useVouchers(): UseVouchersReturn {
  const [vouchers, setVouchers] = useState<Voucher[]>(loadVouchers);

  const setVoucherCost = useCallback((id: string, cost: number) => {
    setVouchers((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, cost: Math.max(1, cost) } : v));
      saveVouchers(next);
      return next;
    });
  }, []);

  const toggleVoucher = useCallback((id: string) => {
    setVouchers((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, enabled: !v.enabled } : v));
      saveVouchers(next);
      return next;
    });
  }, []);

  const redeemVoucher = useCallback((id: string, spendStars: (amount: number) => boolean): boolean => {
    const voucher = vouchers.find((v) => v.id === id);
    if (!voucher || !voucher.enabled) return false;

    const success = spendStars(voucher.cost);
    if (success) {
      setVouchers((prev) => {
        const next = prev.map((v) =>
          v.id === id ? { ...v, redeemedAt: Date.now() } : v
        );
        saveVouchers(next);
        return next;
      });
    }
    return success;
  }, [vouchers]);

  const resetVouchers = useCallback(() => {
    const fresh = DEFAULT_VOUCHERS.map((v) => ({ ...v }));
    setVouchers(fresh);
    saveVouchers(fresh);
  }, []);

  return { vouchers, setVoucherCost, toggleVoucher, redeemVoucher, resetVouchers };
}
