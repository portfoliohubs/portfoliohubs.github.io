import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Sliders,
  Sparkles,
  Download,
  RotateCcw,
  RotateCw,
  Eye,
  Layers,
  Move,
  Maximize2,
  Trash2,
  Grid,
  Sun,
  Smile,
  SplitSquareVertical,
  Check,
  ChevronDown,
  Info,
} from 'lucide-react';
import { PromoGate } from '../components/PromoGate';
import { TOOTH_TEMPLATES, VITA_SHADES, type ToothTemplate } from '../lib/dsd/toothLibrary';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface PlacedTooth {
  id: string;
  templateId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shade: string;
  opacity: number;
}

interface LandmarkPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

function DsdStudioContent() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'teeth' | 'landmarks' | 'shades'>('tools');
  const [showGoldenRatio, setShowGoldenRatio] = useState(true);
  const [showSmileCurve, setShowSmileCurve] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [selectedToothId, setSelectedToothId] = useState<string | null>(null);
  const [placedTeeth, setPlacedTeeth] = useState<PlacedTooth[]>([]);
  const [activeShade, setActiveShade] = useState('BL1');
  const [toothOpacity, setToothOpacity] = useState(0.85);

  // Before/After comparison mode
  const [isComparing, setIsComparing] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);

  // Landmarks state
  const [landmarks, setLandmarks] = useState<LandmarkPoint[]>([
    { id: 'midline_top', label: 'Facial Midline Top', x: 400, y: 120, color: '#3b82f6' },
    { id: 'midline_bottom', label: 'Facial Midline Bottom', x: 400, y: 550, color: '#3b82f6' },
    { id: 'lip_left', label: 'Left Commissure', x: 260, y: 350, color: '#ec4899' },
    { id: 'lip_right', label: 'Right Commissure', x: 540, y: 350, color: '#ec4899' },
    { id: 'incisal_center', label: 'Incisal Edge', x: 400, y: 360, color: '#eab308' },
    { id: 'gum_zenith_11', label: 'Gingival Zenith 11', x: 380, y: 310, color: '#10b981' },
    { id: 'gum_zenith_21', label: 'Gingival Zenith 21', x: 420, y: 310, color: '#10b981' },
  ]);

  // History stack for 50-step Undo/Redo
  const [history, setHistory] = useState<PlacedTooth[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample patient image if none uploaded
  useEffect(() => {
    setImageSrc('https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1000&q=85');
  }, []);

  // Push state to undo/redo history
  const pushHistory = (teeth: PlacedTooth[]) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(teeth);
    if (updated.length > 50) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setPlacedTeeth(history[prev]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setPlacedTeeth(history[next]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setPlacedTeeth([]);
    };
    reader.readAsDataURL(file);
  };

  // Add a tooth template into the canvas
  const addTooth = (template: ToothTemplate) => {
    const newTooth: PlacedTooth = {
      id: `tooth-${Date.now()}`,
      templateId: template.id,
      x: 370 + (placedTeeth.length % 4) * 20,
      y: 310,
      width: 45,
      height: 58,
      rotation: 0,
      shade: activeShade,
      opacity: toothOpacity,
    };
    const updated = [...placedTeeth, newTooth];
    setPlacedTeeth(updated);
    setSelectedToothId(newTooth.id);
    pushHistory(updated);
  };

  // Add full 6-anterior teeth template
  const applyHollywoodSmileTemplate = () => {
    const startX = 280;
    const baseY = 310;
    const widths = [35, 42, 50, 50, 42, 35]; // canine, lat, cent, cent, lat, canine
    const heights = [52, 50, 60, 60, 50, 52];

    const batch: PlacedTooth[] = widths.map((w, i) => ({
      id: `hollywood-${Date.now()}-${i}`,
      templateId: TOOTH_TEMPLATES[0].id,
      x: startX + i * 40,
      y: baseY,
      width: w,
      height: heights[i],
      rotation: (i - 2.5) * 2,
      shade: activeShade,
      opacity: toothOpacity,
    }));

    setPlacedTeeth(batch);
    pushHistory(batch);
  };

  // Export Canvas as High Resolution PNG
  const handleExport = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1600, 1200);

      // Draw teeth overlays
      placedTeeth.forEach((tooth) => {
        ctx.save();
        ctx.translate(tooth.x * 2, tooth.y * 2);
        ctx.rotate((tooth.rotation * Math.PI) / 180);
        ctx.globalAlpha = tooth.opacity;
        ctx.fillStyle = VITA_SHADES.find((s) => s.code === tooth.shade)?.hex || '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-tooth.width, -tooth.height, tooth.width * 2, tooth.height * 2, 8);
        ctx.fill();
        ctx.restore();
      });

      // Download triggered
      const link = document.createElement('a');
      link.download = `PortfolioHubs-DSD-Smile-Design-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans select-none">
      <Header />

      {/* Top Studio Action Bar */}
      <div className="bg-gray-850 border-b border-gray-800 px-4 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" /> DSD Studio V4
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono">
            Client-Side 4K
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 hover:bg-gray-800 rounded-lg disabled:opacity-30 cursor-pointer"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 hover:bg-gray-800 rounded-lg disabled:opacity-30 cursor-pointer"
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1"></div>

          <button
            onClick={() => setIsComparing(!isComparing)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isComparing
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-800 hover:bg-gray-750 text-gray-300'
            }`}
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span>Before / After</span>
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export 4K</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Toolbar (Photoshop-like) */}
        <div className="w-full md:w-80 bg-gray-850 border-r border-gray-800 flex flex-col z-10">
          {/* Tool Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex-1 py-3 text-xs font-bold transition-all ${
                activeTab === 'tools'
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Guides & Grids
            </button>
            <button
              onClick={() => setActiveTab('teeth')}
              className={`flex-1 py-3 text-xs font-bold transition-all ${
                activeTab === 'teeth'
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Tooth Library
            </button>
            <button
              onClick={() => setActiveTab('shades')}
              className={`flex-1 py-3 text-xs font-bold transition-all ${
                activeTab === 'shades'
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Vita Shade
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-5">
            {/* TAB 1: GUIDES & GRIDS */}
            {activeTab === 'tools' && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-gray-300 block">Analysis Overlays</span>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-gray-400">Golden Ratio Grid (1.618)</span>
                    <input
                      type="checkbox"
                      checked={showGoldenRatio}
                      onChange={(e) => setShowGoldenRatio(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-gray-400">Smile Arc Curve</span>
                    <input
                      type="checkbox"
                      checked={showSmileCurve}
                      onChange={(e) => setShowSmileCurve(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-gray-400">12 Draggable Facial Landmarks</span>
                    <input
                      type="checkbox"
                      checked={showLandmarks}
                      onChange={(e) => setShowLandmarks(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-300 block">Quick Smile Presets</span>
                  <button
                    onClick={applyHollywoodSmileTemplate}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Apply 6-Anterior Hollywood Arc
                  </button>
                  <button
                    onClick={() => {
                      setPlacedTeeth([]);
                      pushHistory([]);
                    }}
                    className="w-full py-2 px-3 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All Teeth
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-800">
                  <span className="text-xs font-bold text-gray-300 block mb-2">Patient Photo</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 border border-dashed border-gray-700 hover:border-blue-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer text-gray-300 hover:text-white"
                  >
                    <Upload className="w-4 h-4" /> Upload New Portrait
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: TOOTH LIBRARY */}
            {activeTab === 'teeth' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Click to place tooth template
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {TOOTH_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => addTooth(tmpl)}
                      className="p-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-xl cursor-pointer text-center group transition-all"
                    >
                      <svg viewBox="0 0 50 100" className="w-12 h-16 mx-auto mb-2 fill-white group-hover:scale-105 transition-transform">
                        <path d={tmpl.svgPath} />
                      </svg>
                      <span className="text-[11px] font-bold text-gray-200 block truncate">
                        {tmpl.name}
                      </span>
                      <span className="text-[10px] text-gray-500 block capitalize">
                        {tmpl.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: VITA SHADE GUIDE */}
            {activeTab === 'shades' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-300 block">Shade Opacity</span>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.05"
                    value={toothOpacity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setToothOpacity(val);
                      if (selectedToothId) {
                        setPlacedTeeth((prev) =>
                          prev.map((t) => (t.id === selectedToothId ? { ...t, opacity: val } : t))
                        );
                      }
                    }}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>Translucent (30%)</span>
                    <span>Opaque (100%)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-300 block">Vita Bleach & Natural Shades</span>
                  <div className="space-y-1.5">
                    {VITA_SHADES.map((s) => (
                      <div
                        key={s.code}
                        onClick={() => {
                          setActiveShade(s.code);
                          if (selectedToothId) {
                            setPlacedTeeth((prev) =>
                              prev.map((t) => (t.id === selectedToothId ? { ...t, shade: s.code } : t))
                            );
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          activeShade === s.code
                            ? 'bg-blue-950/60 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700/60 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-5 h-5 rounded-full border border-gray-400 shadow-sm"
                            style={{ backgroundColor: s.hex }}
                          />
                          <span className="text-xs font-bold">{s.code}</span>
                          <span className="text-[11px] text-gray-400">({s.name})</span>
                        </div>
                        {activeShade === s.code && <Check className="w-4 h-4 text-blue-400" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 bg-black flex items-center justify-center p-4 relative overflow-hidden">
          {imageSrc && (
            <div className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center">
              {/* Underlying Patient Image */}
              <img
                src={imageSrc}
                alt="Patient Smile"
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl pointer-events-none"
              />

              {/* Before/After Split Line in Comparison Mode */}
              {isComparing && (
                <div
                  className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img
                    src={imageSrc}
                    alt="Original"
                    className="w-full h-full object-contain filter grayscale contrast-125"
                  />
                  <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded text-xs font-bold text-white">
                    BEFORE
                  </div>
                </div>
              )}

              {/* Golden Ratio Grid Lines */}
              {showGoldenRatio && !isComparing && (
                <div className="absolute inset-0 pointer-events-none border border-amber-400/40 rounded-2xl flex justify-around">
                  <div className="w-px h-full bg-amber-400/30"></div>
                  <div className="w-px h-full bg-amber-400/50 dashed"></div>
                  <div className="w-px h-full bg-amber-400/30"></div>
                </div>
              )}

              {/* Facial Midline & Smile Curve */}
              {showSmileCurve && !isComparing && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,5" />
                  <path d="M 25% 65% Q 50% 75% 75% 65%" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="4,4" />
                </svg>
              )}

              {/* Placed Teeth Overlays */}
              {!isComparing &&
                placedTeeth.map((tooth) => {
                  const isSelected = selectedToothId === tooth.id;
                  const shadeHex = VITA_SHADES.find((s) => s.code === tooth.shade)?.hex || '#ffffff';

                  return (
                    <div
                      key={tooth.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedToothId(tooth.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${tooth.x}px`,
                        top: `${tooth.y}px`,
                        width: `${tooth.width}px`,
                        height: `${tooth.height}px`,
                        transform: `rotate(${tooth.rotation}deg)`,
                        opacity: tooth.opacity,
                        backgroundColor: shadeHex,
                        borderRadius: '8px 8px 16px 16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        cursor: 'grab',
                      }}
                      className={`transition-shadow border ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-400 ring-offset-1' : 'border-white/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 bg-blue-600 text-white rounded-full p-0.5 text-[10px]">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Draggable Landmarks */}
              {showLandmarks &&
                !isComparing &&
                landmarks.map((lm) => (
                  <div
                    key={lm.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-move"
                    style={{
                      left: `${lm.x}px`,
                      top: `${lm.y}px`,
                      backgroundColor: lm.color,
                    }}
                    title={lm.label}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                ))}

              {/* Slider Controller for Before/After */}
              {isComparing && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(parseInt(e.target.value))}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 accent-blue-600 cursor-ew-resize z-30"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function DsdStudio() {
  return (
    <PromoGate serviceId="dsd">
      <DsdStudioContent />
    </PromoGate>
  );
}
