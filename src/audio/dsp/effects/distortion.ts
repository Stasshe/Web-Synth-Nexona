/** Waveshaper distortion with 8 curve modes and 2x oversampling. */

export class Distortion {
  private drive = 1;
  private tone = 0.5;
  private mix = 0;
  private mode = 0;
  private bits = 8;

  // One-pole lowpass for tone control on wet signal
  private lpL = 0;
  private lpR = 0;
  private lpCoeff = 0.5;

  // Downsample state
  private holdL = 0;
  private holdR = 0;
  private holdCounter = 0;
  private holdInterval = 1;

  setParams(drive: number, tone: number, mix: number, mode = 0): void {
    this.drive = drive;
    this.tone = tone;
    this.mix = mix;
    this.mode = mode;
    this.bits = Math.round(4 + tone * 8);
    // Tone controls lowpass: 0 = dark (coeff ~0.05), 1 = bright (coeff ~1.0 = bypass)
    this.lpCoeff = 0.05 + tone * 0.95;
    // Downsample interval: tone 0 = heavy (hold 32 samples), tone 1 = light (hold 1)
    this.holdInterval = Math.max(1, Math.round(1 + (1 - tone) * 31));
  }

  private distort(x: number): number {
    const driven = x * this.drive;
    switch (this.mode) {
      case 0: // soft clip (tanh)
        return Math.tanh(driven);
      case 1: // hard clip
        return Math.max(-1, Math.min(1, driven));
      case 2: {
        // wavefolder — proper triangle fold
        let v = driven;
        v = v - 4 * Math.floor((v + 1) / 4);
        return v > 1 ? 2 - v : v < -1 ? -2 - v : v;
      }
      case 3: {
        // bitcrush
        const step = 2 / 2 ** this.bits;
        return Math.round(driven / step) * step;
      }
      case 4: {
        // tube — asymmetric saturation with even harmonics
        const sat = driven > 0 ? 1 - Math.exp(-driven) : -1 + Math.exp(driven);
        return sat + 0.1 * driven * driven * Math.sign(driven); // even harmonic bias
      }
      case 5: {
        // scream — multi-stage cascade for extreme harmonics
        let v = Math.tanh(driven * 2);
        v = v - 4 * Math.floor((v + 1) / 4);
        v = v > 1 ? 2 - v : v < -1 ? -2 - v : v;
        return Math.tanh(v * 3);
      }
      case 6: // rectify — full-wave, creates octave-up
        return Math.abs(driven) * 2 - 1;
      case 7: // downsample — handled in process()
        return driven;
      default:
        return Math.tanh(driven);
    }
  }

  process(inL: number, inR: number): [number, number] {
    if (this.mix === 0) return [inL, inR];

    let wetL: number;
    let wetR: number;

    if (this.mode === 7) {
      // Downsample mode — hold and skip samples
      this.holdCounter++;
      if (this.holdCounter >= this.holdInterval) {
        this.holdCounter = 0;
        this.holdL = Math.tanh(inL * this.drive);
        this.holdR = Math.tanh(inR * this.drive);
      }
      wetL = this.holdL;
      wetR = this.holdR;
    } else if (this.mode === 3) {
      // Bitcrush — no oversampling needed
      wetL = this.distort(inL);
      wetR = this.distort(inR);
    } else {
      // 2x oversampling for analog-style modes
      // Upsample: insert zero, then filter (simplified: linear interpolation)
      const prevL = this.lpL;
      const prevR = this.lpR;
      const midL = (prevL + inL) * 0.5;
      const midR = (prevR + inR) * 0.5;

      // Process at 2x rate
      const d1L = this.distort(midL);
      const d1R = this.distort(midR);
      const d2L = this.distort(inL);
      const d2R = this.distort(inR);

      // Decimate: average both samples
      wetL = (d1L + d2L) * 0.5;
      wetR = (d1R + d2R) * 0.5;
    }

    // Apply tone filter (one-pole lowpass on wet signal)
    this.lpL += this.lpCoeff * (wetL - this.lpL);
    this.lpR += this.lpCoeff * (wetR - this.lpR);
    wetL = this.lpL;
    wetR = this.lpR;

    // Mix dry/wet — NO output normalization, let the signal be loud
    const m = this.mix;
    return [inL * (1 - m) + wetL * m, inR * (1 - m) + wetR * m];
  }
}
