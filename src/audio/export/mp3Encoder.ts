function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

export async function encodeMp3(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  bitRate = 192,
): Promise<ArrayBuffer> {
  const { Mp3Encoder } = await import("lamejs");
  const encoder = new Mp3Encoder(2, sampleRate, bitRate);

  const leftInt16 = float32ToInt16(left);
  const rightInt16 = float32ToInt16(right);

  const chunks: Int8Array[] = [];
  const blockSize = 1152;

  for (let i = 0; i < leftInt16.length; i += blockSize) {
    const leftChunk = leftInt16.subarray(i, i + blockSize);
    const rightChunk = rightInt16.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) chunks.push(mp3buf);
  }

  const final = encoder.flush();
  if (final.length > 0) chunks.push(final);

  let totalLength = 0;
  for (const chunk of chunks) totalLength += chunk.length;

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}
