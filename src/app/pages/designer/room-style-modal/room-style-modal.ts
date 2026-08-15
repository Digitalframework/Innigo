import { Component, effect, input, output, signal } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ROOM_TYPES, RoomType, STYLE_TYPES, StyleType } from '../../../core/models';

@Component({
  selector: 'app-room-style-modal',
  imports: [NzModalModule, NzIconModule],
  templateUrl: './room-style-modal.html',
  styleUrl: './room-style-modal.scss',
})
export class RoomStyleModal {
  readonly visible = input(false);
  readonly initialRoom = input<RoomType | null>(null);
  readonly initialStyle = input<StyleType | null>(null);

  readonly closed = output<void>();
  readonly confirmed = output<{ room: RoomType; style: StyleType }>();

  protected readonly roomTypes = ROOM_TYPES;
  protected readonly styleTypes = STYLE_TYPES;

  protected readonly step = signal<1 | 2>(1);
  protected readonly selectedRoom = signal<RoomType | null>(null);
  protected readonly selectedStyle = signal<StyleType | null>(null);

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.selectedRoom.set(this.initialRoom());
        this.selectedStyle.set(this.initialStyle());
        this.step.set(this.initialRoom() ? 2 : 1);
      }
    });
  }

  selectRoom(room: RoomType): void {
    this.selectedRoom.set(room);
  }

  selectStyle(style: StyleType): void {
    this.selectedStyle.set(style);
  }

  goNext(): void {
    if (this.selectedRoom()) this.step.set(2);
  }

  goBack(): void {
    this.step.set(1);
  }

  confirm(): void {
    const room = this.selectedRoom();
    const style = this.selectedStyle();
    if (room && style) {
      this.confirmed.emit({ room, style });
    }
  }

  onCancel(): void {
    this.closed.emit();
  }
}
