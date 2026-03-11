import type { ModRoute } from "../dsp/modulation/modMatrix";
import type { Wavetable } from "../dsp/wavetable/wavetableEngine";
import { createSAB } from "../sab/init";

export interface SynthNode {
  node: AudioWorkletNode;
  sab: SharedArrayBuffer;
  sabView: Int32Array;
  noteOn: (note: number, velocity?: number) => void;
  noteOff: (note: number) => void;
  setModRoutes: (routes: ModRoute[]) => void;
  loadWavetableA: (wt: Wavetable) => void;
  loadWavetableB: (wt: Wavetable) => void;
  onWaveformData: (callback: (data: Float32Array) => void) => void;
  disconnect: () => void;
}

export async function createSynthNode(ctx: AudioContext): Promise<SynthNode> {
  await ctx.audioWorklet.addModule("/worklet/processor.js");

  const sab = createSAB();
  const sabView = new Int32Array(sab);

  const node = new AudioWorkletNode(ctx, "synth-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });

  node.port.postMessage({ type: "init", sab });
  node.connect(ctx.destination);

  let waveformCallback: ((data: Float32Array) => void) | null = null;

  node.port.onmessage = (e: MessageEvent) => {
    if (e.data.type === "waveform" && waveformCallback) {
      waveformCallback(e.data.data);
    }
  };

  return {
    node,
    sab,
    sabView,
    noteOn(note: number, velocity = 127) {
      node.port.postMessage({ type: "noteOn", note, velocity });
    },
    noteOff(note: number) {
      node.port.postMessage({ type: "noteOff", note });
    },
    setModRoutes(routes: ModRoute[]) {
      node.port.postMessage({ type: "setModRoutes", routes });
    },
    loadWavetableA(wt: Wavetable) {
      node.port.postMessage({ type: "loadWavetableA", wavetable: wt });
    },
    loadWavetableB(wt: Wavetable) {
      node.port.postMessage({ type: "loadWavetableB", wavetable: wt });
    },
    onWaveformData(callback: (data: Float32Array) => void) {
      waveformCallback = callback;
    },
    disconnect() {
      node.disconnect();
    },
  };
}
