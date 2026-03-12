import type { RecordingResult } from "./audioRecorder";
import { encodeM4a } from "./m4aEncoder";
import { encodeMp3 } from "./mp3Encoder";
import { encodeWav } from "./wavEncoder";

export type ExportFormat = "wav" | "mp3" | "m4a";

export async function exportAudio(
  recording: RecordingResult,
  format: ExportFormat,
  filename = "recording",
): Promise<void> {
  let blob: Blob;
  let extension: string;

  switch (format) {
    case "wav": {
      const buffer = encodeWav(recording.left, recording.right, recording.sampleRate);
      blob = new Blob([buffer], { type: "audio/wav" });
      extension = "wav";
      break;
    }
    case "mp3": {
      const buffer = await encodeMp3(recording.left, recording.right, recording.sampleRate);
      blob = new Blob([buffer], { type: "audio/mpeg" });
      extension = "mp3";
      break;
    }
    case "m4a": {
      const result = await encodeM4a(recording.left, recording.right, recording.sampleRate);
      blob = new Blob([result.data], { type: result.mimeType });
      extension = result.extension;
      break;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}
