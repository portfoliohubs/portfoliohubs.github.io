import { useEffect, useState, useMemo } from 'react';
import { Link, useRoute } from 'wouter';
import { cloudflareApi } from '../lib/cloudflareApiClient';
import { buildDoctorStaticHtml } from '../lib/doctorTemplate';
import CONFIG from '../config';

export default function PublicWebsite() {
  const [, compactParams] = useRoute('/dr:slug');
  const [, slashParams] = useRoute('/dr/:slug');
  const slug = compactParams?.slug || slashParams?.slug || '';
  const [websiteData, setWebsiteData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadWebsite = async () => {
      try {
        setLoading(true);
        setError('');
        const cleanSlug = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
        
        // Handle Michael Nabil legacy direct link
        if (cleanSlug === 'drmichaelnabil' || cleanSlug === 'michaelnabil' || cleanSlug === 'michael') {
          window.location.replace('https://portfoliohubs.github.io/drmichaelnabil');
          return;
        }

        // Check if slug matches any live example on GitHub Pages
        const matchingExample = (CONFIG.portfolioIntro.liveExamples ?? []).find(
          ex => ex.link.toLowerCase().replace(/^\/+|\/+$/g, '') === cleanSlug
        );
        if (matchingExample) {
          window.location.replace(`https://portfoliohubs.github.io/${matchingExample.link}`);
          return;
        }

        // Authoritative source: Cloudflare Worker API & D1 database
        const response = await cloudflareApi.getPublishedWebsite(cleanSlug);
        if (active) {
          if (response?.data) {
            setWebsiteData(response.data);
          } else {
            throw new Error('This doctor website could not be found or is pending publication.');
          }
        }
      } catch (loadError) {
        console.warn('[PublicWebsite] Error loading published doctor:', loadError);
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load this website.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (slug) void loadWebsite();
    return () => {
      active = false;
    };
  }, [slug]);

  // Generate 100% compliant Hugo HTML from authoritative doctor data
  const renderedHtml = useMemo(() => {
    if (!websiteData) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://portfoliohubs.github.io';
    return buildDoctorStaticHtml({
      doctor: websiteData,
      cases: websiteData.cases || [],
      baseUrl
    });
  }, [websiteData]);

  useEffect(() => {
    if (!websiteData) return;
    const name = websiteData.fullName || websiteData.fullNameAr || 'Dr. Dentist';
    document.title = `${name} | PortfolioHubs`;
  }, [websiteData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium text-lg">Loading Doctor Portfolio...</p>
      </div>
    );
  }

  if (error || !renderedHtml) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✕
          </div>
          <h1 className="text-2xl font-bold mb-2">Portfolio Unavailable</h1>
          <p className="text-slate-400 text-sm mb-6">{error || 'This doctor portfolio is not yet published.'}</p>
          <Link href="/" className="inline-block rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-blue-600/30">
            Back to PortfolioHubs
          </Link>
        </div>
      </div>
    );
  }

  // Render the exact Hugo HTML in an isolated seamless viewport
  return (
    <iframe
      srcDoc={renderedHtml}
      title="Doctor Portfolio"
      className="w-full h-screen border-none block m-0 p-0 overflow-auto"
      style={{ width: '100vw', height: '100vh', border: 'none' }}
    />
  );
}
