import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';

const MESSAGES = [
  'Analysiere deinen Raum…',
  'Wende deinen Wunschstil an…',
  'Platziere neue Möbel…',
  'Verfeinere Licht und Schatten…',
  'Letzte Details werden poliert…',
];

@Component({
  selector: 'app-loading-overlay',
  imports: [],
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.scss',
})
export class LoadingOverlay {
  readonly visible = input(false);

  protected readonly messages = MESSAGES;
  protected readonly messageIndex = signal(0);

  private readonly destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.messageIndex.set(0);
        this.intervalId = setInterval(() => {
          this.messageIndex.update((i) => (i + 1) % this.messages.length);
        }, 1600);
      } else if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.intervalId) clearInterval(this.intervalId);
    });
  }
}
