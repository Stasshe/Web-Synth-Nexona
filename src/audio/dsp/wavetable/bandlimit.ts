import { fft, ifft } from "../utils/fft";
import type { Wavetable } from "./wavetablePresets";

/**
 * Generate a band-limited version of a wavetable for a given MIDI note.
 * Zeroes all harmonics above Nyquist for that note's fundamental.
 */
export function bandLimit(source: Wavetable, midiNote: number, sampleRate: number): Wavetable {
  const freq = 440 * 2 ** ((midiNote - 69) / 12);
  const maxHarmonic = Math.floor(sampleRate / 2 / freq);
  const tableSize = source.tableSize;

  const frames: Float32Array[] = [];

  for (let f = 0; f < source.numFrames; f++) {
    const srcFrame = source.frames[f];
    const real = new Float32Array(tableSize);
    const imag = new Float32Array(tableSize);

    // Copy source into real part
    for (let i = 0; i < tableSize; i++) {
      real[i] = srcFrame[i];
    }

    // Forward FFT
    fft(real, imag);

    // Zero bins above max harmonic
    for (let i = maxHarmonic + 1; i < tableSize - maxHarmonic; i++) {
      real[i] = 0;
      imag[i] = 0;
    }

    // Inverse FFT
    ifft(real, imag);

    // Normalize
    let maxAbs = 0;
    for (let i = 0; i < tableSize; i++) {
      const abs = Math.abs(real[i]);
      if (abs > maxAbs) maxAbs = abs;
    }

    const output = new Float32Array(tableSize + 1);
    const scale = maxAbs > 0 ? 1 / maxAbs : 1;
    for (let i = 0; i < tableSize; i++) {
      output[i] = real[i] * scale;
    }
    output[tableSize] = output[0]; // Wrap-around sample

    frames.push(output);
  }

  return { frames, tableSize, numFrames: source.numFrames };
}

/**
 * Get pitch band index for a MIDI note (one per octave)
 */
export function pitchBand(midiNote: number): number {
  return Math.floor(midiNote / 12);
}
