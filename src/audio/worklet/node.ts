import { createSAB } from "../sab/init";

export interface SynthNode {
  node: AudioWorkletNode;
  sab: SharedArrayBuffer;
  sabView: Int32Array;
  noteOn: (note: number, velocity?: number) => void;
  noteOff: (note: number) => void;
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
    disconnect() {
      node.disconnect();
    },
  };
}
