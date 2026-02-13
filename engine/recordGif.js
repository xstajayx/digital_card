import { exportGif } from './export.js';

export async function recordPreviewGif({ previewFrame, stateSnapshot, setStatus }) {
  const blob = await exportGif({
    iframe: previewFrame,
    theme: stateSnapshot.theme,
    content: stateSnapshot.content,
    watermark: stateSnapshot.watermark,
    fps: 8,
    durationMs: 2800,
    onProgress: setStatus
  });

  return blob;
}
