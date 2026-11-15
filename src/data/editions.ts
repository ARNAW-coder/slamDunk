export type FinishId =
  | 'classic-orange'
  | 'charcoal-green'
  | 'electric-blue'
  | 'dark-crimson';

export type SeamGlowMode = 'none' | 'core' | 'outline';

export interface BallEdition {
  id: FinishId;
  name: string;
  subtitle: string;
  price: string;
  priceNum: number;
  sizeSpec: string;
  badgeText: string;
  watermark: string;
  swatchHex: string;
  leatherBaseHex: string;
  leatherHighlightHex: string;
  seamColorHex: string;
  seamEmissiveHex: string;
  seamEmissiveIntensity: number;
  seamGlowMode: SeamGlowMode;
  valveColorHex: string;
  stampColorHex: string;
  // PBR material tuning per edition
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  pebbleIntensity: number;
  normalScale: number;
  envMapIntensity: number;
  sheenColorHex: string;
  // Studio lighting pairing per edition
  rimLightHex: string;
  rimLightIntensity: number;
  bounceLightHex: string;
  // UI Theme Pairing
  uiAccentHex: string;
  uiAccentHoverHex: string;
  uiAccentTextHex: string;
}

export const BALL_EDITIONS: BallEdition[] = [
  {
    id: 'classic-orange',
    name: 'CLASSIC ORANGE & BLACK',
    subtitle: 'Standard Micro-Pebbled Leather Composite',
    price: '$34.99',
    priceNum: 34.99,
    sizeSpec: 'SIZE: 29.5" • OFFICIAL',
    badgeText: 'STANDARD EDITION',
    watermark: 'SPALDING',
    swatchHex: '#FF3B00',
    leatherBaseHex: '#E83600',
    leatherHighlightHex: '#FF3B00',
    seamColorHex: '#050507',
    seamEmissiveHex: '#000000',
    seamEmissiveIntensity: 0,
    seamGlowMode: 'none',
    valveColorHex: '#B98D46',
    stampColorHex: '#9E2300',
    metalness: 0.22,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    pebbleIntensity: 0.22,
    normalScale: 0.3,
    envMapIntensity: 1.45,
    sheenColorHex: '#FF3B00',
    rimLightHex: '#FFFFFF',
    rimLightIntensity: 3.2,
    bounceLightHex: '#FF3B00',
    uiAccentHex: '#FF3B00',
    uiAccentHoverHex: '#FF5722',
    uiAccentTextHex: '#FFFFFF',
  },
  {
    id: 'charcoal-green',
    name: 'CHARCOAL / GREEN GLOW',
    subtitle: 'Metallic Obsidian with Neon Green Channels',
    price: '$49.99',
    priceNum: 49.99,
    sizeSpec: 'SIZE: 29.5" • LIMITED',
    badgeText: 'GREEN GLOW EDITION',
    watermark: 'OBSIDIAN',
    swatchHex: '#18F54B',
    leatherBaseHex: '#101612',
    leatherHighlightHex: '#1E2C22',
    seamColorHex: '#18F54B',
    seamEmissiveHex: '#18F54B',
    seamEmissiveIntensity: 1.85,
    seamGlowMode: 'core',
    valveColorHex: '#18F54B',
    stampColorHex: '#18F54B',
    metalness: 0.78,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    pebbleIntensity: 0.2,
    normalScale: 0.45,
    envMapIntensity: 1.75,
    sheenColorHex: '#0D421C',
    rimLightHex: '#D8FFE2',
    rimLightIntensity: 3.1,
    bounceLightHex: '#18F54B',
    uiAccentHex: '#18F54B',
    uiAccentHoverHex: '#3BFF68',
    uiAccentTextHex: '#000000',
  },
  {
    id: 'electric-blue',
    name: 'ELECTRIC BLUE / CYAN',
    subtitle: 'Polished Metallic Lacquer with Cyan Glow',
    price: '$54.99',
    priceNum: 54.99,
    sizeSpec: 'SIZE: 29.5" • PRO SERIES',
    badgeText: 'CYAN GLOW EDITION',
    watermark: 'VELOCITY',
    swatchHex: '#00E5FF',
    leatherBaseHex: '#071636',
    leatherHighlightHex: '#0F306E',
    seamColorHex: '#00E5FF',
    seamEmissiveHex: '#00E5FF',
    seamEmissiveIntensity: 1.9,
    seamGlowMode: 'core',
    valveColorHex: '#00E5FF',
    stampColorHex: '#00E5FF',
    metalness: 0.7,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    pebbleIntensity: 0.22,
    normalScale: 0.48,
    envMapIntensity: 1.8,
    sheenColorHex: '#074B7D',
    rimLightHex: '#BCEEFF',
    rimLightIntensity: 3.3,
    bounceLightHex: '#00E5FF',
    uiAccentHex: '#00D8F5',
    uiAccentHoverHex: '#38E8FF',
    uiAccentTextHex: '#000000',
  },
  {
    id: 'dark-crimson',
    name: 'DARK CRIMSON / BURGUNDY',
    subtitle: 'Satin Carbon-Composite with Crimson Outline',
    price: '$64.99',
    priceNum: 64.99,
    sizeSpec: 'SIZE: 29.5" • COLLECTOR',
    badgeText: 'CRIMSON EDITION',
    watermark: 'CHAMPION',
    swatchHex: '#A61126',
    leatherBaseHex: '#26030A',
    leatherHighlightHex: '#520817',
    seamColorHex: '#0B0306',
    seamEmissiveHex: '#CC102B',
    seamEmissiveIntensity: 1.15,
    seamGlowMode: 'outline',
    valveColorHex: '#8E1628',
    stampColorHex: '#9E1428',
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.055,
    pebbleIntensity: 0.21,
    normalScale: 0.46,
    envMapIntensity: 1.78,
    sheenColorHex: '#540615',
    rimLightHex: '#E85D75',
    rimLightIntensity: 2.9,
    bounceLightHex: '#8C0B20',
    uiAccentHex: '#B81028',
    uiAccentHoverHex: '#D41733',
    uiAccentTextHex: '#FFFFFF',
  },
];

