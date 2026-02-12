const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getCardElement(iframe) {
  const doc = iframe?.contentDocument;
  if (!doc) throw new Error('Video export failed: iframe document not available.');

  const cardRoot = doc.querySelector('.card-root') || doc.getElementById('cardRoot');
  if (!cardRoot) throw new Error('Video export failed: .card-root/#cardRoot not found.');

  const rect = cardRoot.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (!width || !height) throw new Error('Video export failed: card bounds invalid.');

  return { doc, cardRoot, width, height };
}

function buildRecorder(stream) {
  const preferred = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  for (const mimeType of preferred) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mimeType)) {
      continue;
    }

    try {
      return {
        recorder: new MediaRecorder(stream, { mimeType }),
        mimeType
      };
    } catch (_error) {
      // Try next supported type.
    }
  }

  throw new Error('Video export failed: MediaRecorder does not support WebM (vp9/vp8).');
}

export async function exportVideo({ iframe, durationMs = 5000, fps = 30, onProgress }) {
  if (!iframe) throw new Error('Video export failed: preview iframe is required.');
  if (typeof html2canvas !== 'function') {
    throw new Error('Video export failed: html2canvas is not available.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Video export failed: MediaRecorder is not available in this browser.');
  }

  const { doc, cardRoot, width, height } = getCardElement(iframe);
  const paper = doc.documentElement.style.getPropertyValue('--paper')?.trim() || '#ffffff';

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;

  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Video export failed: could not create output canvas context.');

  const frameDelay = 1000 / fps;
  const totalFrames = Math.max(1, Math.ceil(durationMs / frameDelay));

  const stream = outputCanvas.captureStream(fps);
  const { recorder } = buildRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const done = new Promise((resolve, reject) => {
    recorder.onerror = (event) => reject(event?.error || new Error('MediaRecorder error.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
  });

  if (onProgress) onProgress('Recording video...');
  recorder.start();

  const start = performance.now();

  for (let i = 0; i < totalFrames; i += 1) {
    const targetTime = start + i * frameDelay;
    const waitMs = Math.max(0, targetTime - performance.now());
    if (waitMs > 0) await wait(waitMs);

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const snapshot = await html2canvas(cardRoot, {
      backgroundColor: paper,
      useCORS: true,
      scale: 1
    });

    outputCtx.clearRect(0, 0, width, height);
    outputCtx.fillStyle = paper;
    outputCtx.fillRect(0, 0, width, height);
    outputCtx.drawImage(snapshot, 0, 0, width, height);

    if (onProgress) {
      onProgress(`Recording video frame ${i + 1}/${totalFrames}`);
    }
  }

  const elapsed = performance.now() - start;
  const remaining = durationMs - elapsed;
  if (remaining > 0) await wait(remaining);

  recorder.stop();
  const blob = await done;

  if (onProgress) onProgress('Video encoding complete.');
  return blob;
}
