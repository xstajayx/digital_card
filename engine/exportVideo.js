export async function exportVideo({
  iframe,
  durationMs = 5000,
  fps = 30,
  onProgress
}) {
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;

  const card = doc.querySelector('.card-root');
  if (!card) throw new Error('Card not found');

  // Restart animation
  if (win.play) win.play();

  const rect = card.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;

  const ctx = outputCanvas.getContext('2d');

  const stream = outputCanvas.captureStream(fps);
  const track = stream.getVideoTracks()[0];

  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

  const recorder = new MediaRecorder(stream, { mimeType });

  const chunks = [];
  recorder.ondataavailable = e => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const stopped = new Promise(resolve => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start(100);

  const frameDelay = 1000 / fps;
  const totalFrames = Math.floor(durationMs / frameDelay);

  for (let i = 0; i < totalFrames; i++) {
    if (onProgress) {
      onProgress(`Recording frame ${i + 1}/${totalFrames}`);
    }

    // Wait for next animation frame
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    const frameCanvas = await html2canvas(card, {
      backgroundColor: null,
      useCORS: true,
      scale: 2
    });

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(frameCanvas, 0, 0, width, height);

    if (track && typeof track.requestFrame === 'function') track.requestFrame();

    await new Promise(r => setTimeout(r, frameDelay));
  }

  if (recorder.state === 'recording') {
    recorder.requestData();
    recorder.stop();
  }

  return stopped;
}
