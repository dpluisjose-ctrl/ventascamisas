export interface SublimationOrder {
  id: string;
  clientName: string;
  clientContact: string;
  productType: string;
  customProductType?: string;
  quantity: number;
  designNotes: string;
  price: number;
  advancePayment: number;
  dueDate: string;
  status: 'Pendiente' | 'En Diseño' | 'En Producción' | 'Listo para Retirar' | 'Entregado';
  priority: 'Baja' | 'Media' | 'Alta';
  imagePreview?: string; // base64 or object URL
  createdAt: string;
}

export interface DtfConfig {
  dotSize: number;
  angle: number;
  contrast: number;
  brightness: number;
  shape: 'circle' | 'square' | 'line' | 'ellipse';
  colorMode: 'monochrome' | 'cmyk' | 'rgb';
  activePlate: 'all' | 'cyan' | 'magenta' | 'yellow' | 'black';
  invert: boolean;
  backgroundType: 'white' | 'transparent';
  dotColor: string;
  dtfKnockoutBlack: boolean;
  dtfKnockoutThreshold: number;
  dtfFabricColor: string;
  dtfDotGainCompensation: number;
  dtfHighlightBoost: number; // 0 to 100
  dtfGamma: number;          // 0.5 to 3.0
  dtfHdAntialiasing: boolean;
  dtfLpi: number;            // 15 to 100
  dtfExportDpi: number;      // 150, 300, 600
  dtfMethod?: 'halftone' | 'diffusion' | 'color_halftone';
  dtfBlackPoint?: number;
  dtfWhitePoint?: number;
  dtfPrintWidthCm?: number;
  dtfSelectiveThreshold?: number; // 0 to 100, where 100 is halftone everywhere, smaller numbers restrict halftone to darks/shadows
  dtfMinDotSize?: number;         // 0 to 50, filters out dots whose diameter/radius factor is smaller than this percentage
  dtfEliminateColor?: string;     // Hex color to eliminate in color_halftone mode
}

export interface SublimationPreset {
  product: string;
  temperature: number; // in Celsius
  time: number; // in seconds
  pressure: 'Baja' | 'Media' | 'Alta';
  notes: string;
}
