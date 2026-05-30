import { useState, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, ArrowRight, Plus, X, Upload, Image as ImageIcon, Check, FileDown, RotateCcw, ChevronDown, MessageCircle } from 'lucide-react';
import Header from '../components/Header';
import CONFIG from '../config';
import { generateCvPdf } from '../lib/pdfGenerator';
import { processImageToBase64, processMultipleImages } from '../lib/imageProcessor';
import { gtagEvent } from '../lib/gtag';

type Step = 'personal' | 'contact' | 'photo' | 'skills' | 'timeline' | 'cases' | 'preview';

const STEPS: Step[] = ['personal', 'contact', 'photo', 'skills', 'timeline', 'cases', 'preview'];
const STEP_LABELS: Record<Step, string> = {
  personal: CONFIG.steps.personal,
  contact:  CONFIG.steps.contact,
  photo:    CONFIG.steps.photo,
  skills:   CONFIG.steps.skills,
  timeline: CONFIG.steps.timeline,
  cases:    CONFIG.steps.cases,
  preview:  CONFIG.steps.preview,
};

interface Milestone { year: string; event: string }
interface ClinicalCase {
  category: string; customCategory: string;
  title: string; subtitle: string; photo: string | null; preview: string | null;
}

const blankCase = (): ClinicalCase => ({
  category: '', customCategory: '', title: '', subtitle: '', photo: null, preview: null,
});

interface FormData {
  fullName: string; title: string; graduationYear: string; university: string;
  phone: string; whatsapp: string; email: string; website: string;
  profilePhoto: string | null; profilePreview: string | null;
  clinicalSkills: string[]; digitalSkills: string[]; softSkills: string[];
  timeline: Milestone[];
  cases: ClinicalCase[];
}

