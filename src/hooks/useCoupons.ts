import { useState, useCallback, useRef } from 'react';
import type { Coupon } from '../types/gamification';

const STORAGE_KEY = 'gamification_coupons';


const DEFAULT_COUPONS: Coupon[] = [
  { id: 'gummy_bear',   emoji: '🍬', nameKey: 'gummyBear',  enabled: true, rewardSize: 'small',  earnedCount: 0 },
  { id: 'ice_cream',    emoji: '🍦', nameKey: 'iceCream',   enabled: true, rewardSize: 'small',  earnedCount: 0 },
  { id: 'movie_night',  emoji: '🎬', nameKey: 'movieNight', enabled: true, rewardSize: 'medium', earnedCount: 0 },
  { id: 'new_toy',      emoji: '🧸', nameKey: 'newToy',     enabled: true, rewardSize: 'medium', earnedCount: 0 },
  { id: 'gaming',       emoji: '🎮', nameKey: 'gaming',     enabled: true, rewardSize: 'large',  earnedCount: 0 },
  { id: 'zoo',          emoji: '🦁', nameKey: 'zoo',        enabled: true, rewardSize: 'large',  earnedCount: 0 },
];

function loadCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Coupon[];

      return DEFAULT_COUPONS.map((def) => {
        const found = saved.find((c) => c.id === def.id);
        return found
          ? { ...def, enabled: found.enabled, earnedCount: found.earnedCount ?? 0, lastEarnedAt: found.lastEarnedAt }
          : def;
      });
    }
    return DEFAULT_COUPONS.map((c) => ({ ...c }));
  } catch {
    return DEFAULT_COUPONS.map((c) => ({ ...c }));
  }
}

function saveCoupons(coupons: Coupon[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
  } catch (e) {
    console.error('Error saving coupons', e);
  }
}

export interface UseCouponsReturn {
  coupons: Coupon[];
  toggleCoupon: (id: string) => void;
  awardCoupon: (id: string) => boolean;
  redeemCoupon: (id: string) => boolean;
  resetCoupons: () => void;
}

export function useCoupons(): UseCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>(loadCoupons);
  // Mirrors the latest coupons list synchronously (updated immediately, not only after a
  // re-render) so award/redeem can validate against fresh data even if called back-to-back
  // within the same tick, and can return an accurate success/failure result right away.
  const couponsRef = useRef<Coupon[]>(coupons);

  const commit = useCallback((next: Coupon[]) => {
    couponsRef.current = next;
    setCoupons(next);
    saveCoupons(next);
  }, []);

  const toggleCoupon = useCallback((id: string) => {
    const next = couponsRef.current.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
    commit(next);
  }, [commit]);

  const awardCoupon = useCallback((id: string): boolean => {
    if (!id) return false;
    const target = couponsRef.current.find((c) => c.id === id);
    if (!target || !target.enabled) return false;

    const next = couponsRef.current.map((c) =>
      c.id === id ? { ...c, earnedCount: c.earnedCount + 1, lastEarnedAt: Date.now() } : c
    );
    commit(next);
    return true;
  }, [commit]);

  const redeemCoupon = useCallback((id: string): boolean => {
    if (!id) return false;
    const target = couponsRef.current.find((c) => c.id === id);
    if (!target || target.earnedCount <= 0) return false;

    const next = couponsRef.current.map((c) =>
      c.id === id ? { ...c, earnedCount: c.earnedCount - 1 } : c
    );
    commit(next);
    return true;
  }, [commit]);

  const resetCoupons = useCallback(() => {
    const fresh = DEFAULT_COUPONS.map((c) => ({ ...c }));
    commit(fresh);
  }, [commit]);

  return { coupons, toggleCoupon, awardCoupon, redeemCoupon, resetCoupons };
}
