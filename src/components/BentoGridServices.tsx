import { Link } from 'wouter';
import { 
  Globe, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ExternalLink, 
  Image as ImageIcon,
  MessageCircle,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

interface BentoGridServicesProps {
  portfolioStatus?: string;
  casesCount?: number;
  caseLimit?: number;
  slug?: string;
  doctorName?: string;
  onOpenPortfolioEditor?: () => void;
}

export default function BentoGridServices({
  portfolioStatus = 'draft',
  casesCount = 0,
  caseLimit = 3,
  slug,
  doctorName = '',
  onOpenPortfolioEditor
}: BentoGridServicesProps) {
  const isApproved = portfolioStatus === 'approved' || portfolioStatus === 'published';
  const isPending = portfolioStatus === 'pending' || portfolioStatus === 'pending_review';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner Notice */}
      <div className="rounded-2xl border border-brand/20 bg-gradient-to-l from-brand/10 via-brand/5 to-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-bold mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>منصة أطباء وطلبة الأسنان المعتمدة</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              أهلاً دكتور {doctorName || 'الزميل العزيز'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              إليك لوحة التحكم الموحدة لخدمتيك الرئيسيتين: البورتفوليو الرقمي والسيرة الذاتية المهنية.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {slug && (
              <a
                href={`/${slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/30 bg-card hover:bg-brand/5 text-brand text-xs font-bold transition-all shadow-xs"
              >
                <ExternalLink className="h-4 w-4" />
                <span>رابط موقعك الثابت</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bento Grid: 2 Main Services + 2 Auxiliary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Service 1: Dental Web Portfolio (Span 7 cols) */}
        <div className="md:col-span-7 rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand">الخدمة الأولى</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isApproved 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                        : isPending 
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-cyan-600'}`} />
                      {isApproved ? 'منشور على الويب' : isPending ? 'قيد مراجعة الإدارة' : 'مسودة قيد الإعداد'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-0.5">البورتفوليو المهني الرقمي</h3>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-5">
              موقع ويب شخصي ثابت وسريع جداً على نطاق PortfolioHubs، مخصص لعرض صور حالاتك المهنية وتفاصيل عيادتك وخبراتك بروابط مباشرة للمرضى والمراكز الطبية.
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/70">
                <div className="text-xs text-muted-foreground font-medium">سعة حالات الأسنان</div>
                <div className="text-base font-black text-brand mt-0.5">
                  {casesCount} من {caseLimit} حالات مستخدمة
                </div>
                <div className="w-full bg-border rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className="bg-brand h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (casesCount / (caseLimit || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/70">
                <div className="text-xs text-muted-foreground font-medium">نوع الاستضافة</div>
                <div className="text-base font-black text-foreground mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>صفحات سريعة ومفهرسة</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  مفهرسة وجاهزة لمحركات البحث
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border/60">
            {onOpenPortfolioEditor ? (
              <button
                onClick={onOpenPortfolioEditor}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span>متابعة تعديل البورتفوليو</span>
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
            ) : (
              <Link href="/website">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-brand">
                  <span>فتح معالج البورتفوليو</span>
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
              </Link>
            )}

            {slug && (
              <a
                href={`/${slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>زيارة الصفحة</span>
              </a>
            )}
          </div>
        </div>

        {/* Service 2: Professional Dental CV (Span 5 cols) */}
        <div className="md:col-span-5 rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand">الخدمة الثانية</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                      جاهز للتوليد
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-0.5">السيرة الذاتية المهنية (CV)</h3>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-5">
              توليد سيرة ذاتية طبية أنيقة بصيغة PDF قياسية بمقاس A4 معتمدة لتقديم طلبات التوظيف والتدريب وامتياز طب الأسنان مع دعم كامل للمهارات والحالات المصورة.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                <span>قالب منظم خصيصاً لأطباء وطلبة الأسنان</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                <span>توليد وتنزيل فوري لملف PDF فائق الدقة</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                <span>إمكانية إدراج صور حالات الأسنان في الـ CV</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <Link href="/cv">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-brand bg-brand/5 hover:bg-brand text-brand hover:text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-brand">
                <span>تعديل السيرة الذاتية وتوليد PDF</span>
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
            </Link>
          </div>
        </div>

        {/* Auxiliary Bento Card: DSD Studio */}
        <div className="md:col-span-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">استوديو تصميم الابتسامة (DSD Studio)</h4>
                <p className="text-[11px] text-muted-foreground">النسبة الذهبية (1.618) ودليل ألوان Vita BL1-A3 بدقة 4K</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              جديد V4
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            أدوات رسم ومحاذاة هندسية، 20 قالباً لشكل الأسنان، ومنزلق مقارنة قبل وبعد مع تصدير عالي الدقة.
          </p>

          <div className="pt-3 border-t border-indigo-500/20">
            <Link href="/dsd">
              <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer">
                <Sparkles className="h-4 w-4" />
                <span>فتح استوديو DSD Smile Design</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Auxiliary Bento Card: Motion Graphic Studio */}
        <div className="md:col-span-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">استوديو الموشن جرافيك (Reel Studio)</h4>
                <p className="text-[11px] text-muted-foreground">توليد مقاطع فيديو ريلز 9:16 لحالات الأسنان</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
              جديد V4
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            تحريك الحالات السريرية بقوالب ليزر قبل وبعد وتكبير سينمائي مع هوية الطبيب وتصدير فيديو فوري.
          </p>

          <div className="pt-3 border-t border-purple-500/20">
            <Link href="/motiongraphic">
              <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer">
                <span>فتح استوديو Motion Reel Studio</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Auxiliary Bento Card: Direct WhatsApp Dental Support */}
        <div className="md:col-span-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">المستشار التقني لأطباء الأسنان</h4>
                <p className="text-[11px] text-muted-foreground">دعم مباشر عبر واتساب wa.me/201271476215</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              متاح الآن
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            فريق الدعم الفني جاهز لمساعدتك في مراجعة بيانات البورتفوليو وربط النطاق الخاص ونشر الحالات.
          </p>

          <div className="pt-3 border-t border-emerald-500/20">
            <a
              href={`https://wa.me/201271476215?text=${encodeURIComponent(
                `مرحباً، أنا د. ${doctorName || 'طبيب الأسنان'}، أحتاج إلى استشارة بخصوص بورتفوليو الأسنان الخاص بي.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              <span>محادثة فورية مع المستشار الطبي</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
