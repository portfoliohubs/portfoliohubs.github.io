import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAdImageUrl } from '../lib/cdn';

interface CvAdGateProps {
  open: boolean;
  posterUrl?: string;
  durationSeconds?: number;
  onComplete: () => void;
}

export default function CvAdGate({
  open,
  posterUrl: propPosterUrl,
  durationSeconds: propDurationSeconds,
  onComplete,
}: CvAdGateProps) {
  const [posterUrl, setPosterUrl] = useState<string | undefined>(
    propPosterUrl ? getAdImageUrl(propPosterUrl) : undefined
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(propDurationSeconds || 5);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [remaining, setRemaining] = useState(5);

  // Fetch ad configuration from Firestore settings/global
  useEffect(() => {
    let mounted = true;
    async function fetchAdConfig() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'global'));
        if (snap.exists() && mounted) {
          const data = snap.data();
          if (data.cvAdEnabled !== undefined) setEnabled(data.cvAdEnabled);
          if (data.cvAdPosterUrl && !propPosterUrl) {
            setPosterUrl(getAdImageUrl(data.cvAdPosterUrl));
          }
          if (data.cvAdDurationSeconds && !propDurationSeconds) {
            setDurationSeconds(data.cvAdDurationSeconds);
            setRemaining(data.cvAdDurationSeconds);
          }
        }
      } catch (err) {
        console.warn('Could not load CV ad settings from Firestore:', err);
      }
    }

    if (open) {
      fetchAdConfig();
    }

    return () => {
      mounted = false;
    };
  }, [open, propPosterUrl, propDurationSeconds]);

  useEffect(() => {
    if (!open) {
      setRemaining(durationSeconds);
      return;
    }

    // If ads are disabled in Firestore settings, complete immediately
    if (!enabled) {
      onComplete();
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          onComplete();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [durationSeconds, onComplete, open, enabled]);

  if (!open || !enabled) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Advertisement before download"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
        {posterUrl ? (
          <img src={posterUrl} alt="Advertisement" className="max-h-[70vh] w-full object-contain" />
        ) : (
          <div className="flex min-h-64 items-center justify-center bg-gray-50 dark:bg-gray-800 px-6 text-center">
            <div>
              <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                PortfolioHubs Pro
              </p>
              <p className="text-xs text-gray-500 mt-1">Empowering modern dental professionals.</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-900">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Download continues in {remaining} second{remaining === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-all"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Skip ad
          </button>
        </div>
      </div>
    </div>
  );
}
