import { bandLimit, pitchBand } from "./bandlimit";
import type { Wavetable } from "./wavetablePresets";

const DEFAULT_MAX_ENTRIES = 128;

export class WavetableCache {
  private cache = new Map<string, Wavetable>();
  private accessOrder: string[] = [];
  private maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get(source: Wavetable, wavetableId: number, midiNote: number, sampleRate: number): Wavetable {
    const band = pitchBand(midiNote);
    const key = `${wavetableId}_${band}`;

    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
      }
      this.accessOrder.push(key);
      return this.cache.get(key)!;
    }

    // Generate band-limited table
    const table = bandLimit(source, midiNote, sampleRate);
    this.cache.set(key, table);
    this.accessOrder.push(key);

    // Evict LRU if over limit
    while (this.accessOrder.length > this.maxEntries) {
      const evictKey = this.accessOrder.shift()!;
      this.cache.delete(evictKey);
    }

    return table;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  get size(): number {
    return this.cache.size;
  }
}
