import jsPDF from 'jspdf';
import CONFIG from '../config';

export interface CvData {
  fullName: string;
  title: string;
  graduationYear: string;
  university: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  profilePhoto: string | null;
  skills: { clinical: string[]; digital: string[]; soft: string[] };
  timeline: Array<{ year: string; event: string }>;
  cases: Array<{ category: string; title: string; subtitle?: string; photo: string | null }>;
}

const PRIMARY = CONFIG.pdf.primaryColor;

const DARK_BACKGROUND = '#164e63';
const DARK_TEXT       = '#E0E0E0';
const DARK_MUTED      = '#A0A0A0';
const DARK_LINE       = '#2C2C2C';

const TEXT    = DARK_TEXT;
const MUTED   = DARK_MUTED;
const LINE    = DARK_LINE;

function applyColor(doc: jsPDF, method: 'fill' | 'draw' | 'text', hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (method === 'fill') doc.setFillColor(r, g, b);
  else if (method === 'draw') doc.setDrawColor(r, g, b);
  else doc.setTextColor(r, g, b);
}

export function generateCvPdf(data: CvData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, ML = 18, MR = 18, CW = W - ML - MR;
  const FOOTER_Y = H - 6;

  applyColor(doc, 'fill', DARK_BACKGROUND);
  doc.rect(0, 0, W, H, 'F');

  let y = 0;

  // ── PAGE 1: COVER ────────────────────────────────────────────────────────────
  // Profile photo — centered circle at top
  if (data.profilePhoto?.startsWith('data:image')) {
    const sz = 42, px = W / 2 - sz / 2, py = 28;
    try { doc.addImage(data.profilePhoto, 'WEBP', px, py, sz, sz, undefined, 'FAST'); } catch {}
    y = py + sz + 12;
  } else {
    y = 84;
  }

  // Name — large, centered, uppercase
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  applyColor(doc, 'text', TEXT);
  doc.text((data.fullName || 'Your Name').toUpperCase(), W / 2, y, { align: 'center' });
  y += 10;

  // Title
  if (data.title) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
    applyColor(doc, 'text', MUTED);
    doc.text(data.title, W / 2, y, { align: 'center' });
    y += 8;
  }

  // University / graduation
  if (data.graduationYear || data.university) {
    doc.setFontSize(9); applyColor(doc, 'text', MUTED);
    const parts = [
      data.graduationYear && `Graduated ${data.graduationYear}`,
      data.university     || undefined,
    ].filter(Boolean).join(' — ');
    doc.text(parts, W / 2, y, { align: 'center' });
    y += 12;
  } else {
    y += 4;
  }

  // Thin divider
  applyColor(doc, 'draw', LINE); doc.setLineWidth(0.4);
  doc.line(ML + 22, y, W - MR - 22, y);
  y += 10;

  // Contact info — centered, stacked, each line "Label  Value"
  const contacts = [
    data.phone    && { label: 'Phone:',    val: data.phone,    link: null as string | null },
    data.whatsapp && { label: 'WhatsApp:', val: data.whatsapp, link: `https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}` },
    data.email    && { label: 'Email:',    val: data.email,    link: `mailto:${data.email}` },
    data.website  && { label: 'Website:',  val: data.website,  link: data.website },
  ].filter(Boolean) as Array<{ label: string; val: string; link: string | null }>;

  doc.setFontSize(9.5);
  contacts.forEach(c => {
    // Measure widths with correct font weights
    doc.setFont('helvetica', 'bold');
    const lw = doc.getTextWidth(c.label + '  ');
    doc.setFont('helvetica', 'normal');
    const vw = doc.getTextWidth(c.val);
    const startX = W / 2 - (lw + vw) / 2;

    doc.setFont('helvetica', 'bold'); applyColor(doc, 'text', TEXT);
    doc.text(c.label, startX, y);
    doc.setFont('helvetica', 'normal'); applyColor(doc, 'text', c.link ? PRIMARY : TEXT);
    doc.text(c.val, startX + lw, y);
    if (c.link) doc.link(startX + lw, y - 3.5, vw, 5, { url: c.link });
    y += 7.5;
  });

  // ── PAGE 2: PROFESSIONAL SKILLS ──────────────────────────────────────────────
  const skillGroups = [
    { label: 'Clinical Skills', items: data.skills.clinical },
    { label: 'Digital Skills',  items: data.skills.digital },
    { label: 'Soft Skills',     items: data.skills.soft },
  ].filter(g => g.items.length > 0);

  if (skillGroups.length > 0) {
    doc.addPage(); y = 18;
    drawSectionTitle('PROFESSIONAL SKILLS', y); y += 14;

    skillGroups.forEach(g => {
      y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      applyColor(doc, 'text', TEXT);
      doc.text(g.label, W / 2, y, { align: 'center' }); y += 7;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      applyColor(doc, 'text', MUTED);
      const joined = g.items.join(' • ');
      const lines = doc.splitTextToSize(joined, CW - 4) as string[];
      lines.forEach(line => { doc.text(line, W / 2, y, { align: 'center' }); y += 5.5; });
      y += 4;
    });
  }

  // ── PAGE 3: EDUCATION & CAREER ────────────────────────────────────────────────
  const hasEdu = data.university || data.graduationYear || data.timeline.length > 0;
  if (hasEdu) {
    doc.addPage(); y = 18;
    drawSectionTitle('EDUCATION & CAREER', y); y += 14;

    if (data.university) {
      y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      applyColor(doc, 'text', TEXT);
      doc.text(data.university, W / 2, y, { align: 'center' }); y += 8;
    }
    if (data.graduationYear) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      applyColor(doc, 'text', MUTED);
      doc.text(`Graduated: ${data.graduationYear}`, W / 2, y, { align: 'center' }); y += 12;
    }

    const sorted = [...data.timeline].sort((a, b) => Number(a.year) - Number(b.year));
    sorted.forEach(item => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      applyColor(doc, 'text', TEXT);
      doc.text(`${item.year} — ${item.event}`, W / 2, y, { align: 'center' }); y += 7;
    });
  }

  // ── CLINICAL CASES ────────────────────────────────────────────────────────────
  if (CONFIG.pdf.showCasesInPdf && data.cases.length > 0) {
    // Cases section cover page
    doc.addPage();
    drawSectionTitle('CLINICAL CASES PORTFOLIO', H / 2);

    // One full page per case
    data.cases.forEach(c => {
      doc.addPage(); y = 20;

      // Category
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      applyColor(doc, 'text', TEXT);
      doc.text(c.category || 'General', W / 2, y, { align: 'center' }); y += 9;

      // Title
      if (c.title) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        applyColor(doc, 'text', TEXT);
        doc.text(c.title, W / 2, y, { align: 'center' }); y += 8;
      }

      // Subtitle / description
      if (c.subtitle) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(10);
        applyColor(doc, 'text', MUTED);
        doc.text(c.subtitle, W / 2, y, { align: 'center' }); y += 8;
      }

      // Photo fills the remaining page (above footer)
      if (c.photo?.startsWith('data:image')) {
        const photoTop = y + 3;
        const photoH   = FOOTER_Y - photoTop - 10;
        try { doc.addImage(c.photo, 'WEBP', ML, photoTop, CW, photoH, undefined, 'FAST'); } catch {}
      }
    });
  }

  // ── COMPLETE PORTFOLIO ────────────────────────────────────────────────────────
  if (data.website) {
    doc.addPage(); y = H / 2 - 20;
    drawSectionTitle('COMPLETE PORTFOLIO', y); y += 16;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    applyColor(doc, 'text', TEXT);
    doc.text('For complete portfolio and additional cases', W / 2, y, { align: 'center' }); y += 7;
    doc.text('please visit my professional website:', W / 2, y, { align: 'center' }); y += 8;

    applyColor(doc, 'text', PRIMARY);
    doc.text(data.website, W / 2, y, { align: 'center' });
    doc.link(ML, y - 4, CW, 6, { url: data.website });
  }

  // ── RUNNING HEADER + FOOTER (all pages) ────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // Running header on pages 2+
    if (p > 1) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      applyColor(doc, 'text', TEXT);
      doc.text(data.fullName || 'PortfolioHubs', ML, 10);
      doc.text(`Page ${p} of ${total}`, W - MR, 10, { align: 'right' });
      applyColor(doc, 'draw', LINE); doc.setLineWidth(0.3);
      doc.line(ML, 13, W - MR, 13);
    }

    // Footer on all pages
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    applyColor(doc, 'text', MUTED);
    doc.text(
      `${CONFIG.pdf.footerText} ${data.fullName || 'PortfolioHubs'}`,
      W / 2, FOOTER_Y, { align: 'center' }
    );
  }

  const safeName = (data.fullName || 'cv').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeName}_cv.pdf`);

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  function drawSectionTitle(title: string, yPos: number) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    applyColor(doc, 'text', TEXT);
    const tw = doc.getTextWidth(title);
    const hw = tw / 2 + 6;
    applyColor(doc, 'draw', LINE); doc.setLineWidth(0.5);
    doc.line(ML, yPos - 1.5, W / 2 - hw, yPos - 1.5);
    doc.line(W / 2 + hw, yPos - 1.5, W - MR, yPos - 1.5);
    doc.text(title, W / 2, yPos, { align: 'center' });
  }
}
