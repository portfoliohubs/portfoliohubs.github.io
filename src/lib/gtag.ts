declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export function gtagEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params || {});
  }
}