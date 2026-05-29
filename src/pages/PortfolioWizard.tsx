import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Plus, X, Upload, Image as ImageIcon, Check, Download, MessageCircle, RotateCcw, ChevronDown } from 'lucide-react';
import Header from '../components/Header';
import CONFIG from '../config';
import { generateToml, downloadToml } from '../lib/tomlGenerator';
import { processImageToBase64, processMultipleImages } from '../lib/imageProcessor';

type Step = 'intro' | 'personal' | 'contact' | 'photo' | 'skills' | 'timeline' | 'cases' | 'preview';

const STEPS: Step[] = ['intro', 'personal', 'contact', 'photo', 'skills', 'timeline', 'cases', 'preview'];
const STEP_LABELS: Record<Step, string> = {
  intro:    CONFIG.portfolioIntro.stepLabel,
  personal: CONFIG.steps.personal,
  contact:  CONFIG.steps.contact,
  photo:    CONFIG.steps.photo,
  skills:   CONFIG.steps.skills,
  timeline: CONFIG.steps.timeline,
  cases:    CONFIG.steps.cases,
  preview:  CONFIG.steps.preview,
};

interface Milestone { year: string; event: string; eventAr: string }
interface ClinicalCase {
  category: string; categoryAr: string;
  customCategory: string;
  title: string; titleAr: string;
  photo: string | null; preview: string | null;
}

const blankCase = (): ClinicalCase => ({
  category: '', categoryAr: '', customCategory: '',
  title: '', titleAr: '', photo: null, preview: null,
});

interface FormData {
  fullName: string; fullNameAr: string;
  title: string; titleAr: string;
  graduationYear: string;
  university: string; universityAr: string;
  phone: string; whatsapp: string; email: string;
    instagram: string; facebook: string; linkedin: string;
    clinicName: string; clinicNameAr: string;
    locationAddress: string; locationAddressAr: string;
    locationLat: string; locationLng: string;
  profilePhoto: string | null; profilePreview: string | null;
  clinicalSkills: string[]; digitalSkills: string[]; softSkills: string[];
  clinicalSkillsAr: string[]; digitalSkillsAr: string[]; softSkillsAr: string[];
  timeline: Milestone[];
  cases: ClinicalCase[];
}

const blankForm = (): FormData => ({
  fullName: '', fullNameAr: '', title: '', titleAr: '',
  graduationYear: '', university: '', universityAr: '',
  phone: '', whatsapp: '', email: '',
    instagram: '', facebook: '', linkedin: '',
    clinicName: '', clinicNameAr: '',
    locationAddress: '', locationAddressAr: '', locationLat: '', locationLng: '',
  profilePhoto: null, profilePreview: null,
  clinicalSkills: [], digitalSkills: [], softSkills: [],
  clinicalSkillsAr: [], digitalSkillsAr: [], softSkillsAr: [],
  timeline: [], cases: [],
});

function SkillInput({ label, items, onAdd, onRemove, placeholder }: {
  label: string; items: string[]; onAdd: (v: string) => void;
  onRemove: (i: number) => void; placeholder: string;
}) {
  const [val, setVal] = useState('');
  const add = () => { if (val.trim()) { onAdd(val.trim()); setVal(''); } };
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">{label}</label>
      <div className="flex gap-2">
        <input
          type="text" value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button onClick={add} type="button"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" /> {CONFIG.labels.addSkill}
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              {item}
              <button onClick={() => onRemove(i)} className="ml-0.5 text-primary/60 hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', dir, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: 'rtl'; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value} dir={dir}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
      />
    </div>
  );
}

