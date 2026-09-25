import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Sliders, RefreshCw, Layers, Eye, Check, Info, FileText, Sparkles, Paintbrush, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { DtfConfig } from '../types';

interface DtfPrepressProps {
  injectedImageSrc?: string;
  onClearInjectedImage?: () => void;
}

export default function DtfPrepress({ injectedImageSrc, onClearInjectedImage }: DtfPrepressProps = {}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<'fit' | 'real'>('fit');
  const [config, setConfig] = useState<DtfConfig>({
    dotSize: 6,
    angle: 22.5,
    contrast: 0,
    brightness: 0,
    shape: 'circle',
    colorMode: 'rgb',
    activePlate: 'all',
    invert: true, // Default to true for white ink base on dark garments
    backgroundType: 'white',
    dotColor: '#ffffff', // White ink by default
    dtfKnockoutBlack: true,
    dtfKnockoutThreshold: 0,
    dtfFabricColor: '#000000', // Black shirt simulator
    dtfDotGainCompensation: 0,
    dtfHighlightBoost: 0,
    dtfGamma: 0.7,
    dtfHdAntialiasing: true, // HD bilinear interpolation enabled by default
    dtfLpi: 100, // 100 LPI professional standard frequency
    dtfExportDpi: 300, // 300 DPI production standard resolution
    dtfMethod: 'halftone',
    dtfBlackPoint: 25,
    dtfWhitePoint: 88,
    dtfPrintWidthCm: 38,
    dtfSelectiveThreshold: 60, // Default selective threshold for shadows
    dtfMinDotSize: 0, // Default: no minimum dot size filter
    dtfEliminateColor: '#ffffff', // Default: eliminate white
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load injected image if passed from upscaler
  useEffect(() => {
    if (injectedImageSrc) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        if (onClearInjectedImage) {
          onClearInjectedImage();
        }
      };
      img.src = injectedImageSrc;
    }
  }, [injectedImageSrc]);

  // Load an image
  const handleImageUpload = (file: File) => {
    setOriginalFile(file);
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  // Adjust brightness, contrast, gamma, and highlight boost of a pixel
  const adjustPixel = (
    r: number, 
    g: number, 
    b: number, 
    brightness: number, 
    contrast: number, 
    gamma: number = config.dtfGamma !== undefined ? config.dtfGamma : 0.7, 
    blackPoint: number = config.dtfBlackPoint !== undefined ? config.dtfBlackPoint : 25,
    whitePoint: number = config.dtfWhitePoint !== undefined ? config.dtfWhitePoint : 88,
    highlightBoost: number = config.dtfHighlightBoost !== undefined ? config.dtfHighlightBoost : 0
  ) => {
    // 1. Apply Brightness
    let red = r + (brightness * 2.55);
    let green = g + (brightness * 2.55);
    let blue = b + (brightness * 2.55);

    // 2. Apply Contrast
    if (contrast !== 0) {
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      red = factor * (red - 128) + 128;
      green = factor * (green - 128) + 128;
      blue = factor * (blue - 128) + 128;
    }

    red = Math.max(0, Math.min(255, red));
    green = Math.max(0, Math.min(255, green));
    blue = Math.max(0, Math.min(255, blue));

    // 3. Apply Black Point & White Point Levels mapping
    const bp = (blackPoint / 100) * 255;
    const wp = (whitePoint / 100) * 255;
    const range = wp - bp;

    const applyLevels = (val: number) => {
      if (val <= bp) return 0;
      if (val >= wp) return 255;
      if (range <= 0) return val;
      return ((val - bp) / range) * 255;
    };

    red = applyLevels(red);
    green = applyLevels(green);
    blue = applyLevels(blue);

    // Normalize to 0-1 for non-linear operations
    let rNorm = red / 255;
    let gNorm = green / 255;
    let bNorm = blue / 255;

    // 4. Apply Gamma Curve
    if (gamma > 0 && gamma !== 1) {
      rNorm = Math.pow(rNorm, 1 / gamma);
      gNorm = Math.pow(gNorm, 1 / gamma);
      bNorm = Math.pow(bNorm, 1 / gamma);
    }

    // 5. Apply Highlight Boost
    if (highlightBoost > 0) {
      const boostFactor = highlightBoost / 100;
      if (rNorm > 0.5) rNorm = rNorm + (1 - rNorm) * boostFactor * 0.45;
      if (gNorm > 0.5) gNorm = gNorm + (1 - gNorm) * boostFactor * 0.45;
      if (bNorm > 0.5) bNorm = bNorm + (1 - bNorm) * boostFactor * 0.45;
    }

    return {
      r: Math.max(0, Math.min(255, rNorm * 255)),
      g: Math.max(0, Math.min(255, gNorm * 255)),
      b: Math.max(0, Math.min(255, bNorm * 255))
    };
  };

  // Render the processed Halftone
  const renderHalftone = () => {
    if (!image || !previewCanvasRef.current) return;

    setIsProcessing(true);

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We scale the image to fit a reasonable workspace (max 800px for fit view, up to 1800px for real 1:1 detail view)
    const maxPreviewDim = previewZoom === 'fit' ? 800 : 1800;
    let previewWidth = image.width;
    let previewHeight = image.height;

    if (previewWidth > maxPreviewDim || previewHeight > maxPreviewDim) {
      if (previewWidth > previewHeight) {
        previewHeight = Math.round((previewHeight * maxPreviewDim) / previewWidth);
        previewWidth = maxPreviewDim;
      } else {
        previewWidth = Math.round((previewWidth * maxPreviewDim) / previewHeight);
        previewHeight = maxPreviewDim;
      }
    }

    canvas.width = previewWidth;
    canvas.height = previewHeight;

    // Draw original image on a temporary canvas to extract pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = previewWidth;
    tempCanvas.height = previewHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(image, 0, 0, previewWidth, previewHeight);
    const imgData = tempCtx.getImageData(0, 0, previewWidth, previewHeight);
    const pixels = imgData.data;

    // Clear output canvas
    ctx.clearRect(0, 0, previewWidth, previewHeight);
    if (config.backgroundType === 'white') {
      ctx.fillStyle = config.dtfFabricColor;
      ctx.fillRect(0, 0, previewWidth, previewHeight);
    }

    // Dynamic dot spacing based on Line-Per-Inch frequency (LPI)
    const dotSize = Math.max(2.5, (previewWidth / (config.dtfLpi || 55)));

    // Helper to sample pixel color from the grid coordinate (with HD Bilinear interpolation for smooth gradient dots)
    const getPixelSample = (x: number, y: number) => {
      if (!config.dtfHdAntialiasing) {
        // Nearest-neighbor fallback
        const px = Math.max(0, Math.min(previewWidth - 1, Math.round(x)));
        const py = Math.max(0, Math.min(previewHeight - 1, Math.round(y)));
        const idx = (py * previewWidth + px) * 4;
        return {
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2],
          a: pixels[idx + 3]
        };
      }

      // Bilinear interpolation
      const x1 = Math.floor(x);
      const y1 = Math.floor(y);
      const x2 = Math.min(previewWidth - 1, x1 + 1);
      const y2 = Math.min(previewHeight - 1, y1 + 1);

      const tx = x - x1;
      const ty = y - y1;

      const getIdx = (px: number, py: number) => (py * previewWidth + px) * 4;

      const idx11 = getIdx(x1, y1);
      const idx21 = getIdx(x2, y1);
      const idx12 = getIdx(x1, y2);
      const idx22 = getIdx(x2, y2);

      const r = (1 - tx) * (1 - ty) * pixels[idx11] +
                tx * (1 - ty) * pixels[idx21] +
                (1 - tx) * ty * pixels[idx12] +
                tx * ty * pixels[idx22];

      const g = (1 - tx) * (1 - ty) * pixels[idx11 + 1] +
                tx * (1 - ty) * pixels[idx21 + 1] +
                (1 - tx) * ty * pixels[idx12 + 1] +
                tx * ty * pixels[idx22 + 1];

      const b = (1 - tx) * (1 - ty) * pixels[idx11 + 2] +
                tx * (1 - ty) * pixels[idx21 + 2] +
                (1 - tx) * ty * pixels[idx12 + 2] +
                tx * ty * pixels[idx22 + 2];

      const a = (1 - tx) * (1 - ty) * pixels[idx11 + 3] +
                tx * (1 - ty) * pixels[idx21 + 3] +
                (1 - tx) * ty * pixels[idx12 + 3] +
                tx * ty * pixels[idx22 + 3];

      return { r, g, b, a };
    };

    const w = previewWidth;
    const h = previewHeight;
    const outputImgData = ctx.createImageData(w, h);
    const outData = outputImgData.data;

    const angleRad = (config.angle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    // Convert print width in cm to inches
    const widthInInches = (config.dtfPrintWidthCm || 38) / 2.54;
    // Total physical halftone lines across the entire print width
    const totalLines = (config.dtfLpi || 55) * widthInInches;

    // Grid step size in pixels for the current preview canvas width
    const calculatedStep = w / totalLines;
    
    // For standard fit view, if the step is too small (< 3.5), the browser sub-pixel rendering 
    // turns the grid into pure blurry solid blocks. We cap at 3.5 so dots are visible on scaled previews.
    // For "Real 1:1" mode, we let step go down to 1.5 pixels for hyper-realistic and fine inspection.
    const minStep = previewZoom === 'fit' ? 3.5 : 1.5;
    const step = Math.max(minStep, calculatedStep);
    const maxRadius = (step / 2) * 1.15;

    const selThreshold = config.dtfSelectiveThreshold !== undefined ? config.dtfSelectiveThreshold : 60;

    const hexToRgbLocal = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 255, b: 255 };
    };

    const dotColorRGB = hexToRgbLocal(config.dotColor || '#ffffff');
    const fabricColorRGB = hexToRgbLocal(config.dtfFabricColor || '#000000');

    // 1. First, build a clean color buffer and a threshold luma buffer
    const adjColorBuffer = new Uint8ClampedArray(w * h * 4);
    const adjLumaBuffer = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const rVal = pixels[idx];
      const gVal = pixels[idx+1];
      const bVal = pixels[idx+2];
      const aVal = pixels[idx+3];

      // Clean color (No Black/White levels crushing on RGB channels)
      const adjColor = adjustPixel(
        rVal, 
        gVal, 
        bVal, 
        config.brightness, 
        config.contrast, 
        config.dtfGamma, 
        0, // blackPoint = 0
        100, // whitePoint = 100
        config.dtfHighlightBoost
      );
      
      // Threshold level-crushed color (With Black/White levels)
      const adjLuma = adjustPixel(
        rVal, 
        gVal, 
        bVal, 
        config.brightness, 
        config.contrast, 
        config.dtfGamma, 
        config.dtfBlackPoint, 
        config.dtfWhitePoint, 
        config.dtfHighlightBoost
      );
      
      adjColorBuffer[idx] = adjColor.r;
      adjColorBuffer[idx+1] = adjColor.g;
      adjColorBuffer[idx+2] = adjColor.b;
      adjColorBuffer[idx+3] = aVal;

      adjLumaBuffer[idx] = adjLuma.r;
      adjLumaBuffer[idx+1] = adjLuma.g;
      adjLumaBuffer[idx+2] = adjLuma.b;
      adjLumaBuffer[idx+3] = aVal;
    }

    if (config.dtfMethod === 'diffusion') {
      // Initialize error buffer for Floyd-Steinberg
      const tempBuffer = new Float32Array(w * h * 4);
      for (let i = 0; i < w * h * 4; i++) {
        tempBuffer[i] = adjLumaBuffer[i];
      }

      // Floyd-Steinberg dither
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const rVal = tempBuffer[idx];
          const gVal = tempBuffer[idx+1];
          const bVal = tempBuffer[idx+2];
          const aVal = tempBuffer[idx+3];

          if (aVal < 30) {
            outData[idx+3] = 0;
            continue;
          }

          // Compute luma
          const luma = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
          const lumaPercent = (luma / 255) * 100;

          // If in light/midtone area, keep original continuous color!
          if (lumaPercent >= selThreshold) {
            outData[idx] = adjColorBuffer[idx];
            outData[idx+1] = adjColorBuffer[idx+1];
            outData[idx+2] = adjColorBuffer[idx+2];
            outData[idx+3] = 255; // ALWAYS force solid for printed area
            continue;
          }

          // Otherwise, dither the shadow range
          const oldVal = luma;
          let newVal = 0;
          if (config.invert) {
            newVal = oldVal > 127 ? 255 : 0;
          } else {
            newVal = oldVal > 127 ? 0 : 255;
          }

          const err = oldVal - (config.invert ? newVal : (255 - newVal));

          if (newVal > 127) {
            // Ink dot
            if (config.colorMode === 'monochrome') {
              outData[idx] = dotColorRGB.r;
              outData[idx+1] = dotColorRGB.g;
              outData[idx+2] = dotColorRGB.b;
              outData[idx+3] = 255; // ALWAYS force solid for printed area
            } else {
              outData[idx] = adjColorBuffer[idx];
              outData[idx+1] = adjColorBuffer[idx+1];
              outData[idx+2] = adjColorBuffer[idx+2];
              outData[idx+3] = 255; // ALWAYS force solid for printed area
            }
          } else {
            // Gap (transparent or fabric color)
            if (config.backgroundType === 'white') {
              outData[idx] = fabricColorRGB.r;
              outData[idx+1] = fabricColorRGB.g;
              outData[idx+2] = fabricColorRGB.b;
              outData[idx+3] = 255;
            } else {
              outData[idx] = 0;
              outData[idx+1] = 0;
              outData[idx+2] = 0;
              outData[idx+3] = 0;
            }
          }

          const distributeError = (nx: number, ny: number, factor: number) => {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = (ny * w + nx) * 4;
              tempBuffer[nidx] += err * factor;
              tempBuffer[nidx+1] += err * factor;
              tempBuffer[nidx+2] += err * factor;
            }
          };

          distributeError(x + 1, y, 7 / 16);
          distributeError(x - 1, y + 1, 3 / 16);
          distributeError(x, y + 1, 5 / 16);
          distributeError(x + 1, y + 1, 1 / 16);
        }
      }

      // Enforce strict binary alpha (either 0 or 255) to prevent any semi-transparencias for DTF printing compatibility
      for (let i = 0; i < outData.length; i += 4) {
        if (config.backgroundType === 'white') {
          outData[i+3] = 255;
        } else {
          if (outData[i+3] >= 128) {
            outData[i+3] = 255;
          } else {
            outData[i] = 0;
            outData[i+1] = 0;
            outData[i+2] = 0;
            outData[i+3] = 0;
          }
        }
      }

      ctx.putImageData(outputImgData, 0, 0);
      setIsProcessing(false);
      return;
    }

    // 2. Halftone Screen unified pixel-by-pixel loop with sub-grid continuous sampling & smooth transition
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const rVal = adjColorBuffer[idx];
        const gVal = adjColorBuffer[idx+1];
        const bVal = adjColorBuffer[idx+2];
        const aVal = adjColorBuffer[idx+3];

        if (aVal < 30) {
          outData[idx+3] = 0;
          continue;
        }

        // Compute luma (0-255) from level-adjusted luma buffer
        const lumaR = adjLumaBuffer[idx];
        const lumaG = adjLumaBuffer[idx+1];
        const lumaB = adjLumaBuffer[idx+2];
        const luma = 0.299 * lumaR + 0.587 * lumaG + 0.114 * lumaB;
        const lumaPercent = (luma / 255) * 100;

        // Knockout black checking (if enabled)
        if (config.dtfKnockoutBlack && config.dtfMethod !== 'color_halftone') {
          const thresholdLimit = (config.dtfKnockoutThreshold / 100) * 255;
          if (luma < thresholdLimit) {
            // Draw transparent gap or fabric color
            if (config.backgroundType === 'white') {
              outData[idx] = fabricColorRGB.r;
              outData[idx+1] = fabricColorRGB.g;
              outData[idx+2] = fabricColorRGB.b;
              outData[idx+3] = 255;
            } else {
              outData[idx] = 0;
              outData[idx+1] = 0;
              outData[idx+2] = 0;
              outData[idx+3] = 0;
            }
            continue;
          }
        }

        // Check if we are above the selective threshold limit (which means solid/no halftone)
        const maxVal = config.dtfSelectiveThreshold !== undefined ? config.dtfSelectiveThreshold : 60;
        
        // CMYK plate separation logic if selected
        let densityPercent = lumaPercent;
        if (config.dtfMethod === 'color_halftone') {
          const elimColorHex = config.dtfEliminateColor || '#ffffff';
          const elimRGB = hexToRgbLocal(elimColorHex);
          const rDiff = rVal - elimRGB.r;
          const gDiff = gVal - elimRGB.g;
          const bDiff = bVal - elimRGB.b;
          const dist = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
          densityPercent = (dist / 441.673) * 100;
        }

        let finalR = rVal;
        let finalG = gVal;
        let finalB = bVal;

        if (config.colorMode === 'cmyk') {
          const rNorm = rVal / 255;
          const gNorm = gVal / 255;
          const bNorm = bVal / 255;
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          const c = k === 1 ? 0 : (1 - rNorm - k) / (1 - k);
          const m = k === 1 ? 0 : (1 - gNorm - k) / (1 - k);
          const y_c = k === 1 ? 0 : (1 - bNorm - k) / (1 - k);

          if (config.activePlate === 'cyan') {
            densityPercent = (1 - c) * 100; // Cyan plate density
            finalR = 0; finalG = 255; finalB = 255;
          } else if (config.activePlate === 'magenta') {
            densityPercent = (1 - m) * 100; // Magenta plate density
            finalR = 255; finalG = 0; finalB = 255;
          } else if (config.activePlate === 'yellow') {
            densityPercent = (1 - y_c) * 100; // Yellow plate density
            finalR = 255; finalG = 255; finalB = 0;
          } else if (config.activePlate === 'black') {
            densityPercent = (1 - k) * 100; // Black plate density
            finalR = 0; finalG = 0; finalB = 0;
          }
        }

        if (config.dtfMethod !== 'color_halftone') {
          if (config.invert) {
            if (densityPercent >= maxVal) {
              outData[idx] = finalR;
              outData[idx+1] = finalG;
              outData[idx+2] = finalB;
              outData[idx+3] = aVal;
              continue;
            }
          } else {
            if (densityPercent >= maxVal) {
              if (config.backgroundType === 'white') {
                outData[idx] = fabricColorRGB.r;
                outData[idx+1] = fabricColorRGB.g;
                outData[idx+2] = fabricColorRGB.b;
                outData[idx+3] = 255;
              } else {
                outData[idx] = 0;
                outData[idx+1] = 0;
                outData[idx+2] = 0;
                outData[idx+3] = 0;
              }
              continue;
            }
          }
        }

        // Calculate continuous smooth transition radiusFactor based on selective threshold
        let radiusFactor = 0;
        if (config.dtfMethod === 'color_halftone') {
          radiusFactor = densityPercent / 100;
        } else {
          if (config.invert) {
            radiusFactor = densityPercent / maxVal;
          } else {
            radiusFactor = (maxVal - densityPercent) / maxVal;
          }
        }

        if (config.dtfDotGainCompensation !== 0) {
          radiusFactor = radiusFactor * (1 + config.dtfDotGainCompensation / 100);
        }
        radiusFactor = Math.max(0, Math.min(1, radiusFactor));

        // Filter out tiny dots under the minimum dot size threshold to prevent unprintable pixels
        const minDotLimit = (config.dtfMinDotSize || 0) / 100;
        if (config.dtfMethod === 'color_halftone') {
          // Keep a minimum dot size everywhere rather than cutting off to 0 (transparency)
          if (radiusFactor < minDotLimit) {
            radiusFactor = minDotLimit;
          }
        } else {
          if (radiusFactor < minDotLimit) {
            radiusFactor = 0;
          }
        }

        // Coordinate rotated grid offsets
        const u = x * cosA + y * sinA;
        const v = -x * sinA + y * cosA;

        const uCell = Math.round(u / step) * step;
        const vCell = Math.round(v / step) * step;

        const du = u - uCell;
        const dv = v - vCell;

        // Threshold distance T normalized to 0-1 (inside cell)
        let T = 0;
        const halfStep = step / 2;
        if (config.shape === 'circle') {
          T = Math.sqrt(du*du + dv*dv) / halfStep;
        } else if (config.shape === 'square') {
          T = Math.max(Math.abs(du), Math.abs(dv)) / halfStep;
        } else if (config.shape === 'ellipse') {
          const rotDu = du * cosA + dv * sinA;
          const rotDv = -du * sinA + dv * cosA;
          T = Math.sqrt((rotDu / 1.4)**2 + (rotDv / 0.7)**2) / halfStep;
        } else if (config.shape === 'line') {
          const rotDu = du * cosA + dv * sinA;
          T = Math.abs(rotDu) / halfStep;
        }

        // Antialiased coverage value
        let coverage = 0;
        if (config.dtfHdAntialiasing) {
          const epsilon = Math.max(0.02, 1.5 / step);
          const x_edge = (radiusFactor - T) / epsilon + 0.5;
          coverage = Math.max(0, Math.min(1, x_edge));
        } else {
          coverage = T <= radiusFactor ? 1.0 : 0.0;
        }

        // Select ink color
        let inkR = finalR;
        let inkG = finalG;
        let inkB = finalB;
        let inkA = aVal;

        if (config.colorMode === 'monochrome') {
          inkR = dotColorRGB.r;
          inkG = dotColorRGB.g;
          inkB = dotColorRGB.b;
        }

        // Render based on background type and coverage
        if (config.backgroundType === 'white') {
          outData[idx] = Math.round(inkR * coverage + fabricColorRGB.r * (1 - coverage));
          outData[idx+1] = Math.round(inkG * coverage + fabricColorRGB.g * (1 - coverage));
          outData[idx+2] = Math.round(inkB * coverage + fabricColorRGB.b * (1 - coverage));
          outData[idx+3] = Math.round(inkA * coverage + 255 * (1 - coverage));
        } else {
          outData[idx] = inkR;
          outData[idx+1] = inkG;
          outData[idx+2] = inkB;
          outData[idx+3] = Math.round(inkA * coverage);
        }
      }
    }

    // Enforce strict binary alpha (either 0 or 255) to prevent any semi-transparencies for DTF printing compatibility
    for (let i = 0; i < outData.length; i += 4) {
      if (config.backgroundType === 'white') {
        outData[i+3] = 255;
      } else {
        if (outData[i+3] >= 128) {
          outData[i+3] = 255;
        } else {
          outData[i] = 0;
          outData[i+1] = 0;
          outData[i+2] = 0;
          outData[i+3] = 0;
        }
      }
    }

    ctx.putImageData(outputImgData, 0, 0);
    setIsProcessing(false);
  };

  // Re-run the canvas renderer whenever config, image, or preview zoom changes
  useEffect(() => {
    if (image) {
      const timer = setTimeout(() => {
        renderHalftone();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [image, config, previewZoom]);

  // Load a preset configuration
  const loadPreset = (presetType: 'dtf_suave' | 'dtf_cmyk_pro' | 'subli_high_def' | 'silk_screen') => {
    if (presetType === 'dtf_suave') {
      setConfig({
        dotSize: 7,
        angle: 45,
        contrast: 25,
        brightness: 5,
        shape: 'circle',
        colorMode: 'monochrome',
        activePlate: 'all',
        invert: true,
        backgroundType: 'white',
        dotColor: '#ffffff',
        dtfKnockoutBlack: true,
        dtfKnockoutThreshold: 20,
        dtfFabricColor: '#000000',
        dtfDotGainCompensation: -15, // Optimal reduction to combat physical DTF gain
        dtfHighlightBoost: 35, // Strong boost to protect soft highlights
        dtfGamma: 1.3, // Soft gamma lift
        dtfHdAntialiasing: true,
        dtfLpi: 55, // 55 LPI for standard high-tactile print
        dtfExportDpi: 300,
      });
    } else if (presetType === 'dtf_cmyk_pro') {
      setConfig({
        dotSize: 6,
        angle: 22.5,
        contrast: 15,
        brightness: 0,
        shape: 'circle',
        colorMode: 'cmyk',
        activePlate: 'all',
        invert: false,
        backgroundType: 'white',
        dotColor: '#000000',
        dtfKnockoutBlack: true,
        dtfKnockoutThreshold: 15,
        dtfFabricColor: '#1e293b',
        dtfDotGainCompensation: -10,
        dtfHighlightBoost: 25,
        dtfGamma: 1.2,
        dtfHdAntialiasing: true,
        dtfLpi: 60, // Fine CMYK separations at 60 LPI
        dtfExportDpi: 300,
      });
    } else if (presetType === 'subli_high_def') {
      setConfig({
        dotSize: 5,
        angle: 45,
        contrast: 10,
        brightness: 0,
        shape: 'circle',
        colorMode: 'monochrome',
        activePlate: 'all',
        invert: false,
        backgroundType: 'white',
        dotColor: '#000000',
        dtfKnockoutBlack: false,
        dtfKnockoutThreshold: 10,
        dtfFabricColor: '#ffffff',
        dtfDotGainCompensation: 0, // No dot gain compensation needed for direct sublimation papers
        dtfHighlightBoost: 15,
        dtfGamma: 1.05,
        dtfHdAntialiasing: true,
        dtfLpi: 75, // Ultra-fine 75 LPI for direct sublimation
        dtfExportDpi: 300,
      });
    } else if (presetType === 'silk_screen') {
      setConfig({
        dotSize: 9,
        angle: 45,
        contrast: 30,
        brightness: 5,
        shape: 'ellipse',
        colorMode: 'monochrome',
        activePlate: 'all',
        invert: false,
        backgroundType: 'white',
        dotColor: '#000000',
        dtfKnockoutBlack: false,
        dtfKnockoutThreshold: 10,
        dtfFabricColor: '#ffffff',
        dtfDotGainCompensation: -5,
        dtfHighlightBoost: 40, // Heavy highlight protection
        dtfGamma: 1.4, // Open up midtones heavily for screens
        dtfHdAntialiasing: true,
        dtfLpi: 45, // Coarser 45 LPI for easy screen squeegee printing
        dtfExportDpi: 300,
      });
    }
  };

  // Export high-resolution transparent film PNG
  const downloadFilm = () => {
    if (!image) return;

    // Use full image dimensions for crystal-clear film export, upscaled based on the target DPI
    let dpiScale = 1.0;
    if (config.dtfExportDpi === 300) {
      dpiScale = 2.5; // Upscale 2.5x to map to ~300 DPI high-definition grid
    } else if (config.dtfExportDpi === 600) {
      dpiScale = 5.0; // Upscale 5.0x for microscopic ultra-crisp 600 DPI dots
    } else if (config.dtfExportDpi === 150) {
      dpiScale = 1.25; // 1.25x for medium resolution
    }

    const outputWidth = Math.round(image.width * dpiScale);
    const outputHeight = Math.round(image.height * dpiScale);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outputWidth;
    exportCanvas.height = outputHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Load original image pixels inside standard canvas to perform mapped sampling
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(image, 0, 0, image.width, image.height);
    const imgData = tempCtx.getImageData(0, 0, image.width, image.height);
    const pixels = imgData.data;

    const origWidth = image.width;
    const origHeight = image.height;

    // Transparent background is vital for professional RIP and film printing
    ctx.clearRect(0, 0, outputWidth, outputHeight);

    // Calculate high-resolution dot size based on the physical LPI frequency relative to the output width
    const dotSize = Math.max(3, (outputWidth / (config.dtfLpi || 55)));

    // Helper to sample pixel color from the high-res coordinate mapped back to original image space (with Bilinear interpolation)
    const getPixelSample = (x: number, y: number) => {
      // Map high-res coordinate space back to original image space
      const origX = (x / outputWidth) * origWidth;
      const origY = (y / outputHeight) * origHeight;

      if (!config.dtfHdAntialiasing) {
        const px = Math.max(0, Math.min(origWidth - 1, Math.round(origX)));
        const py = Math.max(0, Math.min(origHeight - 1, Math.round(origY)));
        const idx = (py * origWidth + px) * 4;
        return {
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2],
          a: pixels[idx + 3]
        };
      }

      // Bilinear interpolation for smooth anti-aliased point generation mapped from original space
      const x1 = Math.floor(origX);
      const y1 = Math.floor(origY);
      const x2 = Math.min(origWidth - 1, x1 + 1);
      const y2 = Math.min(origHeight - 1, y1 + 1);

      const tx = origX - x1;
      const ty = origY - y1;

      const getIdx = (px: number, py: number) => (py * origWidth + px) * 4;

      const idx11 = getIdx(x1, y1);
      const idx21 = getIdx(x2, y1);
      const idx12 = getIdx(x1, y2);
      const idx22 = getIdx(x2, y2);

      const r = (1 - tx) * (1 - ty) * pixels[idx11] +
                tx * (1 - ty) * pixels[idx21] +
                (1 - tx) * ty * pixels[idx12] +
                tx * ty * pixels[idx22];

      const g = (1 - tx) * (1 - ty) * pixels[idx11 + 1] +
                tx * (1 - ty) * pixels[idx21 + 1] +
                (1 - tx) * ty * pixels[idx12 + 1] +
                tx * ty * pixels[idx22 + 1];

      const b = (1 - tx) * (1 - ty) * pixels[idx11 + 2] +
                tx * (1 - ty) * pixels[idx21 + 2] +
                (1 - tx) * ty * pixels[idx12 + 2] +
                tx * ty * pixels[idx22 + 2];

      const a = (1 - tx) * (1 - ty) * pixels[idx11 + 3] +
                tx * (1 - ty) * pixels[idx21 + 3] +
                (1 - tx) * ty * pixels[idx12 + 3] +
                tx * ty * pixels[idx22 + 3];

      return { r, g, b, a };
    };

    const w = outputWidth;
    const h = outputHeight;
    const exportImgData = ctx.createImageData(w, h);
    const outData = exportImgData.data;

    const angleRad = (config.angle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    // Convert print width in cm to inches
    const widthInInches = (config.dtfPrintWidthCm || 38) / 2.54;
    // Total physical halftone lines across the entire print width
    const totalLines = (config.dtfLpi || 55) * widthInInches;

    // Physical halftone grid step size in pixels for the export resolution
    const step = Math.max(1.5, w / totalLines);
    const maxRadius = (step / 2) * 1.15;

    const selThreshold = config.dtfSelectiveThreshold !== undefined ? config.dtfSelectiveThreshold : 60;

    const hexToRgbLocal = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 255, b: 255 };
    };

    const dotColorRGB = hexToRgbLocal(config.dotColor || '#ffffff');

    if (config.dtfMethod === 'diffusion') {
      const adjColorBuffer = new Uint8ClampedArray(w * h * 4);
      const tempBuffer = new Float32Array(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const { r: rVal, g: gVal, b: bVal, a: aVal } = getPixelSample(x, y);
          const adjColor = adjustPixel(
            rVal, 
            gVal, 
            bVal, 
            config.brightness, 
            config.contrast, 
            config.dtfGamma, 
            0, // blackPoint = 0
            100, // whitePoint = 100
            config.dtfHighlightBoost
          );
          const adjLuma = adjustPixel(
            rVal, 
            gVal, 
            bVal, 
            config.brightness, 
            config.contrast, 
            config.dtfGamma, 
            config.dtfBlackPoint, 
            config.dtfWhitePoint, 
            config.dtfHighlightBoost
          );
          adjColorBuffer[idx] = adjColor.r;
          adjColorBuffer[idx+1] = adjColor.g;
          adjColorBuffer[idx+2] = adjColor.b;
          adjColorBuffer[idx+3] = aVal;

          tempBuffer[idx] = adjLuma.r;
          tempBuffer[idx+1] = adjLuma.g;
          tempBuffer[idx+2] = adjLuma.b;
          tempBuffer[idx+3] = aVal;
        }
      }

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const rVal = tempBuffer[idx];
          const gVal = tempBuffer[idx+1];
          const bVal = tempBuffer[idx+2];
          const aVal = tempBuffer[idx+3];

          if (aVal < 30) {
            outData[idx+3] = 0;
            continue;
          }

          const luma = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
          const lumaPercent = (luma / 255) * 100;

          if (lumaPercent >= selThreshold) {
            outData[idx] = adjColorBuffer[idx];
            outData[idx+1] = adjColorBuffer[idx+1];
            outData[idx+2] = adjColorBuffer[idx+2];
            outData[idx+3] = aVal;
            continue;
          }

          const oldVal = luma;
          let newVal = 0;
          if (config.invert) {
            newVal = oldVal > 127 ? 255 : 0;
          } else {
            newVal = oldVal > 127 ? 0 : 255;
          }

          const err = oldVal - (config.invert ? newVal : (255 - newVal));

          if (newVal > 127) {
            if (config.colorMode === 'monochrome') {
              outData[idx] = dotColorRGB.r;
              outData[idx+1] = dotColorRGB.g;
              outData[idx+2] = dotColorRGB.b;
              outData[idx+3] = aVal;
            } else {
              outData[idx] = adjColorBuffer[idx];
              outData[idx+1] = adjColorBuffer[idx+1];
              outData[idx+2] = adjColorBuffer[idx+2];
              outData[idx+3] = aVal;
            }
          } else {
            outData[idx] = 0;
            outData[idx+1] = 0;
            outData[idx+2] = 0;
            outData[idx+3] = 0;
          }

          const distributeError = (nx: number, ny: number, factor: number) => {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nidx = (ny * w + nx) * 4;
              tempBuffer[nidx] += err * factor;
              tempBuffer[nidx+1] += err * factor;
              tempBuffer[nidx+2] += err * factor;
            }
          };

          distributeError(x + 1, y, 7 / 16);
          distributeError(x - 1, y + 1, 3 / 16);
          distributeError(x, y + 1, 5 / 16);
          distributeError(x + 1, y + 1, 1 / 16);
        }
      }

      // Enforce strict binary alpha (either 0 or 255) to prevent any semi-transparencias for DTF printing compatibility
      for (let i = 0; i < outData.length; i += 4) {
        if (outData[i+3] >= 128) {
          outData[i+3] = 255;
        } else {
          outData[i] = 0;
          outData[i+1] = 0;
          outData[i+2] = 0;
          outData[i+3] = 0;
        }
      }

      ctx.putImageData(exportImgData, 0, 0);

      const link = document.createElement('a');
      link.download = `dtf_prep_film_${config.colorMode}_${config.dtfExportDpi}dpi.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
      setIsProcessing(false);
      return;
    }

    // Pre-cache all adjusted values at high resolution
    const adjColorBuffer = new Uint8ClampedArray(w * h * 4);
    const adjLumaBuffer = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const { r: rVal, g: gVal, b: bVal, a: aVal } = getPixelSample(x, y);
        const adjColor = adjustPixel(
          rVal, 
          gVal, 
          bVal, 
          config.brightness, 
          config.contrast, 
          config.dtfGamma, 
          0, // blackPoint = 0
          100, // whitePoint = 100
          config.dtfHighlightBoost
        );
        const adjLuma = adjustPixel(
          rVal, 
          gVal, 
          bVal, 
          config.brightness, 
          config.contrast, 
          config.dtfGamma, 
          config.dtfBlackPoint, 
          config.dtfWhitePoint, 
          config.dtfHighlightBoost
        );
        adjColorBuffer[idx] = adjColor.r;
        adjColorBuffer[idx+1] = adjColor.g;
        adjColorBuffer[idx+2] = adjColor.b;
        adjColorBuffer[idx+3] = aVal;

        adjLumaBuffer[idx] = adjLuma.r;
        adjLumaBuffer[idx+1] = adjLuma.g;
        adjLumaBuffer[idx+2] = adjLuma.b;
        adjLumaBuffer[idx+3] = aVal;
      }
    }

    // 2. High-res Halftone Screen export loop with sub-grid continuous sampling & smooth transition
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const rVal = adjColorBuffer[idx];
        const gVal = adjColorBuffer[idx+1];
        const bVal = adjColorBuffer[idx+2];
        const aVal = adjColorBuffer[idx+3];

        if (aVal < 30) {
          outData[idx+3] = 0;
          continue;
        }

        // Compute luma (0-255) from level-adjusted luma buffer
        const lumaR = adjLumaBuffer[idx];
        const lumaG = adjLumaBuffer[idx+1];
        const lumaB = adjLumaBuffer[idx+2];
        const luma = 0.299 * lumaR + 0.587 * lumaG + 0.114 * lumaB;
        const lumaPercent = (luma / 255) * 100;

        // Knockout black checking (if enabled)
        if (config.dtfKnockoutBlack && config.dtfMethod !== 'color_halftone') {
          const thresholdLimit = (config.dtfKnockoutThreshold / 100) * 255;
          if (luma < thresholdLimit) {
            outData[idx] = 0;
            outData[idx+1] = 0;
            outData[idx+2] = 0;
            outData[idx+3] = 0;
            continue;
          }
        }

        // Check if we are above the selective threshold limit (which means solid/no halftone)
        const maxVal = config.dtfSelectiveThreshold !== undefined ? config.dtfSelectiveThreshold : 60;
        
        // CMYK plate separation logic if selected
        let densityPercent = lumaPercent;
        if (config.dtfMethod === 'color_halftone') {
          const elimColorHex = config.dtfEliminateColor || '#ffffff';
          const elimRGB = hexToRgbLocal(elimColorHex);
          const rDiff = rVal - elimRGB.r;
          const gDiff = gVal - elimRGB.g;
          const bDiff = bVal - elimRGB.b;
          const dist = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
          densityPercent = (dist / 441.673) * 100;
        }

        let finalR = rVal;
        let finalG = gVal;
        let finalB = bVal;

        if (config.colorMode === 'cmyk') {
          const rNorm = rVal / 255;
          const gNorm = gVal / 255;
          const bNorm = bVal / 255;
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          const c = k === 1 ? 0 : (1 - rNorm - k) / (1 - k);
          const m = k === 1 ? 0 : (1 - gNorm - k) / (1 - k);
          const y_c = k === 1 ? 0 : (1 - bNorm - k) / (1 - k);

          if (config.activePlate === 'cyan') {
            densityPercent = (1 - c) * 100; // Cyan plate density
            finalR = 0; finalG = 255; finalB = 255;
          } else if (config.activePlate === 'magenta') {
            densityPercent = (1 - m) * 100; // Magenta plate density
            finalR = 255; finalG = 0; finalB = 255;
          } else if (config.activePlate === 'yellow') {
            densityPercent = (1 - y_c) * 100; // Yellow plate density
            finalR = 255; finalG = 255; finalB = 0;
          } else if (config.activePlate === 'black') {
            densityPercent = (1 - k) * 100; // Black plate density
            finalR = 0; finalG = 0; finalB = 0;
          }
        }

        if (config.dtfMethod !== 'color_halftone') {
          if (config.invert) {
            if (densityPercent >= maxVal) {
              outData[idx] = finalR;
              outData[idx+1] = finalG;
              outData[idx+2] = finalB;
              outData[idx+3] = aVal;
              continue;
            }
          } else {
            if (densityPercent >= maxVal) {
              outData[idx] = 0;
              outData[idx+1] = 0;
              outData[idx+2] = 0;
              outData[idx+3] = 0;
              continue;
            }
          }
        }

        // Calculate continuous smooth transition radiusFactor based on selective threshold
        let radiusFactor = 0;
        if (config.dtfMethod === 'color_halftone') {
          radiusFactor = densityPercent / 100;
        } else {
          if (config.invert) {
            radiusFactor = densityPercent / maxVal;
          } else {
            radiusFactor = (maxVal - densityPercent) / maxVal;
          }
        }

        if (config.dtfDotGainCompensation !== 0) {
          radiusFactor = radiusFactor * (1 + config.dtfDotGainCompensation / 100);
        }
        radiusFactor = Math.max(0, Math.min(1, radiusFactor));

        // Filter out tiny dots under the minimum dot size threshold to prevent unprintable pixels
        const minDotLimit = (config.dtfMinDotSize || 0) / 100;
        if (config.dtfMethod === 'color_halftone') {
          // Keep a minimum dot size everywhere rather than cutting off to 0 (transparency)
          if (radiusFactor < minDotLimit) {
            radiusFactor = minDotLimit;
          }
        } else {
          if (radiusFactor < minDotLimit) {
            radiusFactor = 0;
          }
        }

        // Coordinate rotated grid offsets
        const u = x * cosA + y * sinA;
        const v = -x * sinA + y * cosA;

        const uCell = Math.round(u / step) * step;
        const vCell = Math.round(v / step) * step;

        const du = u - uCell;
        const dv = v - vCell;

        // Threshold distance T normalized to 0-1 (inside cell)
        let T = 0;
        const halfStep = step / 2;
        if (config.shape === 'circle') {
          T = Math.sqrt(du*du + dv*dv) / halfStep;
        } else if (config.shape === 'square') {
          T = Math.max(Math.abs(du), Math.abs(dv)) / halfStep;
        } else if (config.shape === 'ellipse') {
          const rotDu = du * cosA + dv * sinA;
          const rotDv = -du * sinA + dv * cosA;
          T = Math.sqrt((rotDu / 1.4)**2 + (rotDv / 0.7)**2) / halfStep;
        } else if (config.shape === 'line') {
          const rotDu = du * cosA + dv * sinA;
          T = Math.abs(rotDu) / halfStep;
        }

        // Antialiased coverage value
        let coverage = 0;
        if (config.dtfHdAntialiasing) {
          const epsilon = Math.max(0.02, 1.5 / step);
          const x_edge = (radiusFactor - T) / epsilon + 0.5;
          coverage = Math.max(0, Math.min(1, x_edge));
        } else {
          coverage = T <= radiusFactor ? 1.0 : 0.0;
        }

        // Select ink color
        let inkR = finalR;
        let inkG = finalG;
        let inkB = finalB;
        let inkA = aVal;

        if (config.colorMode === 'monochrome') {
          inkR = dotColorRGB.r;
          inkG = dotColorRGB.g;
          inkB = dotColorRGB.b;
        }

        // Render based on coverage (always transparent background on high-res export for RIP compatibility)
        outData[idx] = inkR;
        outData[idx+1] = inkG;
        outData[idx+2] = inkB;
        outData[idx+3] = Math.round(inkA * coverage);
      }
    }

    // Enforce strict binary alpha (either 0 or 255) to prevent any semi-transparencias for DTF printing compatibility
    for (let i = 0; i < outData.length; i += 4) {
      if (outData[i+3] >= 128) {
        outData[i+3] = 255;
      } else {
        outData[i] = 0;
        outData[i+1] = 0;
        outData[i+2] = 0;
        outData[i+3] = 0;
      }
    }

    ctx.putImageData(exportImgData, 0, 0);

    // Trigger download
    const link = document.createElement('a');
    link.download = `dtf_preprensa_film_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div id="dtf-prepress-workspace" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Workspace de Preprensa Digital DTF 
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-wide">
              Optimizado para Prendas Oscuras
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ajusta canales de luma, simula tramas de semitono perfectas (Moire 45°) y suprime negros para estampas ultra suaves y flexibles.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadPreset('dtf_suave')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> DTF Tacto Suave
          </button>
          <button
            onClick={() => loadPreset('dtf_cmyk_pro')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 border border-violet-150 hover:bg-violet-100 transition-colors cursor-pointer"
          >
            DTF CMYK Pro
          </button>
          <button
            onClick={() => loadPreset('subli_high_def')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Sublimación Alta Def
          </button>
          <button
            onClick={() => loadPreset('silk_screen')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Serigrafía Rápida (45°)
          </button>
        </div>
      </div>

      {!image ? (
        /* Drag and Drop Zone */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragActive 
              ? 'border-violet-500 bg-violet-50/50 scale-[0.99]' 
              : 'border-slate-300 hover:border-violet-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-violet-500 animate-bounce" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Cargar Imagen para Preprensa DTF</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Arrastra tu archivo aquí o haz clic para buscar en tu dispositivo. Recomendamos imágenes de alta resolución (.png, .jpg).
          </p>
          <div className="mt-4 flex justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">✓ Conserva canales luma</span>
            <span className="flex items-center gap-1">✓ Conversión de tramas</span>
            <span className="flex items-center gap-1">✓ Transparencias PNG</span>
          </div>
        </div>
      ) : (
        /* Interactive Prepress Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls - Left (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5 bg-slate-50/70 border border-slate-150 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Panel de Control de Trama
              </h3>
              <button
                onClick={() => {
                  setImage(null);
                  setOriginalFile(null);
                }}
                className="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
              >
                Cargar otra imagen
              </button>
            </div>

            {/* 1. RECORTE Y TONO */}
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>1. Recorte y Tono</span>
                <span className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-bold uppercase">Preimpresión</span>
              </h4>

              {/* Recortar fondo negro (Checkbox) */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700">Recortar fondo negro</span>
                  <p className="text-[9.5px] text-slate-400">Elimina sombras para telas oscuras</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, dtfKnockoutBlack: !config.dtfKnockoutBlack })}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                    config.dtfKnockoutBlack ? 'bg-violet-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-sm transform ${
                      config.dtfKnockoutBlack ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Umbral recorte */}
              {config.dtfKnockoutBlack && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px] text-slate-600">
                    <span className="font-medium text-slate-700">Umbral recorte:</span>
                    <span className="font-bold text-violet-600">{config.dtfKnockoutThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.dtfKnockoutThreshold}
                    onChange={(e) => setConfig({ ...config, dtfKnockoutThreshold: parseInt(e.target.value) })}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Cuanto más alto, más agresivo es el recorte del fondo negro.
                  </p>
                </div>
              )}

              {/* Punto negro */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-medium text-slate-700">Punto negro:</span>
                  <span className="font-bold text-violet-600">{config.dtfBlackPoint !== undefined ? config.dtfBlackPoint : 25}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.dtfBlackPoint !== undefined ? config.dtfBlackPoint : 25}
                  onChange={(e) => setConfig({ ...config, dtfBlackPoint: parseInt(e.target.value) })}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Las sombras por debajo de este valor se vuelven transparentes. Súbelo para limpiar ruido.
                </p>
              </div>

              {/* Punto blanco */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-medium text-slate-700">Punto blanco:</span>
                  <span className="font-bold text-violet-600">{config.dtfWhitePoint !== undefined ? config.dtfWhitePoint : 88}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.dtfWhitePoint !== undefined ? config.dtfWhitePoint : 88}
                  onChange={(e) => setConfig({ ...config, dtfWhitePoint: parseInt(e.target.value) })}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Las luces por encima se vuelven opacas. Bájalo para aclarar el conjunto.
                </p>
              </div>

              {/* Gamma */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-medium text-slate-700">Curva Gamma (Tonos Medios):</span>
                  <span className="font-bold text-violet-600">x{config.dtfGamma || 0.7}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.05"
                  value={config.dtfGamma || 0.7}
                  onChange={(e) => setConfig({ ...config, dtfGamma: parseFloat(e.target.value) })}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Brillo de los medios tonos: menor que 1 oscurece, mayor que 1 aclara.
                </p>
              </div>

              {/* Invertir (prenda oscura) */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700">Invertir (prenda oscura)</span>
                  <p className="text-[9.5px] text-slate-400">Tinta clara sobre tejido oscuro</p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, invert: !config.invert })}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                    config.invert ? 'bg-violet-600' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white transition-transform shadow-sm transform ${
                      config.invert ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 2. TRAMA */}
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>2. Parámetros de Trama</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Geometría</span>
              </h4>

              {/* Método (Trama vs Difusión vs Trama de Color) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-700">Método de Semitono:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setConfig({ ...config, dtfMethod: 'halftone' })}
                    className={`py-1.5 px-1 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer text-center leading-tight ${
                      (config.dtfMethod || 'halftone') === 'halftone'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Trama
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, dtfMethod: 'diffusion' })}
                    className={`py-1.5 px-1 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer text-center leading-tight ${
                      config.dtfMethod === 'diffusion'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Difusión
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, dtfMethod: 'color_halftone' })}
                    className={`py-1.5 px-1 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer text-center leading-tight ${
                      config.dtfMethod === 'color_halftone'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Trama Color
                  </button>
                </div>
              </div>

              {/* Color Knockout selector for Color Halftone mode */}
              {config.dtfMethod === 'color_halftone' && (
                <div className="flex flex-col gap-2 p-3 bg-violet-50/50 border border-violet-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-violet-900">Color a Eliminar:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.dtfEliminateColor || '#ffffff'}
                        onChange={(e) => setConfig({ ...config, dtfEliminateColor: e.target.value })}
                        className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                      />
                      <span className="text-[10px] font-mono font-bold text-violet-700 uppercase">
                        {config.dtfEliminateColor || '#ffffff'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[9px] font-bold text-slate-500">Predeterminados:</span>
                    {[
                      { label: 'Blanco', value: '#ffffff' },
                      { label: 'Negro', value: '#000000' },
                      { label: 'Rojo', value: '#ff0000' },
                      { label: 'Verde', value: '#00ff00' },
                      { label: 'Azul', value: '#0000ff' },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setConfig({ ...config, dtfEliminateColor: preset.value })}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border cursor-pointer ${
                          (config.dtfEliminateColor || '#ffffff').toLowerCase() === preset.value.toLowerCase()
                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-violet-700 leading-normal">
                    Los píxeles con el color elegido se desvanecerán en puntos pequeños de semitono, manteniendo puntos mínimos legibles en toda la imagen.
                  </p>
                </div>
              )}

              {((config.dtfMethod || 'halftone') === 'halftone' || config.dtfMethod === 'color_halftone') && (
                <>
                  {/* Forma del Punto */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-700">Forma del Punto:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['circle', 'square', 'line', 'ellipse'] as const).map((sh) => (
                        <button
                          key={sh}
                          onClick={() => setConfig({ ...config, shape: sh })}
                          className={`py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer capitalize ${
                            config.shape === sh 
                              ? 'bg-violet-600 text-white border-violet-600' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {sh === 'circle' ? 'Redondo real' : sh === 'square' ? 'Cuadrado' : sh === 'line' ? 'Línea' : 'Elipse'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frecuencia (LPI) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Frecuencia LPI:</span>
                      <span className="font-bold text-violet-700">{config.dtfLpi || 100} LPI</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="120"
                      step="5"
                      value={config.dtfLpi || 100}
                      onChange={(e) => setConfig({ ...config, dtfLpi: parseInt(e.target.value) })}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Densidad de líneas físicas por pulgada. El sistema calcula los puntos de manera exacta usando el "Ancho impr." físico. 45-60 LPI es lo recomendado para tacto suave en remeras.
                    </p>
                  </div>

                  {/* Ángulo */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Ángulo °:</span>
                      <span className="font-bold text-slate-800">{config.angle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="2.5"
                      value={config.angle}
                      onChange={(e) => setConfig({ ...config, angle: parseFloat(e.target.value) })}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Giro de la rejilla de puntos. 22.5° o 45° evitan el efecto moiré.
                    </p>
                  </div>
                </>
              )}

              {/* Filtro Selectivo de Sombras (Selective Threshold) */}
              {config.dtfMethod !== 'color_halftone' && (
                <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Filtro Selectivo de Sombras:</span>
                    <span className="font-bold text-violet-700">{config.dtfSelectiveThreshold !== undefined ? config.dtfSelectiveThreshold : 60}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={config.dtfSelectiveThreshold !== undefined ? config.dtfSelectiveThreshold : 60}
                    onChange={(e) => setConfig({ ...config, dtfSelectiveThreshold: parseInt(e.target.value) })}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Controla la aplicación selectiva. Valores menores aplican semitono <strong>exclusivamente en las sombras y tonos oscuros</strong> para que el resto de la imagen mantenga su máxima resolución continua y calidad original. Al 100% aplica trama a toda la imagen.
                  </p>
                </div>
              )}

              {/* Filtro de Tamaño de Punto Mínimo */}
              <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700 text-red-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-red-500 animate-pulse" />
                    Filtro de Tamaño Mínimo de Punto:
                  </span>
                  <span className="font-bold text-red-700">{config.dtfMinDotSize || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={config.dtfMinDotSize || 0}
                  onChange={(e) => setConfig({ ...config, dtfMinDotSize: parseInt(e.target.value) })}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  {config.dtfMethod === 'color_halftone'
                    ? "Garantiza un tamaño de punto mínimo estable en toda la imagen para mantener una textura uniforme y que no se pierdan puntos en áreas de transición."
                    : "Elimina los puntos de semitono extremadamente pequeños que no logran retener polvo de poliamida o que se desprenden al lavar. Aumenta este filtro para limpiar las luces y transiciones finas."
                  }
                </p>
              </div>

              {/* Bordes (Antialiasing) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-700">Bordes:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig({ ...config, dtfHdAntialiasing: true })}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      config.dtfHdAntialiasing
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Suaves (anti-alias)
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, dtfHdAntialiasing: false })}
                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      !config.dtfHdAntialiasing
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Duros (trama binaria)
                  </button>
                </div>
              </div>

              {/* Ancho impr. cm */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Ancho impr. cm:</span>
                  <span className="font-bold text-slate-800">{config.dtfPrintWidthCm || 38} cm</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  value={config.dtfPrintWidthCm || 38}
                  onChange={(e) => setConfig({ ...config, dtfPrintWidthCm: parseInt(e.target.value) })}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <p className="text-[9px] text-slate-400 leading-normal">
                  Ancho físico al que vas a imprimir; ajusta el tamaño proporcional de trama.
                </p>
              </div>

              {/* Info Badges/Labels inside Card */}
              <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Export:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {image ? `${Math.round(image.width * (config.dtfExportDpi === 300 ? 2.5 : config.dtfExportDpi === 600 ? 5.0 : 1.25))}x${Math.round(image.height * (config.dtfExportDpi === 300 ? 2.5 : config.dtfExportDpi === 600 ? 5.0 : 1.25))} px` : '---'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Lineatura real:</span>
                  <span className="font-bold text-violet-700">{(config.dtfMethod || 'halftone') === 'halftone' || config.dtfMethod === 'color_halftone' ? `${config.dtfLpi || 100} LPI` : 'Difusión de Error'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>DPI impresión:</span>
                  <span className="font-bold text-emerald-700">{config.dtfExportDpi || 300} DPI</span>
                </div>
              </div>
            </div>

            {/* 3. MODOS DE COLOR */}
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                3. Modo de Color & Tintas
              </h4>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setConfig({ ...config, colorMode: 'monochrome' })}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    config.colorMode === 'monochrome'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Monocromo
                </button>
                <button
                  onClick={() => setConfig({ ...config, colorMode: 'cmyk' })}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    config.colorMode === 'cmyk'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  CMYK
                </button>
                <button
                  onClick={() => setConfig({ ...config, colorMode: 'rgb' })}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    config.colorMode === 'rgb'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  RGB Color
                </button>
              </div>

              {config.colorMode === 'monochrome' && (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Color de la tinta impresa:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.dotColor}
                        onChange={(e) => setConfig({ ...config, dotColor: e.target.value })}
                        className="w-5 h-5 rounded border border-slate-300 cursor-pointer"
                      />
                      <span className="font-semibold text-xs">{config.dotColor}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                    <span>Invertir Valores (Imagen):</span>
                    <button
                      onClick={() => setConfig({ ...config, invert: !config.invert })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        config.invert 
                          ? 'bg-violet-50 text-violet-700 border-violet-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {config.invert ? 'Luces en Tinta' : 'Sombras en Tinta'}
                    </button>
                  </div>
                </div>
              )}

              {config.colorMode === 'cmyk' && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[11px] text-slate-500">Visualizar Canal/Placa Separada:</span>
                  <div className="grid grid-cols-5 gap-1">
                    {(['all', 'cyan', 'magenta', 'yellow', 'black'] as const).map((plate) => (
                      <button
                        key={plate}
                        onClick={() => setConfig({ ...config, activePlate: plate })}
                        className={`py-1 rounded text-[9px] font-bold border transition-all cursor-pointer uppercase ${
                          config.activePlate === plate 
                            ? 'bg-violet-600 text-white border-violet-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {plate === 'all' ? 'Todo' : plate}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {config.colorMode === 'rgb' && (
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-2.5 mt-1">
                  <p className="text-[10px] text-violet-700 leading-relaxed font-medium">
                    ✨ <strong>Modo Full RGB</strong>: Recrea la trama utilizando los colores exactos del diseño original. Genera automáticamente una base blanca de alta resistencia debajo de las tramas para estampar en telas oscuras.
                  </p>
                </div>
              )}
            </div>

            {/* 5. Fabric & Shirt Simulator */}
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-800">Simulador de Tela (Remera)</h4>
              <p className="text-[10px] text-slate-400">
                Selecciona el tono de tela para ver cómo la eliminación de negro y la trama se integran visualmente.
              </p>
              <div className="flex gap-2">
                {[
                  { color: '#000000', label: 'Negra' },
                  { color: '#ffffff', label: 'Blanca' },
                  { color: '#1e293b', label: 'Slate' },
                  { color: '#b91c1c', label: 'Roja' },
                  { color: '#1e3a8a', label: 'Azul' },
                  { color: '#4b5563', label: 'Gris' }
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => setConfig({ ...config, dtfFabricColor: item.color })}
                    className={`w-8 h-8 rounded-full border border-slate-300 relative transition-all cursor-pointer flex items-center justify-center ${
                      config.dtfFabricColor === item.color 
                        ? 'ring-2 ring-violet-500 scale-110 border-white' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  >
                    {config.dtfFabricColor === item.color && (
                      <Check className="w-3.5 h-3.5" style={{ color: item.color === '#ffffff' ? '#000000' : '#ffffff' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. DPI Export Resolution Selector */}
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  🖨️ Resolución de Impresión (DPI)
                </h4>
                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                  Alta Fidelidad
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Aumenta la densidad del píxel y el tamaño del lienzo para que tu software RIP reciba micro-puntos de semitono ultra-definidos y sin bordes pixelados.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { dpi: 150, label: '150 DPI', desc: 'Borrador rápido' },
                  { dpi: 300, label: '300 DPI', desc: 'Estándar Textil' },
                  { dpi: 600, label: '600 DPI', desc: 'Ultra Definición' },
                ].map((item) => (
                  <button
                    key={item.dpi}
                    onClick={() => setConfig({ ...config, dtfExportDpi: item.dpi })}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      config.dtfExportDpi === item.dpi
                        ? 'border-violet-600 bg-violet-50 text-violet-900 ring-1 ring-violet-600 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold leading-none">{item.label}</span>
                    <span className="text-[8px] text-slate-400 mt-1">{item.desc}</span>
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Dimensiones de Salida estimadas:</span>
                  <span className="font-semibold text-slate-700">
                    {image ? `${Math.round(image.width * (config.dtfExportDpi === 300 ? 2.5 : config.dtfExportDpi === 600 ? 5.0 : 1.25))} x ${Math.round(image.height * (config.dtfExportDpi === 300 ? 2.5 : config.dtfExportDpi === 600 ? 5.0 : 1.25))} px` : '---'}
                  </span>
                </div>
                <p className="text-slate-400">
                  {config.dtfExportDpi === 600 
                    ? '⚠️ El procesamiento a 600 DPI consume más recursos, ideal para tramas de seda o prendas de alta calidad premium.' 
                    : config.dtfExportDpi === 300
                    ? '✨ Recomendado para impresión directa sobre film (DTF) para que los puntos queden perfectamente definidos.'
                    : '⚡ Recomendado para pruebas rápidas y archivos livianos.'}
                </p>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadFilm}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Exportar Film PNG en Alta Definición
            </button>
          </div>

          {/* Canvas Preview - Right (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Control de previsualización (Zoom / Escala) */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl shadow-sm">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-violet-400" />
                Visualización en Pantalla
              </span>
              <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setPreviewZoom('fit')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    previewZoom === 'fit'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Ajusta toda la imagen a la pantalla para previsualizar el diseño completo"
                >
                  Vista Completa
                </button>
                <button
                  onClick={() => setPreviewZoom('real')}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    previewZoom === 'real'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Muestra los puntos a tamaño real físico de impresión (1:1), ideal para inspeccionar la finura de la trama"
                >
                  Lupa Real 1:1
                </button>
              </div>
            </div>

            <div className={`bg-slate-950 rounded-2xl border border-slate-800 flex relative shadow-inner min-h-[480px] max-h-[550px] ${
              previewZoom === 'real' 
                ? 'overflow-auto p-4 items-start justify-start' 
                : 'overflow-hidden items-center justify-center'
            }`}>
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 gap-3">
                  <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                  <p className="text-xs font-bold text-violet-400">Procesando Trama y Canales...</p>
                </div>
              )}
              
              {/* Main Interactive Canvas */}
              <canvas
                ref={previewCanvasRef}
                className={`${
                  previewZoom === 'real'
                    ? 'shadow-2xl border border-slate-800/60 max-w-none cursor-grab active:cursor-grabbing rounded-xl'
                    : 'max-w-full max-h-[530px] object-contain rounded-xl shadow-lg border border-slate-800/50'
                }`}
              />
            </div>

            {/* Quick Reference Guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-4">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Recomendaciones de Preprensa Física para DTF</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  1. <strong>Tacto Suave</strong>: Asegúrate de habilitar el <strong>Knockout Black</strong> al estampar en remeras negras. Al no depositar base de color negro ni tinta blanca en las sombras, la prenda retiene su elasticidad natural.
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  2. <strong>Tamaño de Punto Mínimo</strong>: Al reducir el tamaño de punto mediante la compensación para evitar ganancia de punto, procura no rebasar el límite de -20% en LPI finos, garantizando que el polvo adhesivo de poliamida logre fijarse firmemente en el film.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
