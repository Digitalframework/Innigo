import { Component, output, input } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DesignMode } from '../../../core/models';

@Component({
  selector: 'app-mode-select-modal',
  imports: [NzModalModule, NzIconModule],
  templateUrl: './mode-select-modal.html',
  styleUrl: './mode-select-modal.scss',
})
export class ModeSelectModal {
  readonly visible = input(false);
  readonly closed = output<void>();
  readonly modeSelected = output<DesignMode>();

  choose(mode: DesignMode): void {
    this.modeSelected.emit(mode);
  }

  onCancel(): void {
    this.closed.emit();
  }
}
