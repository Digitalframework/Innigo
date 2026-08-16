export type DesignMode = 'redesign' | 'furniture';

export const ROOM_TYPES = [
  'Wohnzimmer',
  'Schlafzimmer',
  'Küche',
  'Badezimmer',
  'Büro',
  'Esszimmer',
  'Sonstiges',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const STYLE_TYPES = [
  'Modern',
  'Minimalistisch',
  'Skandinavisch',
  'Industrial',
  'Rustikal',
  'Japandi',
  'Luxus',
  'Klassisch',
] as const;
export type StyleType = (typeof STYLE_TYPES)[number];

export interface BoundingBox {
  x: number; // percentage of image width, 0-100
  y: number; // percentage of image height, 0-100
  width: number;
  height: number;
}

/** Womit ein markiertes Möbelstück ersetzt wird: gleiche Art, oder frei benannt. */
export type ReplaceMode = 'same' | 'custom';

export interface FurnitureItem {
  id: string;
  label: string;
  box: BoundingBox;
  replaceMode: ReplaceMode;
  /** Nur bei `replaceMode === 'custom'` gefüllt. */
  replacement: string;
}

export interface GeneratedResult {
  id: string;
  imageUrl: string;
}

export type GenerationCount = 1 | 2 | 3 | 4;
