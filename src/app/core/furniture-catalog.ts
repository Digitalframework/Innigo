import { Injectable } from '@angular/core';
import { RoomType, StyleType } from './models';

/**
 * Möbel-Katalog — aktuell reine Mock-Daten.
 *
 * ============================================================================
 * TODO(API): Hier wird später die echte Datenbank angebunden.
 * Sämtliche Katalogdaten kommen dann vom Backend, nicht mehr aus diesem File.
 * Die drei Einstiegspunkte sind unten in `FurnitureCatalogService` markiert.
 * ============================================================================
 */

export const FURNITURE_CATEGORIES = [
  'Armchair',
  'Coffeetable',
  'Highboard',
  'Lowboards',
  'Mediawall',
  'Ottoman',
  'Shelves',
  'Sideboard',
  'Sidetable',
  'Sofa',
] as const;
export type FurnitureCategory = (typeof FURNITURE_CATEGORIES)[number];

/** Deutsche Anzeigenamen. TODO(API): kommt später als Lokalisierung vom Backend. */
export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  Armchair: 'Sessel',
  Coffeetable: 'Couchtisch',
  Highboard: 'Highboard',
  Lowboards: 'Lowboard',
  Mediawall: 'Medienwand',
  Ottoman: 'Hocker',
  Shelves: 'Regal',
  Sideboard: 'Sideboard',
  Sidetable: 'Beistelltisch',
  Sofa: 'Sofa',
};

/** Welche Kategorien standardmäßig zu welchem Raum gehören. */
const ROOM_CATEGORIES: Record<RoomType, FurnitureCategory[]> = {
  Wohnzimmer: ['Sofa', 'Armchair', 'Coffeetable', 'Mediawall', 'Sidetable', 'Ottoman'],
  Schlafzimmer: ['Armchair', 'Highboard', 'Sidetable', 'Ottoman'],
  Küche: ['Sideboard', 'Shelves', 'Lowboards'],
  Badezimmer: ['Lowboards', 'Shelves', 'Sidetable'],
  Büro: ['Shelves', 'Sideboard', 'Armchair', 'Lowboards'],
  Esszimmer: ['Sideboard', 'Highboard', 'Armchair', 'Shelves'],
  Sonstiges: ['Sofa', 'Shelves', 'Sideboard'],
};

/**
 * Zuordnung der im Markier-Dialog vergebenen Namen zu Katalog-Kategorien.
 *
 * TODO(API): fällt weg, sobald ein markiertes Möbelstück direkt eine
 * Kategorie-ID vom Backend trägt (statt eines freien Labels).
 */
const LABEL_TO_CATEGORY: Record<string, FurnitureCategory> = {
  sofa: 'Sofa',
  couch: 'Sofa',
  couchtisch: 'Coffeetable',
  fernseher: 'Mediawall',
  medienwand: 'Mediawall',
  sessel: 'Armchair',
  stuhl: 'Armchair',
  regal: 'Shelves',
  schrank: 'Highboard',
  highboard: 'Highboard',
  lowboard: 'Lowboards',
  sideboard: 'Sideboard',
  beistelltisch: 'Sidetable',
  hocker: 'Ottoman',
};

/** Mock-Varianten pro Kategorie — später Produkte aus der Datenbank. */
const MOCK_VARIANTS = ['Eiche natur', 'Anthrazit', 'Bouclé creme'];

export interface CatalogItem {
  id: string;
  /**
   * ID des Möbelbilds in generation-backend (`GET /api/images/{id}`).
   *
   * Nur gesetzt, wenn die Kachel aus der API kommt — die Mock-Einträge unten
   * haben keine Entsprechung dort und bleiben deshalb `undefined`.
   */
  imageId?: number;
  /** Anzeigename in der Sidebar */
  name: string;
  category: FurnitureCategory;
  /** Stil, für den die Variante ausgelegt ist (null = stilneutral) */
  style: StyleType | null;
  /**
   * Produktbild. Solange null, zeigt die Kachel einen grauen Platzhalter.
   *
   * TODO(API): hier kommt die Bild-URL vom Server rein.
   */
  imageUrl: string | null;
  /**
   * Maße des Originalbilds in Pixeln, falls bekannt.
   *
   * Landen als `width`/`height` am `<img>`: der Browser kennt damit die
   * Eigengröße, bevor die Blob-URL da ist, und skaliert beim Verkleinern
   * sauberer, als wenn er sie erst aus den Bytes lernt.
   */
  imageWidthPx?: number;
  imageHeightPx?: number;
}

@Injectable({ providedIn: 'root' })
export class FurnitureCatalogService {
  /**
   * Kategorien, die zum gewählten Raum gehören (Standardanzeige im Tree).
   *
   * TODO(API): ersetzen durch `GET /api/catalog/categories?room={room}`.
   */
  categoriesForRoom(room: RoomType | null): FurnitureCategory[] {
    if (!room) return [...FURNITURE_CATEGORIES];
    return ROOM_CATEGORIES[room] ?? [...FURNITURE_CATEGORIES];
  }

  /**
   * Kategorien zu den im Bild markierten Möbelstücken (Möbel-Modus).
   * Nicht zuordenbare Labels (z. B. „Lampe“) werden übersprungen.
   *
   * TODO(API): ersetzen durch die Kategorie-ID, die das Backend beim
   * Markieren/Erkennen eines Möbelstücks bereits mitliefert.
   */
  categoriesForLabels(labels: readonly string[]): FurnitureCategory[] {
    const matched = labels
      .map((label) => LABEL_TO_CATEGORY[label.trim().toLowerCase()])
      .filter((category): category is FurnitureCategory => !!category);
    return [...new Set(matched)];
  }

  /**
   * Alle übrigen Kategorien — der Nutzer kann sie im Tree aufklappen und
   * ebenfalls Möbel daraus ansehen.
   *
   * TODO(API): fällt weg, sobald das Backend die vollständige Kategorieliste
   * inkl. Relevanz-Kennzeichnung liefert.
   */
  otherCategories(primary: readonly FurnitureCategory[]): FurnitureCategory[] {
    const shown = new Set(primary);
    return FURNITURE_CATEGORIES.filter((category) => !shown.has(category));
  }

  /**
   * Konkrete Möbelstücke einer Kategorie, passend zum gewählten Stil.
   *
   * TODO(API): ersetzen durch
   * `GET /api/catalog/items?category={category}&style={style}` — inkl.
   * Bild-URL, Preis, Hersteller usw., die hier noch fehlen.
   */
  itemsFor(category: FurnitureCategory, style: StyleType | null): CatalogItem[] {
    return MOCK_VARIANTS.map((variant, index) => ({
      id: `${category}-${index}`.toLowerCase(),
      name: `${CATEGORY_LABELS[category]} · ${variant}`,
      category,
      style,
      imageUrl: null, // TODO(API): Bild-URL aus der Datenbank
    }));
  }
}
