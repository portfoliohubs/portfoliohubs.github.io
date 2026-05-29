import { useEffect } from 'react';

export const useFavicon = (url: string) => {
  useEffect(() => {
    if (!url) return;

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    link.href = url;
  }, [url]);
};