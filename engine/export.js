const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getHtml2Canvas() {
  if (typeof window !== 'undefined' && typeof window.html2canvas === 'function') return window.html2canvas;
  if (typeof html2canvas === 'function') return html2canvas;
  throw new Error('html2canvas is not loaded.');
}

const waitForSetCardData = (iframe, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const w = iframe.contentWindow;
      if (w && typeof w.setCardData === 'function') return resolve(w.setCardData);
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('Preview iframe is not ready for export.'));
      }
      return setTimeout(tick, 50);
    };
    tick();
  });

function getCardElement(iframe) {
  const doc = iframe?.contentDocument;
  if (!doc) throw new Error('Export failed: iframe document not available.');

  const cardRoot = doc.querySelector('#cardRoot') || doc.querySelector('.card-root');
  if (!cardRoot) throw new Error('Export failed: #cardRoot/.card-root not found.');

  const rect = cardRoot.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  return { doc, cardRoot, width, height };
}

export async function exportGif({
  iframe,
  theme,
  content,
  watermark,
  fps = 8,
  durationMs = 2800,
  onProgress
}) {
  if (!iframe) throw new Error('Export failed: preview iframe is required.');

  const setCardData = await waitForSetCardData(iframe);
  setCardData({
    palette: theme?.palette || null,
    timing: theme?.timing || null,
    features: theme?.features || null,
    headline: content?.headline || '',
    message: content?.message || '',
    from: content?.from || '',
    photoDataUrl: content?.photo || '',
    watermark: !!watermark,
    mode: 'editor',
    viewer: false,
    giftUrl: '',
    themeCssHref: theme?.id ? `../themes/${theme.id}/theme.css` : ''
  });

  const w = iframe.contentWindow;
  if (w && typeof w.play === 'function') w.play();

  await wait(200);

  const { cardRoot, width, height } = getCardElement(iframe);
  const html2canvasFn = getHtml2Canvas();

  const frameDelay = Math.max(60, Math.round(1000 / Math.max(1, fps)));
  const requestedFrames = Math.max(1, Math.round(durationMs / frameDelay));
  const totalFrames = Math.min(40, requestedFrames);

  const gif = new GIF({
    workers: 2,
    quality: 7,
    width,
    height,
    workerScript: './vendor/gif.worker.js'
  });

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const frameCtx = frameCanvas.getContext('2d', { alpha: false });
  if (!frameCtx) throw new Error('Export failed: could not create frame canvas.');

  const paper = iframe.contentDocument?.documentElement?.style?.getPropertyValue('--paper')?.trim() || '#ffffff';

  for (let i = 0; i < totalFrames; i += 1) {
    onProgress?.(`Rendering frame ${i + 1}/${totalFrames}`);

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const captureCanvas = await html2canvasFn(cardRoot, {
      backgroundColor: paper,
      useCORS: true,
      scale: 2
    });

    frameCtx.clearRect(0, 0, width, height);
    frameCtx.fillStyle = paper;
    frameCtx.fillRect(0, 0, width, height);
    frameCtx.drawImage(captureCanvas, 0, 0, width, height);

    gif.addFrame(frameCanvas, { delay: frameDelay, copy: true });

    await wait(frameDelay);
  }

  return new Promise((resolve) => {
    gif.on('finished', (result) => resolve(result));
    onProgress?.('Encoding GIF...');
    gif.render();
  });
}
