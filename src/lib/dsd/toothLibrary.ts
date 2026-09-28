export interface ToothTemplate {
  id: string;
  name: string;
  category: 'natural' | 'hollywood' | 'oval' | 'square' | 'triangular';
  svgPath: string; // SVG vector path for incisors, canines, premolars
  defaultRatio: number; // width / height
  description: string;
}

export const TOOTH_TEMPLATES: ToothTemplate[] = [
  {
    id: 'hollywood-square-1',
    name: 'Hollywood Square Incisor',
    category: 'hollywood',
    svgPath: 'M 10,20 C 12,5 38,5 40,20 C 40,55 38,80 35,90 C 25,92 20,92 15,90 C 12,80 10,55 10,20 Z',
    defaultRatio: 0.8,
    description: 'Straight incisal edge, dominant central incisors for bold smiles.',
  },
  {
    id: 'natural-soft-oval',
    name: 'Natural Soft Oval',
    category: 'natural',
    svgPath: 'M 12,22 C 15,6 35,6 38,22 C 38,55 36,80 33,88 C 25,90 22,90 17,88 C 14,80 12,55 12,22 Z',
    defaultRatio: 0.77,
    description: 'Rounded line angles, natural embrasures for gentle aesthetics.',
  },
  {
    id: 'triangular-youthful',
    name: 'Youthful Triangular',
    category: 'triangular',
    svgPath: 'M 15,20 C 18,7 32,7 35,20 C 36,55 38,82 36,90 C 27,92 23,92 14,90 C 12,82 14,55 15,20 Z',
    defaultRatio: 0.75,
    description: 'Tapering cervical contour with delicate incisal translucency.',
  },
  {
    id: 'canine-pointed',
    name: 'Aesthetic Canine Cusp',
    category: 'natural',
    svgPath: 'M 14,20 C 18,5 32,5 36,20 C 37,55 36,78 25,92 C 14,78 13,55 14,20 Z',
    defaultRatio: 0.72,
    description: 'Balanced canine guidance cusp contour.',
  },
];

export const VITA_SHADES = [
  { code: 'BL1', name: 'Bleach Extra White', hex: '#FFFFFF' },
  { code: 'BL2', name: 'Bleach Natural White', hex: '#F8F9FA' },
  { code: 'A1', name: 'Vita A1 (Light Natural)', hex: '#FDFBF7' },
  { code: 'A2', name: 'Vita A2 (Universal Natural)', hex: '#FBF7EE' },
  { code: 'A3', name: 'Vita A3 (Warm Natural)', hex: '#F6EFE0' },
  { code: 'B1', name: 'Vita B1 (Luminous Light)', hex: '#FFFDF9' },
  { code: 'B2', name: 'Vita B2 (Warm Luminous)', hex: '#FAF5EA' },
];
