import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Download,
  Film,
  Sparkles,
  Layers,
  Upload,
  Type,
  Music,
  CheckCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { PromoGate } from '../components/PromoGate';
import Header from '../components/Header';
import Footer from '../components/Footer';

export type MotionTemplateId = 'before-after-wipe' | 'zoom-reveal' | 'cinematic-pan' | 'sparkle-glow' | 'minimal-split';

interface MotionTemplate {
  id: MotionTemplateId;
  name: string;
  duration: number; // in seconds
  description: string;
}

const TEMPLATES: MotionTemplate[] = [
  {
    id: 'before-after-wipe',
    name: 'Clinical Before & After Wipe',
    duration: 6,
    description: 'Dynamic horizontal laser split revealing stunning restorative transformation.',
  },
  {
    id: 'zoom-reveal',
    name: 'Macro Zoom & Text Reveal',
    duration: 5,
    description: 'Cinematic slow push into anterior veneer micro-texture with glowing doctor typography.',
  },
  {
    id: 'cinematic-pan',
    name: 'Cinematic Anamorphic Pan',
    duration: 7,
    description: 'Wide aspect ratio sweep across the smile arc with subtle depth of field.',
  },
  {
    id: 'sparkle-glow',
    name: 'Aesthetic Light Particles & Glow',
    duration: 5,
    description: 'Floating golden dust particles highlighting incisal translucency and high gloss.',
  },
  {
    id: 'minimal-split',
    name: 'Minimal Clean Split 9:16',
    duration: 6,
    description: 'Sleek vertical split formatted specifically for Instagram Reels & TikTok.',
  },
];

