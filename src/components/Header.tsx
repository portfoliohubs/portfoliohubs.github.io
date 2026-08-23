import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import CONFIG from '../config';
import { gtagEvent } from '../lib/gtag';

interface HeaderProps {
  showBack?: boolean;
}

export default function Header({ showBack }: HeaderProps) {
  const hasSocial =
    CONFIG.social.facebook || CONFIG.social.instagram || CONFIG.social.whatsapp;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link href="/">
              <button
                className="p-2 rounded-lg border border-border hover:bg-muted text-foreground transition-colors mr-1"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
          )}
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              {(CONFIG.brand.logoUrl || CONFIG.brand.favicon) ? (
                <img 
                  src={CONFIG.brand.logoUrl || CONFIG.brand.favicon} 
                  alt={CONFIG.brand.name} 
                  className="w-9 h-9 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              
              {/* Fallback SVG if logoUrl is empty or fails to load */}
              <div className={`w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-xs ${(CONFIG.brand.logoUrl || CONFIG.brand.favicon) ? 'hidden' : ''}`}>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C8.5 2 6 4.5 6 8c0 2.5 1 5.5 2 9 1 3.5 2.5 5 4 5s3-1.5 4-5c1-3.5 2-6.5 2-9 0-3.5-2.5-6-6-6zm0 2c2.5 0 4 1.8 4 4.5 0 2.2-.8 5-1.8 8.2-.8 2.6-1.6 3.3-2.2 3.3s-1.4-.7-2.2-3.3C8.8 13.5 8 10.7 8 8.5 8 5.8 9.5 4 12 4z"/>
                </svg>
              </div>

              <div className="flex flex-col">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-primary">
                  {CONFIG.brand.name}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium -mt-1 hidden sm:inline" dir="rtl">
                  {CONFIG.brand.slogan}
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {hasSocial && (
            <div className="flex items-center gap-2 sm:gap-3 mr-1">
              {CONFIG.social.facebook && (
                <a
                  href={CONFIG.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-muted-foreground hover:text-blue-600 transition-colors p-1.5"
                  onClick={() => gtagEvent('social_click', { platform: 'facebook', source: 'header' })}
                >
                  <FaFacebook size={18} />
                </a>
              )}
              {CONFIG.social.instagram && (
                <a
                  href={CONFIG.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-muted-foreground hover:text-pink-500 transition-colors p-1.5"
                  onClick={() => gtagEvent('social_click', { platform: 'instagram', source: 'header' })}
                >
                  <FaInstagram size={18} />
                </a>
              )}
              {CONFIG.social.whatsapp && (
                <a
                  href={CONFIG.social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="text-muted-foreground hover:text-green-500 transition-colors p-1.5"
                  onClick={() => gtagEvent('social_click', { platform: 'whatsapp', source: 'header' })}
                >
                  <FaWhatsapp size={18} />
                </a>
              )}
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
