export interface RecordingResult {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  duration: number;
}

export type RecordingState = "idle" | "recording";

export class AudioRecorder {
  private ctx: AudioContext;
  private recorderNode: AudioWorkletNode | null = null;
  private state: RecordingState = "idle";
  private leftChunks: Float32Array[] = [];
  private rightChunks: Float32Array[] = [];
  private totalSamples = 0;
  private resolveStop: ((result: RecordingResult) => void) | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  async init(): Promise<void> {
    await this.ctx.audioWorklet.addModule("/worklet/recorder.js");
    this.recorderNode = new AudioWorkletNode(this.ctx, "recorder-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    this.recorderNode.port.onmessage = (e: MessageEvent) => {
      if (e.data.type === "data") {
        this.leftChunks.push(e.data.left as Float32Array);
        this.rightChunks.push(e.data.right as Float32Array);
        this.totalSamples += (e.data.left as Float32Array).length;
      }
      if (e.data.type === "stopped") {
        const result = this.buildResult();
        this.resolveStop?.(result);
        this.resolveStop = null;
      }
    };
  }

  getNode(): AudioWorkletNode {
    if (!this.recorderNode) throw new Error("AudioRecorder not initialized");
    return this.recorderNode;
  }

  getState(): RecordingState {
    return this.state;
  }

  start(): void {
    this.leftChunks = [];
    this.rightChunks = [];
    this.totalSamples = 0;
    this.state = "recording";
    this.recorderNode!.port.postMessage({ type: "start" });
  }

  stop(): Promise<RecordingResult> {
    this.state = "idle";
    return new Promise((resolve) => {
      this.resolveStop = resolve;
      this.recorderNode!.port.postMessage({ type: "stop" });
    });
  }

  private buildResult(): RecordingResult {
    const left = new Float32Array(this.totalSamples);
    const right = new Float32Array(this.totalSamples);
    let offset = 0;
    for (let i = 0; i < this.leftChunks.length; i++) {
      left.set(this.leftChunks[i], offset);
      right.set(this.rightChunks[i], offset);
      offset += this.leftChunks[i].length;
    }
    return {
      left,
      right,
      sampleRate: this.ctx.sampleRate,
      duration: this.totalSamples / this.ctx.sampleRate,
    };
  }
}
