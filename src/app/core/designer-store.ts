import { Injectable, computed, signal } from '@angular/core';
import {
  CatalogSelection,
  DesignMode,
  FurnitureItem,
  GeneratedResult,
  GenerationCount,
  RoomType,
  StyleType,
} from './models';

let uid = 0;
export function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}

@Injectable({ providedIn: 'root' })
export class DesignerStore {
  readonly uploadedImage = signal<string | null>(null);
  readonly mode = signal<DesignMode | null>(null);
  readonly room = signal<RoomType | null>(null);
  readonly style = signal<StyleType | null>(null);
  readonly furniture = signal<FurnitureItem[]>([]);
  readonly generationCount = signal<GenerationCount>(1);
  readonly isGenerating = signal(false);
  readonly results = signal<GeneratedResult[]>([]);
  /** Im Möbel-Panel angeklickte Katalogkacheln. */
  readonly catalogSelection = signal<CatalogSelection[]>([]);

  /** Kachel-IDs der Auswahl — für die Markierung im Panel. */
  readonly catalogSelectionIds = computed(() => this.catalogSelection().map((entry) => entry.itemId));

  /**
   * Bild-IDs der ausgewählten Möbel, wie generation-backend sie kennt.
   *
   * Kacheln ohne `imageId` (Mock-Katalog) fallen raus — die Liste enthält
   * damit nur IDs, die serverseitig auflösbar sind.
   */
  readonly selectedFurnitureImageIds = computed(() =>
    this.catalogSelection()
      .map((entry) => entry.imageId)
      .filter((id): id is number => id !== null),
  );

  readonly hasProject = computed(() => this.mode() !== null);
  readonly canGenerate = computed(() => {
    if (!this.uploadedImage()) return false;
    if (this.mode() === 'redesign') return !!this.room() && !!this.style();
    if (this.mode() === 'furniture') return this.furniture().length > 0;
    return false;
  });

  setUploadedImage(dataUrl: string): void {
    this.uploadedImage.set(dataUrl);
    this.results.set([]);
  }

  setMode(mode: DesignMode): void {
    this.mode.set(mode);
  }

  setRoomAndStyle(room: RoomType, style: StyleType): void {
    this.room.set(room);
    this.style.set(style);
  }

  addFurniture(item: Omit<FurnitureItem, 'id'>): void {
    this.furniture.update((list) => [...list, { ...item, id: nextId('furniture') }]);
  }

  updateFurniture(id: string, patch: Partial<FurnitureItem>): void {
    this.furniture.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  removeFurniture(id: string): void {
    this.furniture.update((list) => list.filter((item) => item.id !== id));
  }

  toggleCatalogItem(item: CatalogSelection): void {
    this.catalogSelection.update((list) =>
      list.some((entry) => entry.itemId === item.itemId)
        ? list.filter((entry) => entry.itemId !== item.itemId)
        : [...list, item],
    );
  }

  isCatalogItemSelected(itemId: string): boolean {
    return this.catalogSelection().some((entry) => entry.itemId === itemId);
  }

  setGenerationCount(count: GenerationCount): void {
    this.generationCount.set(count);
  }

  resetProject(): void {
    this.uploadedImage.set(null);
    this.mode.set(null);
    this.room.set(null);
    this.style.set(null);
    this.furniture.set([]);
    this.results.set([]);
    this.catalogSelection.set([]);
    this.isGenerating.set(false);
  }
}
