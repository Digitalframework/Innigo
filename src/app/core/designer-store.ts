import { Injectable, computed, signal } from '@angular/core';
import {
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
  /** IDs der im Katalog-Tree ausgewählten Möbel (Redesign-Modus). */
  readonly catalogSelection = signal<string[]>([]);
  readonly generationCount = signal<GenerationCount>(1);
  readonly isGenerating = signal(false);
  readonly results = signal<GeneratedResult[]>([]);

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

  toggleCatalogItem(itemId: string): void {
    this.catalogSelection.update((ids) =>
      ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId],
    );
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
    this.catalogSelection.set([]);
    this.results.set([]);
    this.isGenerating.set(false);
  }
}
