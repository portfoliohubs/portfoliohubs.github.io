import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { ServiceId } from '../services';

export interface PromoCodeDoc {
  code: string;
  service: ServiceId;
  maxRedemptions: number;
  redeemedCount: number;
  active: boolean;
  createdAt: any;
  notes?: string;
}

export interface PromoRedemptionResult {
  success: boolean;
  message: string;
}

/**
 * Check if the current user has already unlocked/redeemed the requested service
 */
export async function hasServiceAccess(service: ServiceId): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    // Check local session storage for temporary guest unlock (e.g. single-use session for DSD/Motion)
    const localUnlock = sessionStorage.getItem(`unlocked_${service}`);
    return localUnlock === 'true';
  }

  // Admins have access to all services
  const adminEmails = ['cources01@gmail.com', 'admin@portfoliohubs.com', 'portfoliohubs.contact@gmail.com'];
  if (user.email && adminEmails.includes(user.email)) {
    return true;
  }

  try {
    const q = query(
      collection(db, 'promo_redemptions'),
      where('uid', '==', user.uid),
      where('service', '==', service)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return true;
    }
  } catch (error) {
    console.warn(`Error checking service redemption for ${service}:`, error);
  }

  // Fallback to session unlock
  const localUnlock = sessionStorage.getItem(`unlocked_${service}`);
  return localUnlock === 'true';
}

/**
 * Validates and redeems a single-use or multi-use promo code for a given service.
 */
export async function redeemPromoCode(codeRaw: string, targetService: ServiceId): Promise<PromoRedemptionResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) {
    return { success: false, message: 'Please enter a promo code.' };
  }

  const user = auth.currentUser;
  const uid = user ? user.uid : `guest_${Math.random().toString(36).substring(2, 10)}`;

  try {
    const codeRef = doc(db, 'promo_codes', code);

    const result = await runTransaction(db, async (transaction) => {
      const codeSnap = await transaction.get(codeRef);

      if (!codeSnap.exists()) {
        throw new Error('Invalid code. The promo code was not found.');
      }

      const codeData = codeSnap.data() as PromoCodeDoc;

      if (!codeData.active) {
        throw new Error('This promo code is deactivated.');
      }

      if (codeData.service !== targetService) {
        throw new Error(`This code is valid for ${codeData.service.toUpperCase()} only, not for ${targetService.toUpperCase()}.`);
      }

      if (codeData.redeemedCount >= codeData.maxRedemptions) {
        throw new Error('This promo code has reached its maximum redemptions limit.');
      }

      // Check if this user already redeemed this code
      const redemptionId = `${code}_${uid}`;
      const redemptionRef = doc(db, 'promo_redemptions', redemptionId);
      const redemptionSnap = await transaction.get(redemptionRef);

      if (redemptionSnap.exists()) {
        throw new Error('You have already used this promo code.');
      }

      // Increment redeemedCount and deactivate if limit reached
      const newCount = codeData.redeemedCount + 1;
      const isNowMaxed = newCount >= codeData.maxRedemptions;

      transaction.update(codeRef, {
        redeemedCount: newCount,
        active: !isNowMaxed,
      });

      transaction.set(redemptionRef, {
        code,
        uid,
        service: targetService,
        userEmail: user?.email || 'guest',
        redeemedAt: serverTimestamp(),
      });

      return true;
    });

    if (result) {
      sessionStorage.setItem(`unlocked_${targetService}`, 'true');
      return { success: true, message: `Access granted for ${targetService.toUpperCase()}!` };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to redeem promo code. Please check and try again.',
    };
  }

  return { success: false, message: 'An unknown error occurred.' };
}

/**
 * Generates batch random codes for admin (e.g. DSD-8F92A)
 */
export function generateRandomCode(service: ServiceId): string {
  const prefix = service.toUpperCase();
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${randomChars}`;
}
