const TEMPLATE_URL = './engine/card-template.html';

const waitFor = (check, timeoutMs = 7000, intervalMs = 50) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      try {
        if (check()) return resolve();
      } catch {}
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
    iframe.removeAttribute('srcdoc');
    iframe.addEventListener('load', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    iframe.src = TEMPLATE_URL;
  });

  await waitFor(() => {
    const w = iframe.contentWindow;
    return w && typeof w.setCardData === 'function';
  });

  let theme = null;
  let content = {
    headline: '',
    message: '',
    from: '',
    giftUrl: '',
    fontId: 'fredoka',
    birthdayNumber: '',
    paperOverride: '',
    inkOverride: '',
    mode: 'share',
    stickerId: '',
    themeId: ''
  };
  let watermark = true;

  function safeCallSetCardData() {
    const w = iframe.contentWindow;
    if (!w || typeof w.setCardData !== 'function') return;

    w.setCardData({
      palette: theme?.palette || null,
      timing: theme?.timing || null,
      features: theme?.features || null,
      headline: content.headline || '',
      message: content.message || '',
      from: content.from || '',
      mode: 'share',
      fontId: content.fontId || 'fredoka',
      birthdayNumber: content.birthdayNumber || '',
      paperOverride: content.paperOverride || '',
      inkOverride: content.inkOverride || '',
      viewer: false,
      watermark: !!watermark,
      giftUrl: content.giftUrl || '',
      stickerId: content.stickerId || '',
      themeId: content.themeId || theme?.id || '',
      themeCssHref: theme?.id ? `../themes/${theme.id}/theme.css` : ''
    });
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
      safeCallSetCardData();
      iframe.contentWindow?.play?.();
    }
  };
}
