class RecorderProcessor extends AudioWorkletProcessor {
  private recording = false;
  private bufferSize = 4096;
  private leftBuffer = new Float32Array(this.bufferSize);
  private rightBuffer = new Float32Array(this.bufferSize);
  private writeIndex = 0;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data.type === "start") {
        this.recording = true;
        this.writeIndex = 0;
      }
      if (e.data.type === "stop") {
        this.recording = false;
        if (this.writeIndex > 0) {
          this.port.postMessage({
            type: "data",
            left: this.leftBuffer.slice(0, this.writeIndex),
            right: this.rightBuffer.slice(0, this.writeIndex),
          });
          this.writeIndex = 0;
        }
        this.port.postMessage({ type: "stopped" });
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const output = outputs[0];

    // Pass-through: copy input to output unchanged
    if (input[0] && output[0]) output[0].set(input[0]);
    if (input[1] && output[1]) output[1].set(input[1]);

    if (this.recording && input[0]) {
      const left = input[0];
      const right = input[1] ?? input[0];
      for (let i = 0; i < left.length; i++) {
        this.leftBuffer[this.writeIndex] = left[i];
        this.rightBuffer[this.writeIndex] = right[i];
        this.writeIndex++;
        if (this.writeIndex >= this.bufferSize) {
          this.port.postMessage({
            type: "data",
            left: this.leftBuffer.slice(),
            right: this.rightBuffer.slice(),
          });
          this.writeIndex = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor("recorder-processor", RecorderProcessor);
