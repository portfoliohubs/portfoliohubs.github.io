import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  RotateCcw,
  Bot,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  CHATBOT_DECISION_TREE, 
  ChatbotNode, 
  SuggestedAction 
} from '../data/chatbotTree';
import { matchQueryToNodes } from '../utils/arabicMatcher';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  title?: string;
  actions?: SuggestedAction[];
  isFallback?: boolean;
  timestamp: string;
}

export default function ContextAwareChatbot() {
  const [location, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeStep, setActiveStep] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // 2. Real-time Step Detection across Portfolio and CV Wizards
  useEffect(() => {
    const detectActiveStep = () => {
      const stepElem = document.querySelector('[data-wizard-step]');
      if (stepElem) {
        const stepVal = stepElem.getAttribute('data-wizard-step');
        if (stepVal) {
          setActiveStep(stepVal);
          return;
        }
      }

      if (location.startsWith('/portfolio') || location.startsWith('/website')) {
        const STEPS_LIST = ['intro', 'personal', 'contact', 'photo', 'skills', 'timeline', 'cases'];
        const savedStep = sessionStorage.getItem('portfolio_step');
        if (savedStep) {
          const idx = parseInt(savedStep, 10);
          if (!isNaN(idx) && STEPS_LIST[idx]) {
            setActiveStep(STEPS_LIST[idx]);
            return;
          }
        }
        setActiveStep('intro');
      } else if (location.startsWith('/cv')) {
        const isPreview = window.location.hash.includes('preview') || sessionStorage.getItem('cv_step') === 'preview';
        setActiveStep(isPreview ? 'preview' : 'editor');
      } else {
        setActiveStep('');
      }
    };

    detectActiveStep();
    const interval = setInterval(detectActiveStep, 1200);
    return () => clearInterval(interval);
  }, [location]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Mark unread as read when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // 3. Determine Context Node based on Route & Active Step
  const currentContextNode = useMemo((): ChatbotNode => {
    if (location.startsWith('/dsd')) {
      const dsdNode = CHATBOT_DECISION_TREE.contextualNodes.find(n => n.id === 'ctx-dsd');
      if (dsdNode) return dsdNode;
    }

    if (location.startsWith('/motiongraphic') || location.startsWith('/motion')) {
      const motionNode = CHATBOT_DECISION_TREE.contextualNodes.find(n => n.id === 'ctx-motion');
      if (motionNode) return motionNode;
    }

    if (location.startsWith('/portfolio') || location.startsWith('/website')) {
      if (activeStep) {
        const matched = CHATBOT_DECISION_TREE.contextualNodes.find(
          n => n.routePattern === '/portfolio' && n.stepPattern === activeStep
        );
        if (matched) return matched;
      }
      return CHATBOT_DECISION_TREE.contextualNodes.find(n => n.id === 'ctx-portfolio-intro') || 
             CHATBOT_DECISION_TREE.contextualNodes[0];
    }

    if (location.startsWith('/cv')) {
      if (activeStep === 'preview') {
        const matched = CHATBOT_DECISION_TREE.contextualNodes.find(
          n => n.routePattern === '/cv' && n.stepPattern === 'preview'
        );
        if (matched) return matched;
      }
      return CHATBOT_DECISION_TREE.contextualNodes.find(n => n.id === 'ctx-cv') || CHATBOT_DECISION_TREE.contextualNodes[0];
    }

    if (location.startsWith('/dashboard')) {
      return CHATBOT_DECISION_TREE.contextualNodes.find(n => n.routePattern === '/dashboard') || CHATBOT_DECISION_TREE.contextualNodes[0];
    }

    // Default general context
    return CHATBOT_DECISION_TREE.contextualNodes[0];
  }, [location, activeStep]);

  // Ref to track last proactive context shown
  const lastContextIdRef = useRef<string>('');

  // Proactive Context Sync: update message if user changes wizard steps
  useEffect(() => {
    const contextKey = `${currentContextNode.id}-${activeStep}`;
    if (lastContextIdRef.current !== contextKey) {
      lastContextIdRef.current = contextKey;
      
      const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      const doctorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';
      const personalizedGreeting = doctorName ? `مرحباً دكتور ${doctorName}! ` : 'مرحباً دكتور! ';

      const newGreetingMsg: ChatMessage = {
        id: `ctx-step-${Date.now()}`,
        sender: 'bot',
        title: currentContextNode.titleAr,
        text: `${personalizedGreeting}${currentContextNode.responseAr}`,
        actions: currentContextNode.suggestedActions,
        timestamp: now
      };

      setMessages(prev => {
        const hasUserMessages = prev.some(m => m.sender === 'user');
        if (!hasUserMessages) {
          return [newGreetingMsg];
        }
        return [...prev, newGreetingMsg];
      });
    }
  }, [currentUser, currentContextNode, activeStep]);

  // Reset conversation to current context
  const handleReset = () => {
    const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const doctorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';
    const greeting = doctorName ? `مرحباً دكتور ${doctorName}! ` : 'مرحباً دكتور! ';

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        title: currentContextNode.titleAr,
        text: `${greeting}${currentContextNode.responseAr}`,
        actions: currentContextNode.suggestedActions,
        timestamp: now
      }
    ]);
  };

  // 4. Intelligent Rule-Based Arabic NLP Matcher
  const processUserQuery = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: time
    };

    // Combine general and contextual nodes
    const allNodes = [...CHATBOT_DECISION_TREE.generalNodes, ...CHATBOT_DECISION_TREE.contextualNodes];
    const { bestMatch, suggestions } = matchQueryToNodes(trimmed, allNodes, location, activeStep);

    let botMsg: ChatMessage;

    if (bestMatch) {
      // 100% Direct, Rich In-Chat Response
      botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        title: bestMatch.node.titleAr,
        text: bestMatch.node.responseAr,
        actions: bestMatch.node.suggestedActions,
        timestamp: time
      };
    } else if (suggestions.length > 0) {
      // Smart "Did you mean?" suggestions directly inside the chat
      const suggestionActions: SuggestedAction[] = suggestions.map(s => ({
        labelAr: s.titleAr,
        actionType: 'query' as const,
        payload: s.keywords[0] || s.titleAr
      }));

      botMsg = {
        id: `bot-suggest-${Date.now()}`,
        sender: 'bot',
        title: 'مقترحات الإجابة الفورية',
        text: CHATBOT_DECISION_TREE.fallback.messageAr,
        actions: [
          ...suggestionActions,
          {
            labelAr: 'محادثة الدعم الفني عبر واتساب',
            actionType: 'whatsapp',
            payload: trimmed
          }
        ],
        timestamp: time
      };
    } else {
      // Direct Human Escalation without dead-ends
      botMsg = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'bot',
        title: 'الدعم الطبي والفني المباشر',
        text: `أهلاً دكتور! سؤالك يهمنا جداً. يمكنك التواصل مباشرة مع د. مايكل نبيل وفريق التطوير عبر واتساب لتلقي الرد والمساعدة فوراً:`,
        isFallback: true,
        actions: [
          {
            labelAr: 'تواصل الآن عبر واتساب مباشرة',
            actionType: 'whatsapp',
            payload: trimmed
          }
        ],
        timestamp: time
      };
    }

    setMessages(prev => [...prev, userMsg, botMsg]);
    setInputText('');
  };

  // 5. Suggested Action Handler (Delivered 100% inside chat)
  const handleActionClick = (action: SuggestedAction) => {
    if (action.actionType === 'navigate') {
      setLocation(action.payload);
    } else if (action.actionType === 'query') {
      processUserQuery(action.payload);
    } else if (action.actionType === 'whatsapp') {
      const doctorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'طبيب أسنان';
      const pageInfo = `${location}${activeStep ? ` (خطوة: ${activeStep})` : ''}`;
      const userText = action.payload;

      const rawMsg = `مرحباً دكتور مايكل، أنا الدكتور ${doctorName}، أستخدم منصة PortfolioHubs في صفحة ${pageInfo}. ${userText}`;
      const url = `https://wa.me/${CHATBOT_DECISION_TREE.fallback.whatsappNumber}?text=${encodeURIComponent(rawMsg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Quick topics for user convenience
  const quickQuestions = [
    { label: 'الظهور في جوجل والذكاء الاصطناعي', query: 'كيف يظهر موقعي في بحث جوجل وإجابات الذكاء الاصطناعي؟' },
    { label: 'تصدير PPTX قابل للتعديل', query: 'تصدير السيرة الذاتية كعرض PPTX قابل للتعديل بالكامل' },
    { label: 'ترقية الحالات غير المحدودة', query: 'ترقية الحالات غير المحدودة' },
    { label: 'تثبيت التطبيق على الموبايل', query: 'تثبيت منصة PortfolioHubs كتطبيق على هاتفك وحاسوبك' }
  ];

  return (
    <>
      {/* ── Floating Launcher Bubble ── */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="المساعد المهني الذكي"
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xl hover:shadow-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <div className="relative">
              <MessageCircle className="h-5 w-5 fill-current" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-primary animate-pulse" />
              )}
            </div>
            
            <span className="hidden sm:inline font-bold">
              مساعد PortfolioHubs
            </span>

            {/* Context Badge */}
            {activeStep && (
              <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-medium">
                {activeStep}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Chat Window Modal / Drawer ────────────────────────────────────── */}
      {isOpen && (
        <div 
          className="fixed bottom-5 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[620px] h-[560px] bg-card border border-border/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200"
          dir="rtl"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-primary text-primary-foreground flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <span>مساعد PortfolioHubs الذكي</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-white/80 font-medium">
                  إجابات فورية شاملة • بدون انتظار • بدون خروج
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="إعادة ضبط المحادثة حسب سياق الصفحة"
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="إغلاق المساعد"
                className="p-1.5 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="px-3.5 py-1.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-[11px] text-primary font-semibold">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {activeStep ? `السياق الحالي: خطوة ${activeStep}` : `الصفحة الحالية: ${location}`}
              </span>
            </div>
            <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">
              ردود مباشرة داخل المحادثة
            </span>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs bg-muted/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`
                    max-w-[92%] p-3.5 rounded-2xl space-y-2.5 shadow-xs
                    ${msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-xs'
                      : 'bg-card border border-border text-foreground rounded-bl-xs'
                    }
                  `}
                >
                  {msg.title && (
                    <div className="font-bold text-[11px] text-primary pb-1.5 border-b border-border/50 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{msg.title}</span>
                    </div>
                  )}

                  <div className="leading-relaxed whitespace-pre-line text-xs font-normal">
                    {msg.text}
                  </div>

                  {/* Suggested Action Buttons (Direct In-Chat Action Pills) */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 border-t border-border/40 mt-1">
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleActionClick(act)}
                          className={`
                            inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-right
                            ${act.actionType === 'whatsapp'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40'
                            }
                          `}
                        >
                          {act.actionType === 'whatsapp' && <MessageCircle className="h-3 w-3 shrink-0" />}
                          {act.actionType === 'query' && <HelpCircle className="h-3 w-3 shrink-0 text-primary" />}
                          <span>{act.labelAr}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-muted-foreground mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Strip */}
          <div className="px-3 py-1.5 bg-card border-t border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">أشهر الأسئلة:</span>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => processUserQuery(q.query)}
                className="text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border shrink-0 cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              processUserQuery(inputText);
            }}
            className="p-2.5 bg-card border-t border-border flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب سؤالك (مثال: ازاي اظهر في جوجل، باوربوينت، الصور...)"
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground transition-colors shadow-xs shrink-0 cursor-pointer"
              aria-label="إرسال"
            >
              <Send className="h-3.5 w-3.5 rotate-180" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
