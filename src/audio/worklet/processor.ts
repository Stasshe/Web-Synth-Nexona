import type { ModRoute } from "../dsp/modulation/modMatrix";
import type { Wavetable } from "../dsp/wavetable/wavetableEngine";
import { SynthEngine } from "../engine/synthEngine";

interface SynthProcessorMessage {
  type: "init" | "noteOn" | "noteOff" | "setModRoutes" | "loadWavetableA" | "loadWavetableB";
  sab?: SharedArrayBuffer;
  note: number;
  velocity?: number;
  routes?: ModRoute[];
  wavetable?: Wavetable;
}

class SynthProcessor extends AudioWorkletProcessor {
  private engine: SynthEngine;
  private initialized = false;
  private blockCount = 0;
  private waveformBuffer = new Float32Array(128);

  constructor() {
    super();
    this.engine = new SynthEngine(sampleRate);

    this.port.onmessage = (e: MessageEvent<SynthProcessorMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case "init":
          if (msg.sab) {
            this.engine.setSAB(new Int32Array(msg.sab));
            this.initialized = true;
          }
          break;
        case "noteOn":
          this.engine.noteOn(msg.note, msg.velocity ?? 127);
          break;
        case "noteOff":
          this.engine.noteOff(msg.note);
          break;
        case "setModRoutes":
          if (msg.routes) {
            this.engine.setModRoutes(msg.routes);
          }
          break;
        case "loadWavetableA":
          if (msg.wavetable) {
            this.engine.setWavetableA(msg.wavetable);
          }
          break;
        case "loadWavetableB":
          if (msg.wavetable) {
            this.engine.setWavetableB(msg.wavetable);
          }
          break;
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (!this.initialized) return true;
    this.engine.processBlock(outputs[0]);

    // Send waveform snapshot every 8 blocks (~43fps at 48kHz/128)
    this.blockCount++;
    if (this.blockCount >= 8) {
      this.blockCount = 0;
      const left = outputs[0][0];
      if (left) {
        this.waveformBuffer.set(left);
        this.port.postMessage({ type: "waveform", data: this.waveformBuffer }, [
          this.waveformBuffer.buffer,
        ]);
        this.waveformBuffer = new Float32Array(128);
      }
    }

    return true;
  }
}

registerProcessor("synth-processor", SynthProcessor);
