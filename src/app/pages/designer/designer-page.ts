import { Component, computed, inject, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DesignerStore } from '../../core/designer-store';
import { GenerationService } from '../../core/generation.service';
import { BoundingBox, FurnitureItem, GenerationCount, RoomType, StyleType } from '../../core/models';

import { ModeSelectModal } from './mode-select-modal/mode-select-modal';
import { RoomStyleModal } from './room-style-modal/room-style-modal';
import { FurnitureBoxModal, FurnitureDraft } from './furniture-box-modal/furniture-box-modal';
import { FurniturePanel } from './furniture-panel/furniture-panel';
import { LoadingOverlay } from './loading-overlay/loading-overlay';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

@Component({
  selector: 'app-designer-page',
  imports: [
    NzIconModule,
    NzUploadModule,
    NzTooltipModule,
    ModeSelectModal,
    RoomStyleModal,
    FurnitureBoxModal,
    FurniturePanel,
    LoadingOverlay,
  ],
  templateUrl: './designer-page.html',
  styleUrl: './designer-page.scss',
})
export class DesignerPage {
  protected readonly store = inject(DesignerStore);
  private readonly generationService = inject(GenerationService);
  private readonly message = inject(NzMessageService);

  protected readonly generationOptions: GenerationCount[] = [1, 2, 3, 4];

  protected readonly showModeModal = signal(false);
  protected readonly showRoomStyleModal = signal(false);
  protected readonly showFurnitureModal = signal(false);
  protected readonly selectToolActive = signal(false);
  protected readonly editingFurnitureId = signal<string | null>(null);
  protected readonly pendingBox = signal<BoundingBox | null>(null);

  private readonly isDragging = signal(false);
  private readonly dragStart = signal<{ x: number; y: number } | null>(null);
  private readonly dragCurrent = signal<{ x: number; y: number } | null>(null);

  protected readonly draftBox = computed<BoundingBox | null>(() => {
    const start = this.dragStart();
    const current = this.dragCurrent();
    if (!start || !current) return null;
    return {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    };
  });

  protected readonly editingDraft = computed<FurnitureDraft | null>(() => {
    const id = this.editingFurnitureId();
    if (!id) return null;
    const item = this.store.furniture().find((f) => f.id === id);
    return item
      ? { label: item.label, replaceMode: item.replaceMode, replacement: item.replacement }
      : null;
  });

  protected readonly beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = file as unknown as File;
    const reader = new FileReader();
    reader.onload = () => {
      this.store.setUploadedImage(reader.result as string);
      this.showModeModal.set(true);
    };
    reader.readAsDataURL(rawFile);
    return false;
  };

  // ---- Mode / Room / Style modals ----

  protected openModeModal(): void {
    this.showModeModal.set(true);
  }

  protected closeModeModal(): void {
    this.showModeModal.set(false);
  }

  protected onModeSelected(mode: 'redesign' | 'furniture'): void {
    this.store.setMode(mode);
    this.showModeModal.set(false);
    if (mode === 'redesign') {
      this.showRoomStyleModal.set(true);
    } else {
      this.selectToolActive.set(true);
    }
  }

  protected openRoomStyleModal(): void {
    this.showRoomStyleModal.set(true);
  }

  protected closeRoomStyleModal(): void {
    this.showRoomStyleModal.set(false);
  }

  protected onRoomStyleConfirmed(value: { room: RoomType; style: StyleType }): void {
    this.store.setRoomAndStyle(value.room, value.style);
    this.showRoomStyleModal.set(false);
  }

  // ---- Furniture bounding boxes ----

  protected toggleSelectTool(): void {
    if (this.store.mode() !== 'furniture' || !this.store.uploadedImage()) return;
    this.selectToolActive.update((v) => !v);
  }

  protected onBoxPointerDown(event: PointerEvent): void {
    if (!this.selectToolActive() || this.store.mode() !== 'furniture') return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const point = {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
    this.dragStart.set(point);
    this.dragCurrent.set(point);
    this.isDragging.set(true);
    target.setPointerCapture(event.pointerId);
  }

  protected onBoxPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.dragCurrent.set({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  }

  protected onBoxPointerUp(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    const box = this.draftBox();
    this.dragStart.set(null);
    this.dragCurrent.set(null);
    if (box && box.width > 2.5 && box.height > 2.5) {
      this.pendingBox.set(box);
      this.editingFurnitureId.set(null);
      this.showFurnitureModal.set(true);
    }
  }

  protected editFurniture(item: FurnitureItem): void {
    this.editingFurnitureId.set(item.id);
    this.pendingBox.set(item.box);
    this.showFurnitureModal.set(true);
  }

  protected onFurnitureConfirmed(draft: FurnitureDraft): void {
    const id = this.editingFurnitureId();
    if (id) {
      this.store.updateFurniture(id, draft);
    } else {
      const box = this.pendingBox();
      if (box) this.store.addFurniture({ ...draft, box });
    }
    this.message.success(id ? 'Möbelstück aktualisiert.' : 'Möbelstück hinzugefügt.');
    this.closeFurnitureModal();
  }

  protected onFurnitureDeleted(): void {
    const id = this.editingFurnitureId();
    if (id) this.store.removeFurniture(id);
    this.closeFurnitureModal();
  }

  protected closeFurnitureModal(): void {
    this.showFurnitureModal.set(false);
    this.editingFurnitureId.set(null);
    this.pendingBox.set(null);
  }

  // ---- Generation ----

  protected selectGenerationCount(count: GenerationCount): void {
    this.store.setGenerationCount(count);
  }

  protected async generate(): Promise<void> {
    if (!this.store.canGenerate() || this.store.isGenerating()) return;
    this.store.isGenerating.set(true);
    try {
      const results = await this.generationService.generate(this.store.generationCount());
      this.store.results.set(results);
      this.message.success('Deine Bilder wurden erstellt!');
    } finally {
      this.store.isGenerating.set(false);
    }
  }

  protected newUpload(): void {
    this.store.resetProject();
    this.selectToolActive.set(false);
  }

  protected resetProject(): void {
    this.store.resetProject();
    this.selectToolActive.set(false);
    this.message.info('Projekt zurückgesetzt.');
  }
}
