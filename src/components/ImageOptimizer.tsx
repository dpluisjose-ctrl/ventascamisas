import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, Sparkles, SlidersHorizontal, ArrowRight, 
  RotateCcw, Info, Check, Maximize2, Wand2, Eye, ShieldAlert,
  Loader2, Sparkle
} from 'lucide-react';

interface ImageOptimizerProps {
  onSendToDtf: (imgSrc: string) => void;
}

export default function ImageOptimizer({ onSendToDtf }: ImageOptimizerProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Optimization Config
  const [scaleFactor, setScaleFactor] = useState<number>(2); // 2x, 3x, 4x
  const [sharpenAmount, setSharpenAmount] = useState<number>(30); // 0 to 100
  const [antiPixelAmount, setAntiPixelAmount] = useState<number>(40); // 0 to 100 (Anti-Pixelado directional smoothing)
  const [denoiseAmount, setDenoiseAmount] = useState<number>(15); // 0 to 100 (Bilateral edge preserving filter)
  const [contrastAmount, setContrastAmount] = useState<number>(0); // -50 to 50
  const [brightnessAmount, setBrightnessAmount] = useState<number>(0); // -50 to 50
  const [saturationAmount, setSaturationAmount] = useState<number>(10); // -50 to 50 (Slight saturation boost helps DTF)
  
  // Background Knockout Config
  const [knockoutEnabled, setKnockoutEnabled] = useState<boolean>(false);
  const [knockoutColor, setKnockoutColor] = useState<string>('#ffffff');
  const [knockoutTolerance, setKnockoutTolerance] = useState<number>(15); // 1 to 100

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load image
  const handleImageUpload = (file: File) => {
    setImageName(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Convert Hex to RGB
  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  // Perform professional upscaling and processing on a separate high-quality canvas
  const processImage = () => {
    if (!image) return;
    setIsProcessing(true);

    setTimeout(() => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Upscaled dimensions
      const targetW = image.width * scaleFactor;
      const targetH = image.height * scaleFactor;
      
      canvas.width = targetW;
      canvas.height = targetH;

      // 1. Render initial scale onto canvas using high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const src = imgData.data;
      const length = src.length;

      // Create a secondary buffer to hold intermediate filter results
      const dest = new Uint8ClampedArray(length);

      // --- Filter 1: Bilateral-like Edge Preserving Denoise ---
      if (denoiseAmount > 0) {
        const threshold = (denoiseAmount / 100) * 45; // Similarity distance threshold
        const radius = 2; // Kernel size

        for (let y = 0; y < targetH; y++) {
          for (let x = 0; x < targetW; x++) {
            const idx = (y * targetW + x) * 4;
            const rCenter = src[idx];
            const gCenter = src[idx+1];
            const bCenter = src[idx+2];
            const aCenter = src[idx+3];

            if (aCenter < 10) {
              dest[idx] = rCenter; dest[idx+1] = gCenter; dest[idx+2] = bCenter; dest[idx+3] = aCenter;
              continue;
            }

            let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;

            for (let ky = -radius; ky <= radius; ky++) {
              const ny = y + ky;
              if (ny < 0 || ny >= targetH) continue;

              for (let kx = -radius; kx <= radius; kx++) {
                const nx = x + kx;
                if (nx < 0 || nx >= targetW) continue;

                const nidx = (ny * targetW + nx) * 4;
                const rNeigh = src[nidx];
                const gNeigh = src[nidx+1];
                const bNeigh = src[nidx+2];
                const aNeigh = src[nidx+3];

                if (aNeigh < 10) continue;

                // Color distance
                const rDiff = rCenter - rNeigh;
                const gDiff = gCenter - gNeigh;
                const bDiff = bCenter - bNeigh;
                const colorDist = Math.sqrt(rDiff*rDiff + gDiff*gDiff + bDiff*bDiff) / 441.673 * 100;

                // Edge weight: closer colors get higher weight, dissimilar colors are ignored to preserve edges
                const colorWeight = Math.max(0, 1 - (colorDist / threshold));

                // Spatial weight
                const spatialWeight = 1 / (1 + (kx*kx + ky*ky));

                const weight = colorWeight * spatialWeight;
                rSum += rNeigh * weight;
                gSum += gNeigh * weight;
                bSum += bNeigh * weight;
                weightSum += weight;
              }
            }

            if (weightSum > 0) {
              dest[idx] = Math.round(rSum / weightSum);
              dest[idx+1] = Math.round(gSum / weightSum);
              dest[idx+2] = Math.round(bSum / weightSum);
              dest[idx+3] = aCenter;
            } else {
              dest[idx] = rCenter; dest[idx+1] = gCenter; dest[idx+2] = bCenter; dest[idx+3] = aCenter;
            }
          }
        }
        // Write denoise results back to source buffer for subsequent sharpening
        for (let i = 0; i < length; i++) src[i] = dest[i];
      }

      // --- Filter 2: Variable Unsharp Sharpening (Convolution Kernel) ---
      if (sharpenAmount > 0) {
        const factor = sharpenAmount / 100;
        // Sharpen convolution matrix kernel
        const kCenter = 1 + 4 * factor;
        const kCorner = -factor;

        for (let y = 1; y < targetH - 1; y++) {
          for (let x = 1; x < targetW - 1; x++) {
            const idx = (y * targetW + x) * 4;

            if (src[idx+3] < 10) {
              dest[idx] = src[idx]; dest[idx+1] = src[idx+1]; dest[idx+2] = src[idx+2]; dest[idx+3] = src[idx+3];
              continue;
            }

            // Neighbor offsets
            const up = idx - targetW * 4;
            const down = idx + targetW * 4;

            // Apply convolution
            const rSum = src[idx] * kCenter + 
                         (src[up] + src[down] + src[idx-4] + src[idx+4]) * kCorner;

            const gSum = src[idx+1] * kCenter + 
                         (src[up+1] + src[down+1] + src[idx-3] + src[idx+5]) * kCorner;

            const bSum = src[idx+2] * kCenter + 
                         (src[up+2] + src[down+2] + src[idx-2] + src[idx+6]) * kCorner;

            dest[idx] = Math.max(0, Math.min(255, rSum));
            dest[idx+1] = Math.max(0, Math.min(255, gSum));
            dest[idx+2] = Math.max(0, Math.min(255, bSum));
            dest[idx+3] = src[idx+3];
          }
        }
        // Write sharpen results back to source buffer
        for (let i = 0; i < length; i++) src[i] = dest[i];
      }

      // --- Filter 2.5: Premium Directional Anti-Pixelado (Edge Anti-Aliasing) ---
      if (antiPixelAmount > 0) {
        const factor = antiPixelAmount / 100;
        
        for (let y = 1; y < targetH - 1; y++) {
          for (let x = 1; x < targetW - 1; x++) {
            const idx = (y * targetW + x) * 4;
            const aVal = src[idx+3];
            if (aVal < 10) continue;

            // Horizontal & vertical luma gradients
            const lumaL = 0.299 * src[idx-4] + 0.587 * src[idx-3] + 0.114 * src[idx-2];
            const lumaR = 0.299 * src[idx+4] + 0.587 * src[idx+5] + 0.114 * src[idx+6];
            const lumaU = 0.299 * src[idx - targetW*4] + 0.587 * src[idx - targetW*4 + 1] + 0.114 * src[idx - targetW*4 + 2];
            const lumaD = 0.299 * src[idx + targetW*4] + 0.587 * src[idx + targetW*4 + 1] + 0.114 * src[idx + targetW*4 + 2];

            const gx = lumaR - lumaL;
            const gy = lumaD - lumaU;
            const gMag = Math.sqrt(gx*gx + gy*gy);

            // If it is a noticeable edge, perform directional smoothing along the edge
            if (gMag > 15) {
              // Direction along the edge (perpendicular to gradient)
              const ex = -gy / gMag;
              const ey = gx / gMag;

              // Sample points along the edge at offset based on factor
              const sampleDist = 1.0 * factor;
              
              // Weighted average of center pixel and its two directional neighbors along the edge
              const px1 = Math.round(x + ex * sampleDist);
              const py1 = Math.round(y + ey * sampleDist);
              const px2 = Math.round(x - ex * sampleDist);
              const py2 = Math.round(y - ey * sampleDist);

              const idx1 = (Math.max(0, Math.min(targetH-1, py1)) * targetW + Math.max(0, Math.min(targetW-1, px1))) * 4;
              const idx2 = (Math.max(0, Math.min(targetH-1, py2)) * targetW + Math.max(0, Math.min(targetW-1, px2))) * 4;

              // Blend neighbors along the edge to suppress stair-stepping
              dest[idx]   = Math.round(src[idx] * (1 - factor) + ((src[idx1] + src[idx2]) / 2) * factor);
              dest[idx+1] = Math.round(src[idx+1] * (1 - factor) + ((src[idx1+1] + src[idx2+1]) / 2) * factor);
              dest[idx+2] = Math.round(src[idx+2] * (1 - factor) + ((src[idx1+2] + src[idx2+2]) / 2) * factor);
              dest[idx+3] = aVal;
            } else {
              dest[idx]   = src[idx];
              dest[idx+1] = src[idx+1];
              dest[idx+2] = src[idx+2];
              dest[idx+3] = aVal;
            }
          }
        }
        // Write anti-pixelation results back to source buffer
        for (let i = 0; i < length; i++) src[i] = dest[i];
      }

      // --- Filter 3: Brightness, Contrast, Saturation, and Color Knockout (Chroma Key) ---
      const contrastFactor = (259 * (contrastAmount + 255)) / (255 * (259 - contrastAmount));
      const brightOffset = brightnessAmount * 2.55;
      const satMultiplier = 1 + (saturationAmount / 100);

      const targetKoColor = hexToRgb(knockoutColor);
      const koTolSquared = (knockoutTolerance * knockoutTolerance) * 3; // 3-dimensional tolerance threshold

      for (let i = 0; i < length; i += 4) {
        let r = src[i];
        let g = src[i+1];
        let b = src[i+2];
        let a = src[i+3];

        if (a < 10) continue;

        // 1. Magic Background Eraser (Color Knockout)
        if (knockoutEnabled) {
          const rDiff = r - targetKoColor.r;
          const gDiff = g - targetKoColor.g;
          const bDiff = b - targetKoColor.b;
          const distSq = rDiff*rDiff + gDiff*gDiff + bDiff*bDiff;

          if (distSq <= koTolSquared) {
            src[i] = 0; src[i+1] = 0; src[i+2] = 0; src[i+3] = 0;
            continue;
          }
        }

        // 2. Brightness
        if (brightnessAmount !== 0) {
          r += brightOffset;
          g += brightOffset;
          b += brightOffset;
        }

        // 3. Contrast
        if (contrastAmount !== 0) {
          r = contrastFactor * (r - 128) + 128;
          g = contrastFactor * (g - 128) + 128;
          b = contrastFactor * (b - 128) + 128;
        }

        // 4. Saturation
        if (saturationAmount !== 0) {
          // Luma weight
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          r = luma + (r - luma) * satMultiplier;
          g = luma + (g - luma) * satMultiplier;
          b = luma + (b - luma) * satMultiplier;
        }

        src[i] = Math.max(0, Math.min(255, r));
        src[i+1] = Math.max(0, Math.min(255, g));
        src[i+2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imgData, 0, 0);
      setIsProcessing(false);
    }, 400);
  };

  // Re-run the image optimization pipeline when controls change
  useEffect(() => {
    if (image) {
      processImage();
    }
  }, [image, scaleFactor, sharpenAmount, antiPixelAmount, denoiseAmount, contrastAmount, brightnessAmount, saturationAmount, knockoutEnabled, knockoutColor, knockoutTolerance]);

  // Reset optimization settings to defaults
  const handleReset = () => {
    setScaleFactor(2);
    setSharpenAmount(30);
    setAntiPixelAmount(40);
    setDenoiseAmount(15);
    setContrastAmount(0);
    setBrightnessAmount(0);
    setSaturationAmount(10);
    setKnockoutEnabled(false);
    setKnockoutColor('#ffffff');
    setKnockoutTolerance(15);
  };

  // Download optimized high-res image
  const handleDownload = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `${imageName}_optimizado_${scaleFactor}x.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Send enhanced image to DTF Prepress component via state injection
  const handleExportToDtfPrepress = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    onSendToDtf(dataUrl);
  };

  return (
    <div id="image-optimizer-workspace" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-violet-100 text-violet-700 rounded-lg">
              <Sparkle className="w-5 h-5 fill-violet-700" />
            </span>
            <h2 className="text-lg font-bold text-slate-800">Upscaler y Optimizador Inteligente</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Escala, elimina ruido, enfoca bordes y remueve fondos automáticamente antes de ripear o aplicar tramas.
          </p>
        </div>

        {image && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer Ajustes
            </button>
            <button
              onClick={() => {
                setImage(null);
                setImageName('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            >
              Quitar Imagen
            </button>
          </div>
        )}
      </div>

      {!image ? (
        /* Upload Area */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 transition-all duration-350 cursor-pointer ${
            dragActive
              ? 'border-violet-500 bg-violet-50/50 scale-[0.99] shadow-inner'
              : 'border-slate-200 hover:border-violet-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
              }
            }}
            accept="image/*"
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-sm">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Carga una imagen para mejorar su calidad</h3>
            <p className="text-xs text-slate-400 mt-1 leading-normal max-w-xs mx-auto">
              Suelte sus archivos PNG, JPEG o WebP aquí, o haga clic para examinar. Recomendado para logotipos pixelados o capturas de baja resolución.
            </p>
          </div>
        </div>
      ) : (
        /* Workspace Split */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Preview panel */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-850 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[420px] max-h-[580px] group shadow-inner">
              
              {/* Canvas Preview */}
              <canvas 
                ref={previewCanvasRef} 
                className="max-w-full max-h-[520px] object-contain shadow-2xl transition-all select-none"
              />

              {/* Status Indicator */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  <span className="text-xs font-semibold tracking-wider">Optimizando píxeles...</span>
                </div>
              )}

              {/* Overlay Dimensions Tag */}
              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-300 font-mono flex items-center gap-2">
                <span className="font-bold text-violet-400">{scaleFactor}x Upscaled</span>
                <span className="text-slate-500">|</span>
                <span>Original: {image.width}x{image.height} px</span>
                <span className="text-slate-500">|</span>
                <span className="font-bold text-emerald-400">Nuevo: {image.width * scaleFactor}x{image.height * scaleFactor} px</span>
              </div>
            </div>

            {/* Quick stats & comparisons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-400 font-medium">Interpolación:</span>
                <span className="font-bold text-slate-700 text-[11px] truncate">Bicúbica Inteligente</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-400 font-medium">Bordes Enfocados:</span>
                <span className={`font-bold text-[11px] truncate ${sharpenAmount > 0 ? 'text-violet-600' : 'text-slate-500'}`}>
                  {sharpenAmount > 0 ? `Enfoque (${sharpenAmount}%)` : 'Inactivo'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-400 font-medium">Anti-Pixelado:</span>
                <span className={`font-bold text-[11px] truncate ${antiPixelAmount > 0 ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {antiPixelAmount > 0 ? `Suave (${antiPixelAmount}%)` : 'Inactivo'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-400 font-medium">Supresión Ruido:</span>
                <span className={`font-bold text-[11px] truncate ${denoiseAmount > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {denoiseAmount > 0 ? `Bilateral (${denoiseAmount}%)` : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Control panel */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            
            {/* Action Card: Direct Connection */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-4.5 rounded-2xl text-white shadow-md shadow-violet-100 flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 fill-white text-white animate-pulse" />
                  ¿Listo para la Preprensa DTF?
                </h3>
                <p className="text-[11px] text-violet-100 leading-normal mt-0.5">
                  Una vez que obtengas la calidad ideal, envía esta imagen mejorada de forma directa al módulo de DTF para calcular tus semitonos.
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={handleExportToDtfPrepress}
                  className="flex-grow flex items-center justify-center gap-2 bg-white text-violet-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-violet-50 transition-all shadow-md cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 text-violet-600" />
                  Enviar a Preprensa DTF
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-violet-800 hover:bg-violet-900 border border-violet-500 text-white p-2.5 rounded-xl transition-all cursor-pointer"
                  title="Descargar imagen optimizada en PNG"
                >
                  <Download className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* 1. ESCALADO (UPSCALING) */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>1. Factor de Escalado</span>
                <span className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-bold uppercase">Resolución</span>
              </h4>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-700">Multiplicar dimensiones:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setScaleFactor(f)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center flex flex-col items-center justify-center ${
                        scaleFactor === f
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs">{f}x</span>
                      <span className="text-[8.5px] font-medium opacity-70">+{f * 100}%</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 leading-normal mt-0.5">
                  Re-muestrea los píxeles utilizando un interpolador bilineal continuo de alta fidelidad, evitando el clásico pixelado borroso y conservando el gradiente original.
                </p>
              </div>
            </div>

            {/* 2. ENFOQUE & LIMPIEZA DE RUIDO */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>2. Filtros de Detalle y Enfoque</span>
                <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">Restauración</span>
              </h4>

              {/* Sharpen Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-violet-500" />
                    Enfoque (Unsharp Masking):
                  </span>
                  <span className="font-bold text-violet-700">{sharpenAmount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={sharpenAmount}
                  onChange={(e) => setSharpenAmount(parseInt(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Fuerza el contraste local en los bordes de la imagen para reconstruir líneas nítidas y logos limpios de baja resolución.
                </p>
              </div>

              {/* Anti-Pixelado Slider */}
              <div className="flex flex-col gap-1 border-t border-slate-50 pt-3">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-indigo-500" />
                    Suavizado Anti-Pixelado (Bordes):
                  </span>
                  <span className="font-bold text-indigo-700">{antiPixelAmount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={antiPixelAmount}
                  onChange={(e) => setAntiPixelAmount(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Suaviza de manera inteligente los bordes en "escalón de sierra" creados al estirar píxeles, logrando líneas fluidas tipo vector en curvas y letras.
                </p>
              </div>

              {/* Denoise Slider */}
              <div className="flex flex-col gap-1 border-t border-slate-50 pt-3">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Denoise (Supresión de Ruido):</span>
                  <span className="font-bold text-emerald-700">{denoiseAmount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={denoiseAmount}
                  onChange={(e) => setDenoiseAmount(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Suaviza las imperfecciones de compresión JPEG sin difuminar los bordes definidos de los colores sólidos.
                </p>
              </div>
            </div>

            {/* 3. MAGIC BACKGROUND ERASER (Knockout) */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>3. Eliminador de Fondos Mágico</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setKnockoutEnabled(!knockoutEnabled)}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                    knockoutEnabled ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-sm transform ${
                      knockoutEnabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {knockoutEnabled && (
                <div className="flex flex-col gap-3.5 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">Color a Eliminar (Fondo):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={knockoutColor}
                        onChange={(e) => setKnockoutColor(e.target.value)}
                        className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">
                        {knockoutColor}
                      </span>
                    </div>
                  </div>

                  {/* Tolerance Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Tolerancia de Color:</span>
                      <span className="font-bold text-emerald-700">{knockoutTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={knockoutTolerance}
                      onChange={(e) => setKnockoutTolerance(parseInt(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Aumenta la tolerancia para eliminar colores de fondo similares o con ligeras sombras.
                    </p>
                  </div>
                </div>
              )}
              
              {!knockoutEnabled && (
                <p className="text-[9px] text-slate-400 leading-normal">
                  Activa esta opción para hacer transparente cualquier color sólido de fondo (como blanco o negro) antes de transferir la imagen a DTF.
                </p>
              )}
            </div>

            {/* 4. AJUSTES DE COLOR Y AJUSTES DE TONO */}
            <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>4. Ajustes de Tono y Color</span>
                <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Color</span>
              </h4>

              {/* Contrast */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Contraste:</span>
                  <span className="font-bold text-slate-800">{contrastAmount > 0 ? `+${contrastAmount}` : contrastAmount}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={contrastAmount}
                  onChange={(e) => setContrastAmount(parseInt(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="flex flex-col gap-1 border-t border-slate-50 pt-2.5">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Saturación:</span>
                  <span className="font-bold text-slate-800">{saturationAmount > 0 ? `+${saturationAmount}%` : `${saturationAmount}%`}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={saturationAmount}
                  onChange={(e) => setSaturationAmount(parseInt(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Un aumento leve (+10% a +20%) de saturación ayuda a compensar la pérdida de viveza del color al estampar en telas de algodón oscuras.
                </p>
              </div>

              {/* Brightness */}
              <div className="flex flex-col gap-1 border-t border-slate-50 pt-2.5">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Brillo:</span>
                  <span className="font-bold text-slate-800">{brightnessAmount > 0 ? `+${brightnessAmount}` : brightnessAmount}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="2"
                  value={brightnessAmount}
                  onChange={(e) => setBrightnessAmount(parseInt(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
