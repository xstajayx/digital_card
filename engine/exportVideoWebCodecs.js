const DEBUG_FRAME_COUNTER = false;

function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function selectCodec(width, height, fps, bitrate) {
  const vp9Config = {
    codec: 'vp09.00.10.08',
    width,
    height,
    bitrate,
    framerate: fps
  };

  if (typeof VideoEncoder.isConfigSupported === 'function') {
    const vp9 = await VideoEncoder.isConfigSupported(vp9Config);
    if (vp9?.supported) return vp9Config;
  }

  const vp8Config = {
    codec: 'vp8',
    width,
    height,
    bitrate,
    framerate: fps
  };

  return vp8Config;
}

export async function exportVideoWebCodecs({
  iframe,
  durationMs = 5000,
  fps = 30,
  bitrate = 2_500_000,
  onProgress
}) {
  const doc = iframe?.contentDocument;
  const win = iframe?.contentWindow;

  if (!doc) throw new Error('iframe document not available');

  const card = doc.querySelector('.card-root') || doc.getElementById('cardRoot');
  if (!card) throw new Error('Card not found');

  if (win && typeof win.play === 'function') win.play();

  const rect = card.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (!width || !height) throw new Error('Card bounds invalid');

  const paperColor = doc.documentElement.style.getPropertyValue('--paper')?.trim() || '#ffffff';
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;

  const ctx = outputCanvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get 2D context for export canvas');

  if (!window.WebMMuxer) {
    throw new Error('WebMMuxer is not loaded');
  }

  const config = await selectCodec(width, height, fps, bitrate);

  const muxer = new window.WebMMuxer({
    target: 'buffer',
    video: {
      codec: config.codec,
      width,
      height,
      frameRate: fps
    }
  });

  let encodeError;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (error) => {
      encodeError = error;
    }
  });

  encoder.configure(config);

  for (let i = 0; i < totalFrames; i += 1) {
    if (onProgress) onProgress(`Encoding frame ${i + 1}/${totalFrames}…`);

    await nextPaint();

    const snapshot = await html2canvas(card, {
      backgroundColor: paperColor,
      useCORS: true,
      scale: 1.5
    });

    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(snapshot, 0, 0, width, height);

    if (DEBUG_FRAME_COUNTER) {
      ctx.font = '14px system-ui';
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillText(`frame ${i + 1}/${totalFrames}`, 10, 22);
    }

    const timestamp = Math.round(i * (1_000_000 / fps));
    const frame = new VideoFrame(outputCanvas, { timestamp });

    encoder.encode(frame, {
      keyFrame: i % Math.max(1, Math.round(fps)) === 0
    });

    frame.close();
  }

  await encoder.flush();
  encoder.close();

  if (encodeError) {
    throw encodeError;
  }

  if (onProgress) onProgress('Muxing…');
  const muxedBuffer = muxer.finalize();
  if (onProgress) onProgress('Done');

  return new Blob([muxedBuffer], { type: 'video/webm' });
}
