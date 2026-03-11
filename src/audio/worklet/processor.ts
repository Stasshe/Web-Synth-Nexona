import { SynthEngine } from "../engine/synthEngine";

interface SynthProcessorMessage {
  type: "init" | "noteOn" | "noteOff";
  sab?: SharedArrayBuffer;
  note?: number;
  velocity?: number;
}

class SynthProcessor extends AudioWorkletProcessor {
  private engine: SynthEngine;
  private initialized = false;

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
          this.engine.noteOn(msg.note!, msg.velocity ?? 127);
          break;
        case "noteOff":
          this.engine.noteOff(msg.note!);
          break;
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    if (!this.initialized) return true;
    this.engine.processBlock(outputs[0]);
    return true;
  }
}

registerProcessor("synth-processor", SynthProcessor);