export default function PortfolioWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(blankForm());
  const [tomlOutput, setTomlOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const profileRef = useRef<HTMLInputElement>(null);
  const casesRef   = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addSkill = (key: keyof FormData, v: string) =>
    setForm(prev => ({ ...prev, [key]: [...(prev[key] as string[]), v] }));
  const removeSkill = (key: keyof FormData, i: number) =>
    setForm(prev => ({ ...prev, [key]: (prev[key] as string[]).filter((_, idx) => idx !== i) }));

  const addMilestone = () => set('timeline', [...form.timeline, { year: '', event: '', eventAr: '' }]);
  const removeMilestone = (i: number) => set('timeline', form.timeline.filter((_, idx) => idx !== i));
  const updateMilestone = (i: number, k: keyof Milestone, v: string) => {
    const t = [...form.timeline]; t[i] = { ...t[i], [k]: v }; set('timeline', t);
  };

  const updateCase = (i: number, k: keyof ClinicalCase, v: string) => {
    const c = [...form.cases]; c[i] = { ...c[i], [k]: v };
    if (k === 'category') {
      const found = CONFIG.caseCategories.find(cat => cat.id === v);
      if (found) c[i].categoryAr = found.ar;
    }
    set('cases', c);
  };
  const removeCase = (i: number) => set('cases', form.cases.filter((_, idx) => idx !== i));

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await processImageToBase64(file);
    set('profilePhoto', b64); set('profilePreview', b64);
  };

  const handleCasesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const imgs = await processMultipleImages(files);
    const newCases: ClinicalCase[] = imgs.map(img => ({ ...blankCase(), photo: img.base64, preview: img.preview }));
    set('cases', [...form.cases, ...newCases]);
    e.target.value = '';
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const processedCases = form.cases.map(c => ({
      category: c.category === 'custom' ? c.customCategory : (CONFIG.caseCategories.find(cat => cat.id === c.category)?.en || c.category),
      categoryAr: c.category === 'custom' ? c.customCategory : c.categoryAr,
      title: c.title, titleAr: c.titleAr, photo: c.photo,
    }));
    const toml = generateToml({
      personalInfo: { fullName: form.fullName, fullNameAr: form.fullNameAr, title: form.title, titleAr: form.titleAr, graduationYear: form.graduationYear, university: form.university, universityAr: form.universityAr, clinicName: form.clinicName, clinicNameAr: form.clinicNameAr },
      contact: { phone: form.phone, whatsapp: form.whatsapp, email: form.email, instagram: form.instagram, facebook: form.facebook, linkedin: form.linkedin, locationAddress: form.locationAddress, locationAddressAr: form.locationAddressAr, locationLat: form.locationLat, locationLng: form.locationLng },
      profilePhoto: form.profilePhoto,
      skills: { clinical: form.clinicalSkills, clinicalAr: form.clinicalSkillsAr.length ? form.clinicalSkillsAr : form.clinicalSkills, digital: form.digitalSkills, digitalAr: form.digitalSkillsAr.length ? form.digitalSkillsAr : form.digitalSkills, soft: form.softSkills, softAr: form.softSkillsAr.length ? form.softSkillsAr : form.softSkills },
      timeline: form.timeline,
      cases: processedCases,
    });
    setTomlOutput(toml);
    setGenerating(false);
  };

  const handleSendWhatsApp = () => {
    downloadToml(tomlOutput);
    const phone = CONFIG.whatsapp.destinationNumber;
    const msg = encodeURIComponent(CONFIG.whatsapp.message);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBack />

      {/* Progress bar */}
      <div className="w-full bg-muted h-1.5">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="w-full overflow-x-auto border-b border-border/50">
        <div className="flex min-w-max max-w-3xl mx-auto px-4 py-2 gap-1">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                i === step ? 'bg-primary text-primary-foreground'
                : i < step  ? 'bg-primary/15 text-primary cursor-pointer hover:bg-primary/25'
                : 'text-muted-foreground cursor-default'
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span className="text-xs w-3.5 text-center">{i + 1}</span>}
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <div className="wizard-step-enter">

          {/* ── INTRO STEP ─────────────────────────────────────────────────────── */}
          {currentStep === 'intro' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">{CONFIG.portfolioIntro.title}</h2>
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">Portfolio pathway</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                {CONFIG.portfolioIntro.content.map((line, i) => (
                  <p key={i} className="text-sm text-foreground leading-relaxed">{line}</p>
                ))}
              </div>
              <button
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
              >
                {CONFIG.buttons.next} <ArrowRight className="h-5 w-5" />
              </button>
            </section>
          )}

          {/* ── PERSONAL INFO ─────────────────────────────────────────────────── */}
          {currentStep === 'personal' && (
            <section className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.personal}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label={CONFIG.labels.fullNameEn} value={form.fullName} onChange={v => set('fullName', v)} placeholder={CONFIG.placeholders.fullNameEn} required />
                <InputField label={CONFIG.labels.fullNameAr} value={form.fullNameAr} onChange={v => set('fullNameAr', v)} placeholder={CONFIG.placeholders.fullNameAr} dir="rtl" />
                <InputField label={CONFIG.labels.titleEn} value={form.title} onChange={v => set('title', v)} placeholder={CONFIG.placeholders.titleEn} />
                <InputField label={CONFIG.labels.titleAr} value={form.titleAr} onChange={v => set('titleAr', v)} placeholder={CONFIG.placeholders.titleAr} dir="rtl" />
                <InputField label={CONFIG.labels.graduationYear} value={form.graduationYear} onChange={v => set('graduationYear', v)} placeholder={CONFIG.placeholders.graduationYear} />
                <div />
                <div className="sm:col-span-2">
                  <InputField label={CONFIG.labels.universityEn} value={form.university} onChange={v => set('university', v)} placeholder={CONFIG.placeholders.universityEn} />
                </div>
                <div className="sm:col-span-2">
                  <InputField label={CONFIG.labels.universityAr} value={form.universityAr} onChange={v => set('universityAr', v)} placeholder={CONFIG.placeholders.universityAr} dir="rtl" />
                </div>
              </div>
            </section>
          )}

          {/* ── CONTACT DETAILS ───────────────────────────────────────────────── */}
            {currentStep === 'contact' && (
              <section className="space-y-6">
                <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.contact}</h2>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Phone & Email</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label={CONFIG.labels.phone} value={form.phone} onChange={v => set('phone', v)} placeholder={CONFIG.placeholders.phone} type="tel" />
                    <InputField label={CONFIG.labels.whatsapp} value={form.whatsapp} onChange={v => set('whatsapp', v)} placeholder={CONFIG.placeholders.whatsapp} type="tel" />
                    <div className="sm:col-span-2">
                      <InputField label={CONFIG.labels.email} value={form.email} onChange={v => set('email', v)} placeholder={CONFIG.placeholders.email} type="email" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Clinic / Hospital</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Clinic / Hospital Name (English)" value={form.clinicName} onChange={v => set('clinicName', v)} placeholder="e.g. Zagazig University Hospital" />
                    <InputField label="Clinic / Hospital Name (Arabic)" value={form.clinicNameAr} onChange={v => set('clinicNameAr', v)} placeholder="مثال: مستشفى جامعة الزقازيق" dir="rtl" />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Social Media Links</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Instagram (optional)" value={form.instagram} onChange={v => set('instagram', v)} placeholder="https://www.instagram.com/yourhandle" type="url" />
                    <InputField label="Facebook (optional)" value={form.facebook} onChange={v => set('facebook', v)} placeholder="https://www.facebook.com/yourpage" type="url" />
                    <div className="sm:col-span-2">
                      <InputField label="LinkedIn (optional)" value={form.linkedin} onChange={v => set('linkedin', v)} placeholder="https://linkedin.com/in/yourprofile" type="url" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Clinic Location (optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <InputField label="Address (English)" value={form.locationAddress} onChange={v => set('locationAddress', v)} placeholder="e.g. Zagazig University Hospitals, Zagazig, Sharqia" />
                    </div>
                    <div className="sm:col-span-2">
                      <InputField label="Address (Arabic)" value={form.locationAddressAr} onChange={v => set('locationAddressAr', v)} placeholder="مثال: مستشفيات جامعة الزقازيق - الزقازيق - الشرقية" dir="rtl" />
                    </div>
  
                  </div>
                </div>
              </section>
            )}

          {/* ── PROFILE PHOTO ─────────────────────────────────────────────────── */}
          {currentStep === 'photo' && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.photo}</h2>
              <p className="text-sm text-muted-foreground">{CONFIG.labels.profilePhotoHint}</p>
              <input ref={profileRef} type="file" accept="image/*" onChange={handleProfileUpload} className="hidden" />
              <div
                onClick={() => profileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors min-h-[220px]"
              >
                {form.profilePreview ? (
                  <>
                    <img src={form.profilePreview} alt="Profile preview" className="w-36 h-36 rounded-full object-cover border-4 border-primary/20 shadow-md" />
                    <p className="text-sm text-primary font-medium">Click to change photo</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{CONFIG.labels.profilePhoto}</p>
                      <p className="text-xs text-muted-foreground mt-1">Click or tap to upload — any size accepted</p>
                    </div>
                    <button type="button" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Upload className="h-4 w-4" /> Upload Photo
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ── PROFESSIONAL SKILLS ───────────────────────────────────────────── */}
          {currentStep === 'skills' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.skills}</h2>
              <p className="text-sm text-muted-foreground">{CONFIG.labels.skillInputHint}</p>
              <SkillInput label={`${CONFIG.labels.clinicalSkills} (English)`} items={form.clinicalSkills} onAdd={v => addSkill('clinicalSkills', v)} onRemove={i => removeSkill('clinicalSkills', i)} placeholder={CONFIG.placeholders.clinicalSkill} />
              <SkillInput label={`${CONFIG.labels.clinicalSkills} (Arabic)`} items={form.clinicalSkillsAr} onAdd={v => addSkill('clinicalSkillsAr', v)} onRemove={i => removeSkill('clinicalSkillsAr', i)} placeholder="مثال: جراحة الفم" />
              <SkillInput label={`${CONFIG.labels.digitalSkills} (English)`} items={form.digitalSkills} onAdd={v => addSkill('digitalSkills', v)} onRemove={i => removeSkill('digitalSkills', i)} placeholder={CONFIG.placeholders.digitalSkill} />
              <SkillInput label={`${CONFIG.labels.digitalSkills} (Arabic)`} items={form.digitalSkillsAr} onAdd={v => addSkill('digitalSkillsAr', v)} onRemove={i => removeSkill('digitalSkillsAr', i)} placeholder="مثال: التصوير الفوتوغرافي" />
              <SkillInput label={`${CONFIG.labels.softSkills} (English)`} items={form.softSkills} onAdd={v => addSkill('softSkills', v)} onRemove={i => removeSkill('softSkills', i)} placeholder={CONFIG.placeholders.softSkill} />
              <SkillInput label={`${CONFIG.labels.softSkills} (Arabic)`} items={form.softSkillsAr} onAdd={v => addSkill('softSkillsAr', v)} onRemove={i => removeSkill('softSkillsAr', i)} placeholder="مثال: التواصل مع المرضى" />
            </section>
          )}

          {/* ── CAREER TIMELINE ───────────────────────────────────────────────── */}
          {currentStep === 'timeline' && (
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.timeline}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{CONFIG.labels.timelineHint}</p>
                </div>
                <button onClick={addMilestone} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
                  <Plus className="h-4 w-4" /> {CONFIG.labels.addMilestone}
                </button>
              </div>
              {form.timeline.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm">No milestones yet — click Add Milestone to start</p>
                </div>
              )}
              <div className="space-y-3">
                {form.timeline.map((m, i) => (
                  <div key={i} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Milestone {i + 1}</span>
                      <button onClick={() => removeMilestone(i)} className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <InputField label={CONFIG.labels.milestoneYear} value={m.year} onChange={v => updateMilestone(i, 'year', v)} placeholder={CONFIG.placeholders.milestoneYear} />
                      <InputField label={CONFIG.labels.milestoneEn} value={m.event} onChange={v => updateMilestone(i, 'event', v)} placeholder={CONFIG.placeholders.milestoneEn} />
                      <InputField label={CONFIG.labels.milestoneAr} value={m.eventAr} onChange={v => updateMilestone(i, 'eventAr', v)} placeholder={CONFIG.placeholders.milestoneAr} dir="rtl" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── CLINICAL CASES ────────────────────────────────────────────────── */}
          {currentStep === 'cases' && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.cases}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{CONFIG.labels.casesHint}</p>
              </div>
              <input ref={casesRef} type="file" accept="image/*" multiple onChange={handleCasesUpload} className="hidden" />
              <button
                onClick={() => casesRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary font-medium text-sm hover:bg-primary/5 hover:border-primary transition-colors"
              >
                <Upload className="h-4.5 w-4.5" />
                {CONFIG.labels.selectPhotos} (select multiple)
              </button>
              {form.cases.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No cases yet — tap above to upload case photos</p>
                </div>
              )}
              <div className="space-y-4">
                {form.cases.map((c, i) => (
                  <div key={i} className="border border-border rounded-xl bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Case {i + 1}</span>
                      <button onClick={() => removeCase(i)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      {c.preview && (
                        <img src={c.preview} alt={`Case ${i + 1}`} className="case-photo-preview" />
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">{CONFIG.labels.category}</label>
                          <div className="relative">
                            <select
                              value={c.category}
                              onChange={e => updateCase(i, 'category', e.target.value)}
                              className="w-full appearance-none px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">{CONFIG.labels.selectCategory}</option>
                              {CONFIG.caseCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.en}</option>
                              ))}
                              <option value="custom">{CONFIG.labels.customCategory}</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        {c.category === 'custom' && (
                          <InputField label="Custom Category Name" value={c.customCategory} onChange={v => updateCase(i, 'customCategory', v)} placeholder="e.g. Implantology" />
                        )}
                        <InputField label={CONFIG.labels.caseTitleEn} value={c.title} onChange={v => updateCase(i, 'title', v)} placeholder={CONFIG.placeholders.caseTitleEn} />
                        <InputField label={CONFIG.labels.caseTitleAr} value={c.titleAr} onChange={v => updateCase(i, 'titleAr', v)} placeholder={CONFIG.placeholders.caseTitleAr} dir="rtl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── PREVIEW & SUBMIT ──────────────────────────────────────────────── */}
          {currentStep === 'preview' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.preview}</h2>
              <p className="text-sm text-muted-foreground">{CONFIG.labels.previewSubtitle}</p>

              {!tomlOutput ? (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {generating ? 'Generating…' : 'Generate Config File'}
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <Check className="h-4 w-4 text-primary" /> Config file ready
                    </div>
                    {[
                      ['Name', form.fullName], ['Title', form.title],
                      ['University', form.university], ['Year', form.graduationYear],
                      ['Phone', form.phone], ['Email', form.email],
                      ['Clinical Skills', form.clinicalSkills.join(', ')],
                      ['Timeline entries', `${form.timeline.length} milestones`],
                      ['Clinical Cases', `${form.cases.length} cases`],
                    ].map(([k, v]) => v && (
                      <div key={k} className="flex justify-between text-sm gap-3">
                        <span className="text-muted-foreground shrink-0">{k}</span>
                        <span className="text-foreground text-right truncate">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* TOML preview */}
                  <details className="rounded-xl border border-border overflow-hidden">
                    <summary className="px-4 py-3 bg-muted/50 text-sm font-medium cursor-pointer hover:bg-muted transition-colors">
                      Preview TOML content
                    </summary>
                    <pre className="p-4 text-xs text-foreground overflow-auto max-h-56 font-mono leading-relaxed bg-background">
                      {tomlOutput}
                    </pre>
                  </details>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => downloadToml(tomlOutput)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      {CONFIG.buttons.downloadToml}
                    </button>
                    <button
                      onClick={handleSendWhatsApp}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {CONFIG.buttons.sendWhatsApp}
                    </button>
                  </div>

                  <button onClick={() => { setForm(blankForm()); setStep(0); setTomlOutput(''); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors">
                    <RotateCcw className="h-4 w-4" /> {CONFIG.buttons.resetForm}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Navigation (hidden on intro and preview) */}
        {currentStep !== 'preview' && currentStep !== 'intro' && (
          <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {CONFIG.buttons.previous}
            </button>
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {CONFIG.buttons.next} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
