import { Component, computed, effect, input, output, signal } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';

import { ReplaceMode } from '../../../core/models';

export interface FurnitureDraft {
  label: string;
  replaceMode: ReplaceMode;
  replacement: string;
}

const COMMON_FURNITURE = [
  'Sofa',
  'Couchtisch',
  'Fernseher',
  'Sessel',
  'Lampe',
  'Teppich',
  'Regal',
  'Bett',
  'Schrank',
  'Esstisch',
  'Stuhl',
];

@Component({
  selector: 'app-furniture-box-modal',
  imports: [NzModalModule, NzIconModule, NzInputModule, FormsModule],
  templateUrl: './furniture-box-modal.html',
  styleUrl: './furniture-box-modal.scss',
})
export class FurnitureBoxModal {
  readonly visible = input(false);
  readonly initial = input<FurnitureDraft | null>(null);

  readonly closed = output<void>();
  readonly confirmed = output<FurnitureDraft>();
  readonly deleted = output<void>();

  protected readonly commonItems = COMMON_FURNITURE;
  protected readonly label = signal('');
  protected readonly replaceMode = signal<ReplaceMode>('same');
  protected readonly replacement = signal('');

  protected get isEdit(): boolean {
    return this.initial() !== null;
  }

  /** „ein anderes Bett“ bzw. neutral, solange nichts gewählt ist */
  protected readonly sameLabel = computed(() => {
    const label = this.label().trim();
    return label ? `Durch ein anderes ${label} ersetzen` : 'Durch ein ähnliches Möbelstück ersetzen';
  });

  protected readonly canConfirm = computed(() => {
    if (!this.label().trim()) return false;
    if (this.replaceMode() === 'custom') return !!this.replacement().trim();
    return true;
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        const initial = this.initial();
        this.label.set(initial?.label ?? '');
        this.replaceMode.set(initial?.replaceMode ?? 'same');
        this.replacement.set(initial?.replacement ?? '');
      }
    });
  }

  pick(item: string): void {
    this.label.set(item);
  }

  setReplaceMode(mode: ReplaceMode): void {
    this.replaceMode.set(mode);
  }

  confirm(): void {
    if (!this.canConfirm()) return;
    const mode = this.replaceMode();
    this.confirmed.emit({
      label: this.label().trim(),
      replaceMode: mode,
      replacement: mode === 'custom' ? this.replacement().trim() : '',
    });
  }

  remove(): void {
    this.deleted.emit();
  }

  onCancel(): void {
    this.closed.emit();
  }
}
