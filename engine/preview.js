// digital_card/engine/preview.js
// Loads the preview as a real page (iframe.src), then calls window.setCardData inside it.
// This avoids srcdoc path issues and works on GitHub Pages subpaths.

export async function createCardController(iframe) {
  if (!iframe) throw new Error('Preview iframe not found.');

  // ✅ GitHub Pages repo-safe relative path
  const TEMPLATE_URL = './engine/card-template.html';

  // Load template into iframe
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

  // Wait until template exposes API
  async function waitForSetCardData() {
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const w = iframe.contentWindow;
      if (w && typeof w.setCardData === 'function') return;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('card-template.html did not expose window.setCardData(data).');
  }

  await waitForSetCardData();

  let theme = null;
  let content = { headline: '', message: '', from: '', photo: '' };
  let watermark = true;

  function push() {
    const w = iframe.contentWindow;
    if (!w || typeof w.setCardData !== 'function') return;

    w.setCardData({
      theme,
      palette: theme?.palette || null,
      timing: theme?.timing || null,
      features: theme?.features || null,

      // These come from your UI.js
      headline: content.headline || '',
      message: content.message || '',
      from: content.from || '',
      photoDataUrl: content.photo || '',

      watermark: !!watermark,

      // Make theme css resolvable from within the iframe page
      themeCssHref: theme?.id ? `./themes/${theme.id}/theme.css` : ''
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
      // The template should restart animations when setCardData runs.
      // If it also exposes window.play(), we call it.
      push();
      const w = iframe.contentWindow;
      if (w && typeof w.play === 'function') w.play();
    }
  };
}
