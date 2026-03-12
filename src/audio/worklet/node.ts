import type { ModRoute } from "../dsp/modulation/modMatrix";
import type { Wavetable } from "../dsp/wavetable/wavetablePresets";
import type { ModFeedback } from "../engine/synthEngine";
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
  loadWavetableC: (wt: Wavetable) => void;
  loadWavetableSub: (wt: Wavetable) => void;
  onWaveformData: (callback: (data: Float32Array) => void) => void;
  onModFeedback: (callback: (feedback: ModFeedback) => void) => void;
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

  let waveformCallback: ((data: Float32Array) => void) | null = null;
  let modFeedbackCallback: ((feedback: ModFeedback) => void) | null = null;

  node.port.onmessage = (e: MessageEvent) => {
    if (e.data.type === "waveform") {
      if (waveformCallback) waveformCallback(e.data.data);
      if (modFeedbackCallback && e.data.feedback) modFeedbackCallback(e.data.feedback);
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
      const plain = routes.map((r) => ({ source: r.source, target: r.target, amount: r.amount }));
      node.port.postMessage({ type: "setModRoutes", routes: plain });
    },
    loadWavetableA(wt: Wavetable) {
      node.port.postMessage({ type: "loadWavetableA", wavetable: wt });
    },
    loadWavetableB(wt: Wavetable) {
      node.port.postMessage({ type: "loadWavetableB", wavetable: wt });
    },
    loadWavetableC(wt: Wavetable) {
      node.port.postMessage({ type: "loadWavetableC", wavetable: wt });
    },
    loadWavetableSub(wt: Wavetable) {
      node.port.postMessage({ type: "loadWavetableSub", wavetable: wt });
    },
    onWaveformData(callback: (data: Float32Array) => void) {
      waveformCallback = callback;
    },
    onModFeedback(callback: (feedback: ModFeedback) => void) {
      modFeedbackCallback = callback;
    },
    disconnect() {
      node.disconnect();
    },
  };
}
