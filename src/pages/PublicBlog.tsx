import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { 
  BookOpen, 
  Search, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Tag, 
  ArrowRight,
  Filter,
  CheckCircle2,
  Sparkles,
  User,
  Calendar
} from 'lucide-react';
import { cloudflareApi } from '../lib/cloudflareApiClient';
import Header from '../components/Header';
import { INITIAL_BLOG_ARTICLES, BLOG_CATEGORIES, BlogArticle } from '../data/blogArticlesData';

export default function PublicBlog() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [publishedArticlesMap, setPublishedArticlesMap] = useState<Record<string, { published: boolean; publishedAt?: string }>>({});
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Fetch published statuses from Cloudflare Worker API
  useEffect(() => {
    async function loadPublishedStatus() {
      try {
        const map: Record<string, { published: boolean; publishedAt?: string }> = {};
        try {
          const articles = await cloudflareApi.getBlogOverrides();
          articles.forEach((article) => {
            const data = article.data || {};
            map[article.slug] = {
              published: Boolean(data.published),
              publishedAt: (typeof data.publishedAt === 'string' ? data.publishedAt : article.published_at || '') || ''
            };
          });
        } catch (apiError) {
          console.warn('[PublicBlog] Note: using default blog state:', apiError);
        }
        setPublishedArticlesMap(map);
      } catch (err) {
        console.warn('[PublicBlog] Error loading articles:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPublishedStatus();
  }, []);

  // Combine initial articles with Firestore published state
  const articlesWithState = useMemo(() => {
    return INITIAL_BLOG_ARTICLES.map(art => {
      const override = publishedArticlesMap[art.slug];
      return {
        ...art,
        published: override ? override.published : art.published,
        publishedAt: override?.publishedAt || art.publishedAt || ''
      };
    });
  }, [publishedArticlesMap]);

  // Filter articles (show published ones; if none published yet, show all with draft indicator for preview)
  const filteredArticles = useMemo(() => {
    const hasAnyPublished = articlesWithState.some(a => a.published);
    
    return articlesWithState.filter(article => {
      // If there are published articles, show only published. Otherwise show all for preview.
      if (hasAnyPublished && !article.published) return false;

      // Category filter
      if (selectedCategory !== 'all' && article.category !== selectedCategory) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = article.title.toLowerCase().includes(q);
        const matchesKeyword = article.keyword.toLowerCase().includes(q);
        const matchesDesc = article.description.toLowerCase().includes(q);
        const matchesCat = article.categoryAr.toLowerCase().includes(q);
        return matchesTitle || matchesKeyword || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [articlesWithState, selectedCategory, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredArticles.length / pageSize) || 1;
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage, pageSize]);

  // Reset page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans" dir="rtl">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-cyan-900 via-cyan-950 to-slate-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-800/50 border border-cyan-500/30 text-cyan-200 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>مدونة PortfolioHubs الطبية والأكاديمية</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            دليل أطباء الأسنان والطلبة والمرضى
          </h1>
          
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            استكشف أكثر من 200 مقال طبي وعلمي محكم يغطي أحدث الإجراءات المهنية، النصائح الأكاديمية لطلاب الأسنان، ودلائل العناية الوقائية للمرضى.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute right-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث عن موضوع، مهارة مهنية، أو إجراء طبي (مثلاً: حشو العصب، فينير، زيركون)..."
                className="w-full pl-4 pr-12 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:bg-white/20 transition-all shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md transition"
                >
                  مسح
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
          {BLOG_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-cyan-800 text-white shadow-md shadow-cyan-900/10'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{cat.nameAr}</span>
              </button>
            );
          })}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>عرض {filteredArticles.length} مقالاً</span>
          {selectedCategory !== 'all' && (
            <span className="text-cyan-800 font-bold">التصنيف الحالي: {BLOG_CATEGORIES.find(c => c.id === selectedCategory)?.nameAr}</span>
          )}
        </div>

        {/* Articles Grid */}
        {paginatedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedArticles.map(article => (
              <article
                key={article.slug}
                onClick={() => setLocation(`/blog/${article.slug}`)}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-cyan-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Category & Time */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-800 text-[11px] font-black">
                      {article.categoryAr}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{article.readingTime}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-black text-slate-900 group-hover:text-cyan-800 transition-colors line-clamp-2 leading-snug pt-1">
                    {article.title}
                  </h2>

                  {/* Description Snippet */}
                  <p className="text-slate-600 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                    {article.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Tag className="w-3.5 h-3.5 text-cyan-700" />
                    <span className="font-bold text-slate-700 text-[11px] truncate max-w-[160px]">{article.keyword}</span>
                  </div>

                  <span className="text-cyan-800 font-bold inline-flex items-center gap-1 group-hover:translate-x-[-3px] transition-transform">
                    <span>قراءة</span>
                    <ChevronLeft className="w-4 h-4" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">لم يتم العثور على مقالات طابق بحثك</h3>
              <p className="text-xs text-slate-500">جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً.</p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-slate-600 px-3">
              الصفحة {currentPage} من {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© PortfolioHubs - المنصة الطبية الشاملة لأطباء وطلبة الأسنان</p>
      </footer>
    </div>
  );
}
