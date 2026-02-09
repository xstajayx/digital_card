// digital_card/engine/preview.js
// Loads the preview as a real page (iframe.src), then calls window.setCardData inside it.
// This avoids srcdoc path issues and works on GitHub Pages subpaths.

const TEMPLATE_URL = './engine/card-template.html';

const waitFor = (check, timeoutMs = 5000, intervalMs = 50) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (check()) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('card-template.html did not expose window.setCardData(data).'));
      }
      return setTimeout(tick, intervalMs);
    };
    tick();
  });

export async function createCardController(iframe) {
  if (!iframe) throw new Error('Preview iframe not found.');

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview iframe load timeout.')), 8000);
    iframe.addEventListener(
      'load',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
    iframe.src = TEMPLATE_URL;
  });

  await waitFor(() => {
    const w = iframe.contentWindow;
    return w && typeof w.setCardData === 'function';
  });

  let theme = null;
  let content = { headline: '', message: '', from: '', photo: '' };
  let watermark = true;

  function push() {
    const w = iframe.contentWindow;
    if (!w || typeof w.setCardData !== 'function') return;

    w.setCardData({
      palette: theme?.palette || null,
      timing: theme?.timing || null,
      features: theme?.features || null,
      headline: content.headline || '',
      message: content.message || '',
      from: content.from || '',
      photoDataUrl: content.photo || '',
      watermark: !!watermark,
      themeCssHref: theme?.id ? `../themes/${theme.id}/theme.css` : ''
    });
  }

  return {
    setTheme(nextTheme) {
      theme = nextTheme;
      push();
    },
    setContent(nextContent) {
      content = { ...content, ...nextContent };
      push();
    },
    setWatermark(enabled) {
      watermark = !!enabled;
      push();
    },
    play() {
      push();
      const w = iframe.contentWindow;
      if (w && typeof w.play === 'function') w.play();
    }
  };
}
