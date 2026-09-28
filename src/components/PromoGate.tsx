import React, { useState, useEffect } from 'react';
import { Lock, Sparkles, Key, ArrowRight, MessageCircle } from 'lucide-react';
import { type ServiceId, getServiceById } from '../services';
import { hasServiceAccess, redeemPromoCode } from '../lib/promoService';

interface PromoGateProps {
  serviceId: ServiceId;
  children: React.ReactNode;
}

export const PromoGate: React.FC<PromoGateProps> = ({ serviceId, children }) => {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const service = getServiceById(serviceId);

  useEffect(() => {
    let mounted = true;
    hasServiceAccess(serviceId).then((hasAccess) => {
      if (mounted) {
        setUnlocked(hasAccess);
      }
    });
    return () => {
      mounted = false;
    };
  }, [serviceId]);

  if (unlocked === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await redeemPromoCode(code, serviceId);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          setUnlocked(true);
        }, 800);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const whatsappUrl = `https://wa.me/201271476215?text=${encodeURIComponent(
    `Hello, I would like to get a promo code for ${service?.title || serviceId} on PortfolioHubs.`
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center relative overflow-hidden">
        {/* Glow badge */}
        <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 mb-3 border border-blue-200 dark:border-blue-700">
          <Sparkles className="w-3.5 h-3.5" />
          Exclusive Doctor Access
        </span>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {service?.title || 'Studio Access'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {service?.description || 'Please enter your personalized promo code to unlock this workspace.'}
        </p>

        <form onSubmit={handleRedeem} className="space-y-4">
          <div className="relative">
            <Key className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DSD-XYZ123"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-center font-mono font-bold tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-600 dark:text-emerald-300 font-medium">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Unlock Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Don't have a promo code yet? Request access directly:
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl transition-all w-full"
          >
            <MessageCircle className="w-4 h-4" />
            Request Promo Code via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
