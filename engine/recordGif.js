const FPS = 10;
const DURATION_MS = 2000;
const MAX_FRAMES = Math.floor((DURATION_MS / 1000) * FPS);

let gifScriptPromise;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureGifJsLoaded() {
  if (window.GIF) return Promise.resolve();
  if (gifScriptPromise) return gifScriptPromise;

  gifScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = './vendor/gif.min.js';
    script.async = true;
    script.onload = () => {
      if (window.GIF) resolve();
      else reject(new Error('gif.js loaded but GIF constructor is unavailable.'));
    };
    script.onerror = () => reject(new Error('Unable to load gif.js from ./vendor/gif.min.js'));
    document.head.appendChild(script);
  });

  return gifScriptPromise;
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function recordPreviewGif({ previewFrame, preview, setStatus }) {
  if (!previewFrame?.contentWindow) {
    throw new Error('Preview is not ready yet.');
  }

  await ensureGifJsLoaded();

  if (preview && typeof preview.play === 'function') {
    preview.play();
    await wait(80);
  }

  setStatus?.('Choose this tab in the capture picker…');

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false
  });

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
  video.srcObject = stream;
  document.body.appendChild(video);

  try {
    await video.play();
    if (!video.videoWidth || !video.videoHeight) {
      await new Promise((resolve) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
      });
    }

    const cardRect = previewFrame.contentWindow.getCardRect?.();
    if (!cardRect) {
      throw new Error('Could not read card bounds from preview frame.');
    }

    const iframeRect = previewFrame.getBoundingClientRect();
    const scaleX = video.videoWidth / window.innerWidth;
    const scaleY = video.videoHeight / window.innerHeight;

    const cropX = Math.max(0, (iframeRect.left + toFiniteNumber(cardRect.left)) * scaleX);
    const cropY = Math.max(0, (iframeRect.top + toFiniteNumber(cardRect.top)) * scaleY);
    const cropW = Math.max(1, toFiniteNumber(cardRect.width) * scaleX);
    const cropH = Math.max(1, toFiniteNumber(cardRect.height) * scaleY);

    const outputWidth = Math.max(1, Math.round(toFiniteNumber(cardRect.width)));
    const outputHeight = Math.max(1, Math.round(toFiniteNumber(cardRect.height)));

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');

    const gif = new window.GIF({
      workers: 2,
      quality: 7,
      width: outputWidth,
      height: outputHeight,
      workerScript: './vendor/gif.worker.js'
    });

    const frameDelay = Math.round(1000 / FPS);

    for (let i = 0; i < MAX_FRAMES; i += 1) {
      setStatus?.(`Recording ${i + 1}/${MAX_FRAMES}…`);
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outputWidth, outputHeight);
      gif.addFrame(canvas, { copy: true, delay: frameDelay });
      await wait(frameDelay);
    }

    setStatus?.('Encoding…');

    const blob = await new Promise((resolve) => {
      gif.on('finished', (result) => resolve(result));
      gif.render();
    });

    downloadBlob(blob, `card-${Date.now()}.gif`);
    setStatus?.('GIF downloaded ✅');
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
    video.remove();
  }
}
