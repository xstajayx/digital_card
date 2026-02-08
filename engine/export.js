import { createCardController } from './preview.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function exportGif({
  theme,
  content,
  watermark,
  width,
  height,
  fps = 10,
  durationMs,
  onProgress
}) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  const iframe = document.createElement('iframe');
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.border = 'none';
  container.appendChild(iframe);

  const controller = await createCardController(iframe);
  controller.setTheme(theme);
  controller.setContent(content);
  controller.setWatermark(watermark);
  controller.play();

  const totalDuration = durationMs ?? Math.max(7000, theme.timing.fxStopMs || 8000);
  const frameDelay = 1000 / fps;
  const frames = Math.floor(totalDuration / frameDelay);

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width,
    height,
    workerScript: '/vendor/gif.worker.min.js'
  });

  const start = performance.now();

  for (let i = 0; i < frames; i += 1) {
    if (onProgress) {
      onProgress(`Rendering frame ${i + 1}/${frames}`);
    }

    const targetTime = start + i * frameDelay;
    const waitMs = Math.max(0, targetTime - performance.now());
    if (waitMs > 0) {
      await wait(waitMs);
    }

    const canvas = await window.html2canvas(controller.doc.body, {
      backgroundColor: null,
      width,
      height,
      scale: 1
    });
    gif.addFrame(canvas, { delay: frameDelay });
  }

  const blob = await new Promise((resolve) => {
    gif.on('finished', (result) => resolve(result));
    if (onProgress) {
      onProgress('Encoding GIF...');
    }
    gif.render();
  });

  container.remove();
  return blob;
}
