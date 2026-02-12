const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // ✅ grab the real card box only
  const cardRoot =
    doc.querySelector('.card-root') ||
    doc.getElementById('cardRoot');

  if (!cardRoot) throw new Error('Export failed: .card-root/#cardRoot not found.');

  const rect = cardRoot.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (!width || !height) throw new Error('Export failed: card bounds invalid.');

  return { doc, cardRoot, width, height };
}


export async function exportGif({
  iframe,
  theme,
  content,
  watermark,
  fps = 6,
  durationMs,
  onProgress
}) {
  if (!iframe) {
    throw new Error('Export failed: preview iframe is required.');
  }

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
    themeCssHref: theme?.id ? `../themes/${theme.id}/theme.css` : ''
  });

  const w = iframe.contentWindow;
  if (w && typeof w.play === 'function') w.play();

  const { cardRoot, width, height } = getCardElement(iframe);
  const duration = durationMs || 5000;
  const revealDuration =
    parseFloat(iframe.contentDocument.documentElement.style.getPropertyValue('--balloons-duration')) ||
    3000;
  await wait(revealDuration + 150);

  const totalDuration = Math.min(duration, 2500);
  const frameDelay = 1000 / fps;
  const frames = Math.max(1, Math.floor(totalDuration / frameDelay));

 const gif = new GIF({
  workers: 2,
  quality: 7,
  width,
  height,
  workerScript: './vendor/gif.worker.js'
});

// ✅ fixed-size canvas for every frame (prevents black/blank and “rest of page” feeling)
const frameCanvas = document.createElement('canvas');
frameCanvas.width = width;
frameCanvas.height = height;
const frameCtx = frameCanvas.getContext('2d');

// ✅ solid background for GIF (no alpha in GIF)
const paper =
  iframe.contentDocument.documentElement.style.getPropertyValue('--paper')?.trim() || '#ffffff';

const start = performance.now();

for (let i = 0; i < frames; i += 1) {
  if (onProgress) onProgress(`Rendering frame ${i + 1}/${frames}`);

  const targetTime = start + i * frameDelay;
  const waitMs = Math.max(0, targetTime - performance.now());
  if (waitMs > 0) await wait(waitMs);

  // double rAF = more stable paint
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // capture at higher scale for clarity
  const captureScale = 2;
  const cap = await html2canvas(cardRoot, {
    backgroundColor: paper,   // ✅ IMPORTANT: no transparency
    useCORS: true,
    scale: captureScale
  });

  // draw captured image into fixed-size frame
  frameCtx.clearRect(0, 0, width, height);
  frameCtx.fillStyle = paper;
  frameCtx.fillRect(0, 0, width, height);

  // cap is (width*captureScale x height*captureScale), draw down to exact GIF size
  frameCtx.drawImage(cap, 0, 0, width, height);

  gif.addFrame(frameCanvas, { delay: frameDelay, copy: true });
}

  const blob = await new Promise((resolve) => {
    gif.on('finished', (result) => resolve(result));
    if (onProgress) {
      onProgress('Encoding GIF...');
    }
    gif.render();
  });

  return blob;
}
