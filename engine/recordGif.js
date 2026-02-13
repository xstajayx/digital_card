import { exportGif } from './export.js';

export async function recordPreviewGif({ previewFrame, stateSnapshot, setStatus }) {
  const blob = await exportGif({
    iframe: previewFrame,
    theme: stateSnapshot.theme,
    content: stateSnapshot.content,
    watermark: stateSnapshot.watermark,
    fps: 10,
    durationMs: 3000,
    onProgress: setStatus
  });

  return blob;
}
