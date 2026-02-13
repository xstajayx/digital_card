// digital_card/engine/preview.js
// Loads the preview as a real page (iframe.src), then calls window.setCardData inside it.
// Hardened: never let preview errors break the main UI.

const TEMPLATE_URL = './engine/card-template.html';

const waitFor = (check, timeoutMs = 7000, intervalMs = 50) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      try {
        if (check()) return resolve();
      } catch (e) {
        // ignore transient iframe access errors while loading
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('Preview iframe is not ready (window.setCardData not found).'));
      }
      return setTimeout(tick, intervalMs);
    };
    tick();
  });

export async function createCardController(iframe) {
  if (!iframe) throw new Error('Preview iframe not found.');

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview iframe load timeout.')), 12000);
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
  let content = { headline: '', message: '', from: '', photo: '', giftUrl: '' };
  let watermark = true;

  function safeCallSetCardData() {
    const w = iframe.contentWindow;
    if (!w || typeof w.setCardData !== 'function') return;

    try {
      w.setCardData({
        palette: theme?.palette || null,
        timing: theme?.timing || null,
        features: theme?.features || null,
        headline: content.headline || '',
        message: content.message || '',
        from: content.from || '',
        mode: 'editor',
        viewer: false,
        photoDataUrl: content.photo || '',
        watermark: !!watermark,
        giftUrl: content.giftUrl || '',
        // ✅ card-template is /engine/card-template.html so ../themes works
        themeCssHref: theme?.id ? `../themes/${theme.id}/theme.css` : ''
      });
    } catch (err) {
      // ✅ CRITICAL: never allow preview to break the editor UI
      console.error('[Preview] setCardData failed:', err);

      // Optional: surface a hint inside the preview frame (if possible)
      try {
        const doc = iframe.contentDocument;
        const root = doc && doc.body;
        if (root) {
          root.dataset.previewError = '1';
        }
      } catch (_) {}
    }
  }

  function safePlay() {
    safeCallSetCardData();
    const w = iframe.contentWindow;
    try {
      if (w && typeof w.play === 'function') w.play();
    } catch (err) {
      console.error('[Preview] play() failed:', err);
    }
  }

  return {
    setTheme(nextTheme) {
      theme = nextTheme;
      safeCallSetCardData();
    },
    setContent(nextContent) {
      content = { ...content, ...nextContent };
      safeCallSetCardData();
    },
    setWatermark(enabled) {
      watermark = !!enabled;
      safeCallSetCardData();
    },
    play() {
      safePlay();
    }
  };
}
