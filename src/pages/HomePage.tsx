import { Link } from 'wouter';
import { FileText, Search, CheckCircle, ArrowRight } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import Header from '../components/Header';
import CONFIG from '../config';

export default function HomePage() {
  const hasSocial =
    CONFIG.social.facebook || CONFIG.social.instagram || CONFIG.social.whatsapp;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Hero */}
        <div className="text-center max-w-lg mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Free · No registration required
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3 leading-tight">
            {CONFIG.home.headline}
          </h1>
          <p className="text-base text-muted-foreground">
            {CONFIG.home.subheadline}
          </p>
        </div>

        {/* Two big pathway cards */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Portfolio */}
          <Link href="/portfolio">
            <button className="group w-full text-left rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/15 dark:from-primary/10 dark:to-primary/20 p-6 hover:shadow-lg hover:border-primary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1 leading-tight">
                {CONFIG.home.portfolioButtonTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {CONFIG.home.portfolioButtonSubtitle}
              </p>
            </button>
          </Link>

          {/* CV PDF */}
          <Link href="/cv">
            <button className="group w-full text-left rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-200 p-6 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/90 flex items-center justify-center shadow-md">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-primary transition-all" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1 leading-tight">
                {CONFIG.home.cvButtonTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {CONFIG.home.cvButtonSubtitle}
              </p>
            </button>
          </Link>
        </div>

        {/* Features list */}
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-10">
          {CONFIG.home.features.map((f) => (
            <li key={f} className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* User counter */}
        <div className="mb-8 flex flex-col items-center gap-1">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-4xl font-extrabold bg-gradient-to-r from-cyan-600 to-cyan-800 dark:from-cyan-400 dark:to-cyan-300 bg-clip-text text-transparent leading-none tabular-nums">
              {CONFIG.home.usersCount}
            </span>
            <span className="text-sm text-muted-foreground leading-tight max-w-[120px]">
              {CONFIG.home.usersCountLabel}
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 px-4 flex flex-col items-center gap-2">
        <div className="text-xs text-muted-foreground text-center">
          <span className="font-semibold text-foreground">{CONFIG.brand.name}</span>
          {' · '}
          <span className="font-almarai" dir="rtl">{CONFIG.brand.slogan}</span>
        </div>

        {/* Social icons */}
        {hasSocial && (
          <div className="flex items-center gap-4">
            {CONFIG.social.facebook && (
              <a
                href={CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-muted-foreground hover:text-blue-600 transition-colors"
              >
                <FaFacebook size={20} />
              </a>
            )}
            {CONFIG.social.instagram && (
              <a
                href={CONFIG.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-pink-500 transition-colors"
              >
                <FaInstagram size={20} />
              </a>
            )}
            {CONFIG.social.whatsapp && (
              <a
                href={CONFIG.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-muted-foreground hover:text-green-500 transition-colors"
              >
                <FaWhatsapp size={20} />
              </a>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
