import { Injectable } from '@angular/core';
import { GeneratedResult, GenerationCount } from './models';
import { nextId } from './designer-store';

const PLACEHOLDER_SEEDS = [
  'roomly-a',
  'roomly-b',
  'roomly-c',
  'roomly-d',
  'roomly-e',
  'roomly-f',
];

/**
 * Simulates a KI room-generation job. No real model is called yet — this
 * stands in for a future backend/API integration behind the same interface.
 */
@Injectable({ providedIn: 'root' })
export class GenerationService {
  generate(count: GenerationCount): Promise<GeneratedResult[]> {
    const seeds = shuffle(PLACEHOLDER_SEEDS).slice(0, count);
    return delay(2400).then(() =>
      seeds.map((seed) => ({
        id: nextId('result'),
        imageUrl: `https://picsum.photos/seed/${seed}-${Date.now()}/900/650`,
      })),
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