function MotionStudioContent() {
  const [selectedTemplate, setSelectedTemplate] = useState<MotionTemplateId>('before-after-wipe');
  const [beforeImage, setBeforeImage] = useState<string>(
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80'
  );
  const [afterImage, setAfterImage] = useState<string>(
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80'
  );
  const [doctorName, setDoctorName] = useState('Dr. Michael Nabil');
  const [procedureTitle, setProcedureTitle] = useState('10 E-Max Porcelain Veneers');
  const [clinicName, setClinicName] = useState('Elite Cosmetic Dental Clinic');

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const beforeImgRef = useRef<HTMLImageElement | null>(null);
  const afterImgRef = useRef<HTMLImageElement | null>(null);

  const currentDuration = TEMPLATES.find((t) => t.id === selectedTemplate)?.duration || 6;

  // Preload images into memory
  useEffect(() => {
    const img1 = new Image();
    img1.crossOrigin = 'anonymous';
    img1.src = beforeImage;
    img1.onload = () => {
      beforeImgRef.current = img1;
      drawFrame(0);
    };

    const img2 = new Image();
    img2.crossOrigin = 'anonymous';
    img2.src = afterImage;
    img2.onload = () => {
      afterImgRef.current = img2;
      drawFrame(0);
    };
  }, [beforeImage, afterImage]);

  // Frame rendering engine for 1080x1920 (9:16 vertical video reel)
  const drawFrame = (t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Calculate animation progression
    const wipePos = Math.sin((t * Math.PI) / 2); // 0 to 1 easing

    const img1 = beforeImgRef.current;
    const img2 = afterImgRef.current;

    // Render Before / After depending on template
    if (selectedTemplate === 'before-after-wipe') {
      // 1. Draw Before image full
      if (img1) {
        ctx.save();
        ctx.drawImage(img1, 0, height * 0.2, width, height * 0.55);
        ctx.restore();
      }

      // 2. Draw After image clipped by wipe
      if (img2) {
        ctx.save();
        const clipWidth = width * wipePos;
        ctx.beginPath();
        ctx.rect(0, height * 0.2, clipWidth, height * 0.55);
        ctx.clip();
        ctx.drawImage(img2, 0, height * 0.2, width, height * 0.55);

        // Divider laser line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(clipWidth, height * 0.2);
        ctx.lineTo(clipWidth, height * 0.75);
        ctx.stroke();
        ctx.restore();
      }

      // Labels Before / After
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText('BEFORE', 40, height * 0.25);
      ctx.fillText('AFTER', width - 150, height * 0.25);
    } else {
      // Default Smooth Zoom Reveal
      if (img2) {
        ctx.save();
        const scale = 1 + wipePos * 0.12;
        ctx.translate(width / 2, height * 0.47);
        ctx.scale(scale, scale);
        ctx.drawImage(img2, -width / 2, -(height * 0.55) / 2, width, height * 0.55);
        ctx.restore();
      }
    }

    // Top Header: Clinic branding
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(clinicName.toUpperCase(), width / 2, height * 0.1);

    // Bottom Doctor Card Banner
    const cardY = height * 0.8;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.roundRect(40, cardY, width - 80, 160, 24);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(procedureTitle, width / 2, cardY + 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(doctorName, width / 2, cardY + 115);
  };

  // Play animation loop
  const startPlayback = () => {
    setIsPlaying(true);
    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = (now - startTimeRef.current) / 1000;
      const currentNorm = (elapsed % currentDuration) / currentDuration;

      setProgress(currentNorm);
      drawFrame(currentNorm);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Start Canvas Recorder (Export WebM Reel)
  const handleStartRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    recordedChunksRef.current = [];
    setIsRecording(true);
    setRecordedVideoUrl(null);

    // Stream 30fps from canvas
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
      videoBitsPerSecond: 5000000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setIsRecording(false);
      stopPlayback();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();

    // Play once through full duration then stop recorder
    startTimeRef.current = performance.now();
    startPlayback();

    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, currentDuration * 1000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <Header />

      {/* Motion Studio Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Motion Graphic Reel Studio <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full font-mono">1080x1920 (9:16)</span>
            </h2>
            <p className="text-xs text-gray-400">
              Transform clinical cases into animated video reels for Instagram & TikTok.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            <span>{isPlaying ? 'Pause Preview' : 'Play Animation'}</span>
          </button>

          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isRecording ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Recording Reel ({currentDuration}s)...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Record & Export Video</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout: Controls & Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Controls Column */}
        <div className="w-full md:w-96 space-y-5 overflow-y-auto">
          {/* 1. Template Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Choose Motion Template
            </span>
            <div className="space-y-2">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedTemplate === tmpl.id
                      ? 'border-purple-500 bg-purple-950/40 text-white'
                      : 'border-gray-800 hover:border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs">{tmpl.name}</span>
                    <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-purple-300">
                      {tmpl.duration}s
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">{tmpl.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Text & Typography Overlays */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
              Typography & Titles
            </span>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Doctor Name</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Procedure Title</label>
              <input
                type="text"
                value={procedureTitle}
                onChange={(e) => setProcedureTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Clinic Name</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Export Ready Modal */}
          {recordedVideoUrl && (
            <div className="p-5 bg-emerald-950/60 border border-emerald-700 rounded-2xl space-y-3 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">Reel Ready for Download!</h4>
              <p className="text-xs text-emerald-300">
                1080x1920 WebM video produced client-side.
              </p>
              <a
                href={recordedVideoUrl}
                download={`PortfolioHubs-Reel-${Date.now()}.webm`}
                className="block w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 inline-block mr-1.5" />
                Download Video (WebM)
              </a>
            </div>
          )}
        </div>

        {/* Vertical Reel Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 border border-gray-800 rounded-2xl p-6 relative">
          <div className="relative aspect-[9/16] h-[650px] rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 bg-black">
            <canvas
              ref={canvasRef}
              width={1080}
              height={1920}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Video Timeline Bar */}
          <div className="w-full max-w-md mt-4 flex items-center gap-3">
            <span className="text-[11px] font-mono text-gray-400">
              {(progress * currentDuration).toFixed(1)}s
            </span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-75"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-gray-400">{currentDuration}s</span>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function MotionStudio() {
  return (
    <PromoGate serviceId="motion">
      <MotionStudioContent />
    </PromoGate>
  );
}