export interface EditorialSectionMeta {
  index: string;
  id: string;
  label: string;
}

export const EDITORIAL_SECTIONS: EditorialSectionMeta[] = [
  { index: '01', id: 'hero', label: 'Overview' },
  { index: '02', id: 'elite-control', label: 'About Us' },
  { index: '03', id: 'contact-us', label: 'Contact Us' },
];

export interface HudCalloutSpec {
  id: string;
  side: 'left' | 'right';
  position: 'top' | 'bottom';
  value: string;
  unit: string;
  label: string;
  description: string;
}

export const HUD_CALLOUTS: HudCalloutSpec[] = [
  {
    id: 'channel-depth',
    side: 'left',
    position: 'top',
    value: '1.2',
    unit: 'mm',
    label: 'CHANNEL DEPTH',
    description: 'Recessed composite rubber seams for instant tactile alignment.',
  },
  {
    id: 'circumference',
    side: 'right',
    position: 'top',
    value: '29.5',
    unit: '"',
    label: 'REGULATION CIRCUMFERENCE',
    description: 'Official pro-court specification with butyl bladder air retention.',
  },
  {
    id: 'pebbles',
    side: 'left',
    position: 'bottom',
    value: '3.4',
    unit: 'k',
    label: 'MICRO-PEBBLES / PANEL',
    description: 'Uniform thermal-molded grip nodes for zero-slip palm release.',
  },
  {
    id: 'pressure',
    side: 'right',
    position: 'bottom',
    value: '8.0',
    unit: 'PSI',
    label: 'INTERNAL PRESSURE',
    description: 'Rotational nylon-wound carcass maintains true spherical rebound.',
  },
];
