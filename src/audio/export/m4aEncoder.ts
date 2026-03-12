export async function encodeM4a(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): Promise<{ data: ArrayBuffer; mimeType: string; extension: string }> {
  const ctx = new AudioContext({ sampleRate });
  const buffer = ctx.createBuffer(2, left.length, sampleRate);
  buffer.copyToChannel(new Float32Array(left), 0);
  buffer.copyToChannel(new Float32Array(right), 1);

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const dest = ctx.createMediaStreamDestination();
  source.connect(dest);

  const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

  const recorder = new MediaRecorder(dest.stream, { mimeType });
  const chunks: Blob[] = [];

  const result = new Promise<{ data: ArrayBuffer; mimeType: string; extension: string }>(
    (resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const data = await blob.arrayBuffer();
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        resolve({ data, mimeType, extension });
        ctx.close();
      };
      recorder.onerror = () => {
        reject(new Error("MediaRecorder error"));
        ctx.close();
      };
    },
  );

  recorder.start();
  source.start();

  // Stop recording when playback ends
  source.onended = () => {
    setTimeout(() => {
      recorder.stop();
      for (const track of dest.stream.getTracks()) track.stop();
    }, 100);
  };

  return result;
}
