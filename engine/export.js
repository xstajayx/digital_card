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
  if (!doc) {
    throw new Error('Export failed: preview iframe document is not available.');
  }

  const cardRoot = doc.querySelector('#cardRoot');
  if (!cardRoot) {
    throw new Error('Export failed: #cardRoot was not found in preview iframe.');
  }

  const rect = cardRoot.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    throw new Error('Export failed: #cardRoot has invalid bounds.');
  }

  return {
    doc,
    cardRoot,
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

export async function exportGif({
  iframe,
  theme,
  content,
  watermark,
  fps = 14,
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
  const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
  const totalDuration = durationMs ?? Math.max(7000, theme?.timing?.fxStopMs || 8000);
  const frameDelay = 1000 / fps;
  const frames = Math.max(1, Math.floor(totalDuration / frameDelay));

  const gif = new GIF({
    workers: 2,
    quality: 7,
    width,
    height,
    workerScript: './vendor/gif.worker.js'
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

    const canvas = await window.html2canvas(cardRoot, {
      backgroundColor: null,
      useCORS: true,
      scale,
      width,
      height
    });

    gif.addFrame(canvas, { delay: frameDelay, copy: true });
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
