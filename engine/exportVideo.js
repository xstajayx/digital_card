export async function exportVideo({
  iframe,
  durationMs = 5000,
  fps = 30,
  onProgress
}) {
  const doc = iframe?.contentDocument;
  const win = iframe?.contentWindow;

  if (!doc) throw new Error('iframe document not available');

  const card = doc.querySelector('.card-root') || doc.getElementById('cardRoot');
  if (!card) throw new Error('Card not found');

  // Restart animation
  if (win && typeof win.play === 'function') win.play();

  const rect = card.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (!width || !height) throw new Error('Card bounds invalid');

  const paperColor =
    doc.documentElement.style.getPropertyValue('--paper')?.trim() || '#ffffff';

  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  out.style.position = 'fixed';
  out.style.left = '-99999px';
  out.style.top = '0';
  out.style.width = '1px';
  out.style.height = '1px';
  out.style.opacity = '0';
  out.style.pointerEvents = 'none';
  document.body.appendChild(out);

  const ctx = out.getContext('2d');
  if (!ctx) {
    out.remove();
    throw new Error('Could not get 2D context for export canvas');
  }

  const stream = out.captureStream(0);
  const track = stream.getVideoTracks()[0];

  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const stopped = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start(100);

  try {
    const frameDelay = 1000 / fps;
    const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

    for (let i = 0; i < totalFrames; i += 1) {
      if (onProgress) onProgress(`Recording frame ${i + 1}/${totalFrames}`);

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const snapshot = await html2canvas(card, {
        backgroundColor: paperColor,
        useCORS: true,
        scale: 1.5
      });

      ctx.fillStyle = paperColor;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(snapshot, 0, 0, width, height);

      ctx.font = '14px system-ui';
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillText(`frame ${i + 1}/${totalFrames}`, 10, 22);

      if (track && typeof track.requestFrame === 'function') track.requestFrame();

      await new Promise((r) => setTimeout(r, frameDelay));
    }
  } finally {
    if (recorder.state === 'recording') {
      recorder.requestData();
      recorder.stop();
    }
  }

  const blob = await stopped;
  out.remove();
  return blob;
}