const blankForm = (): FormData => ({
  fullName: '', title: '', graduationYear: '', university: '',
  phone: '', whatsapp: '', email: '', website: '',
  profilePhoto: null, profilePreview: null,
  clinicalSkills: [], digitalSkills: [], softSkills: [],
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

function InputField({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
      />
    </div>
  );
}

export default function CVWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(blankForm());
  const profileRef = useRef<HTMLInputElement>(null);
  const casesRef   = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addSkill = (key: keyof FormData, v: string) =>
    setForm(prev => ({ ...prev, [key]: [...(prev[key] as string[]), v] }));
  const removeSkill = (key: keyof FormData, i: number) =>
    setForm(prev => ({ ...prev, [key]: (prev[key] as string[]).filter((_, idx) => idx !== i) }));

  const addMilestone = () => set('timeline', [...form.timeline, { year: '', event: '' }]);
  const removeMilestone = (i: number) => set('timeline', form.timeline.filter((_, idx) => idx !== i));
  const updateMilestone = (i: number, k: keyof Milestone, v: string) => {
    const t = [...form.timeline]; t[i] = { ...t[i], [k]: v }; set('timeline', t);
  };

  const updateCase = (i: number, k: keyof ClinicalCase, v: string) => {
    const c = [...form.cases]; c[i] = { ...c[i], [k]: v }; set('cases', c);
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

  const handleDownloadPdf = () => {
    generateCvPdf({
      fullName: form.fullName, title: form.title,
      graduationYear: form.graduationYear, university: form.university,
      phone: form.phone, whatsapp: form.whatsapp,
      email: form.email, website: form.website,
      profilePhoto: form.profilePhoto,
      skills: { clinical: form.clinicalSkills, digital: form.digitalSkills, soft: form.softSkills },
      timeline: form.timeline,
      cases: form.cases.map(c => ({
        category: c.category === 'custom'
          ? c.customCategory
          : (CONFIG.caseCategories.find(cat => cat.id === c.category)?.en || c.category || 'General'),
        title: c.title,
        subtitle: c.subtitle || undefined,
        photo: c.photo,
      })),
    });
  };

  const handlePayWhatYouWant = () => {
    const num = CONFIG.payWhatYouWant.whatsappNumber.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(CONFIG.payWhatYouWant.whatsappMessage);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBack />

      {/* Progress bar */}
      <div className="w-full bg-muted h-1.5">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {/* Step indicators */}
      <div className="w-full overflow-x-auto border-b border-border/50">
        <div className="flex min-w-max max-w-3xl mx-auto px-4 py-2 gap-1">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => i < step && setStep(i)}
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

          {/* ── PERSONAL INFO ────────────────────────────────────────────────── */}
          {currentStep === 'personal' && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.personal}</h2>
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">CV mode — English only</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label={CONFIG.labels.fullNameEn} value={form.fullName} onChange={v => set('fullName', v)} placeholder={CONFIG.placeholders.fullNameEn} required />
                <InputField label={CONFIG.labels.titleEn} value={form.title} onChange={v => set('title', v)} placeholder={CONFIG.placeholders.titleEn} />
                <InputField label={CONFIG.labels.graduationYear} value={form.graduationYear} onChange={v => set('graduationYear', v)} placeholder={CONFIG.placeholders.graduationYear} />
                <div className="sm:col-span-2">
                  <InputField label={CONFIG.labels.universityEn} value={form.university} onChange={v => set('university', v)} placeholder={CONFIG.placeholders.universityEn} />
                </div>
              </div>
            </section>
          )}

          {/* ── CONTACT DETAILS ──────────────────────────────────────────────── */}
          {currentStep === 'contact' && (
            <section className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.contact}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label={CONFIG.labels.phone} value={form.phone} onChange={v => set('phone', v)} placeholder={CONFIG.placeholders.phone} type="tel" />
                <InputField label={`${CONFIG.labels.whatsapp} (clickable in PDF)`} value={form.whatsapp} onChange={v => set('whatsapp', v)} placeholder={CONFIG.placeholders.whatsapp} type="tel" />
                <InputField label={CONFIG.labels.email} value={form.email} onChange={v => set('email', v)} placeholder={CONFIG.placeholders.email} type="email" />
                <InputField label={CONFIG.labels.website} value={form.website} onChange={v => set('website', v)} placeholder={CONFIG.placeholders.website} type="url" />
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
                    <img src={form.profilePreview} alt="Profile" className="w-36 h-36 rounded-full object-cover border-4 border-primary/20 shadow-md" />
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
              <SkillInput label={CONFIG.labels.clinicalSkills} items={form.clinicalSkills} onAdd={v => addSkill('clinicalSkills', v)} onRemove={i => removeSkill('clinicalSkills', i)} placeholder={CONFIG.placeholders.clinicalSkill} />
              <SkillInput label={CONFIG.labels.digitalSkills} items={form.digitalSkills} onAdd={v => addSkill('digitalSkills', v)} onRemove={i => removeSkill('digitalSkills', i)} placeholder={CONFIG.placeholders.digitalSkill} />
              <SkillInput label={CONFIG.labels.softSkills} items={form.softSkills} onAdd={v => addSkill('softSkills', v)} onRemove={i => removeSkill('softSkills', i)} placeholder={CONFIG.placeholders.softSkill} />
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
                  <div key={i} className="border border-border rounded-xl p-4 bg-card">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Milestone {i + 1}</span>
                      <button onClick={() => removeMilestone(i)} className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <InputField label={CONFIG.labels.milestoneYear} value={m.year} onChange={v => updateMilestone(i, 'year', v)} placeholder={CONFIG.placeholders.milestoneYear} />
                      <div className="sm:col-span-2">
                        <InputField label={CONFIG.labels.milestoneEn} value={m.event} onChange={v => updateMilestone(i, 'event', v)} placeholder={CONFIG.placeholders.milestoneEn} />
                      </div>
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
                <h2 className="text-xl font-bold text-foreground">
                  {STEP_LABELS.cases}
                  {CONFIG.labels.casesUnlimitedLabel && (
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      ({CONFIG.labels.casesUnlimitedLabel})
                    </span>
                  )}
                </h2>
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
                        <div className={c.category === 'custom' ? '' : 'sm:col-span-2'}>
                          <InputField label={CONFIG.labels.caseTitleEn} value={c.title} onChange={v => updateCase(i, 'title', v)} placeholder={CONFIG.placeholders.caseTitleEn} />
                        </div>
                        <div className="sm:col-span-2">
                          <InputField label={CONFIG.labels.caseSubtitle} value={c.subtitle} onChange={v => updateCase(i, 'subtitle', v)} placeholder={CONFIG.placeholders.caseSubtitle} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── PREVIEW & DOWNLOAD PDF ────────────────────────────────────────── */}
          {currentStep === 'preview' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">{STEP_LABELS.preview}</h2>
              <p className="text-sm text-muted-foreground">{CONFIG.labels.previewSubtitle}</p>

              {/* Summary card */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground mb-3">CV Summary</p>
                {[
                  ['Name', form.fullName], ['Title', form.title],
                  ['University', form.university], ['Year', form.graduationYear],
                  ['Phone', form.phone], ['WhatsApp (clickable)', form.whatsapp],
                  ['Email', form.email], ['Website', form.website],
                  ['Clinical Skills', form.clinicalSkills.join(', ')],
                  ['Digital Skills', form.digitalSkills.join(', ')],
                  ['Soft Skills', form.softSkills.join(', ')],
                  ['Timeline entries', form.timeline.length > 0 ? `${form.timeline.length} milestones` : ''],
                  ['Clinical Cases', form.cases.length > 0 ? `${form.cases.length} cases` : ''],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex justify-between text-sm gap-3">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="text-foreground text-right truncate">{v}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  gtagEvent('download_pdf', { pathway: 'cv' });
                  handleDownloadPdf();
                }}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors shadow-md"
              >
                <FileDown className="h-5 w-5" />
                {CONFIG.buttons.downloadPdf}
              </button>

              {/* Pay What You Want button */}
              {CONFIG.payWhatYouWant.enabled === 'on' && (
                <button
                  onClick={() => {
                    gtagEvent('pay_what_you_want', { pathway: 'cv', source: 'wizard' });
                    handlePayWhatYouWant();
                  }}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {CONFIG.payWhatYouWant.buttonLabel}
                </button>
              )}

              <button onClick={() => { setForm(blankForm()); setStep(0); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors">
                <RotateCcw className="h-4 w-4" /> {CONFIG.buttons.resetForm}
              </button>
            </section>
          )}
        </div>

        {/* Navigation */}
        {currentStep !== 'preview' && (
          <div className="flex justify-between mt-8 pt-4 border-t border-border/50">
            <button
              onClick={() => {
                gtagEvent('cv_step', { step: STEPS[step], action: 'previous' });
                setStep(s => Math.max(0, s - 1));
              }}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {CONFIG.buttons.previous}
            </button>
            <button
              onClick={() => {
                gtagEvent('cv_step', { step: STEPS[step], action: 'next' });
                setStep(s => Math.min(STEPS.length - 1, s + 1));
              }}
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
