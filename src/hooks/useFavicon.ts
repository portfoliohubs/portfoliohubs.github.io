import { useEffect } from 'react';

export function useFavicon(href: string) {
  useEffect(() => {
    if (!href) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [href]);
}
