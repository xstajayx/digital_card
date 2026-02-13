import { createState } from './state.js';
import { createUI, loadThemes } from './ui.js';
import { createCardController } from '../engine/preview.js';

async function init() {
  const elements = {
    toInput: document.getElementById('toInput'),
    messageInput: document.getElementById('messageInput'),
    fromInput: document.getElementById('fromInput'),
    photoInput: document.getElementById('photoInput'),
    watermarkToggle: document.getElementById('watermarkToggle'),
    giftToggle: document.getElementById('giftToggle'),
    giftInput: document.getElementById('giftInput'),
    giftField: document.getElementById('giftField'),
    themeGallery: document.getElementById('themeGallery'),
    replayButton: document.getElementById('replayButton'),
    replayButtonInline: document.getElementById('replayButtonInline'),
    createGifButton: document.getElementById('createGifButton'),
    modeShareButton: document.getElementById('modeShareButton'),
    modeGifButton: document.getElementById('modeGifButton'),
    gifResult: document.getElementById('gifResult'),
    gifPreviewImage: document.getElementById('gifPreviewImage'),
    downloadGifLink: document.getElementById('downloadGifLink'),
    shareLinkButton: document.getElementById('shareLinkButton'),
    shareWhatsappButton: document.getElementById('shareWhatsappButton'),
    exportStatus: document.getElementById('exportStatus'),
    previewFrame: document.getElementById('cardPreview')
  };

  const state = createState();

  try {
    const preview = await createCardController(elements.previewFrame);

    const themes = await loadThemes();
    if (!themes.length) {
      elements.exportStatus.textContent = 'No themes could be loaded. Check console errors for failing URLs.';
      return;
    }

    const initialTheme = themes[0];

    state.set({
      themes,
      theme: initialTheme,
      to: (initialTheme?.defaults?.to || '').slice(0, 36),
      message: (initialTheme?.defaults?.message || '').slice(0, 180),
      from: (initialTheme?.defaults?.from || '').slice(0, 36),
      watermark: true,
      mode: 'share',
      giftEnabled: false,
      giftUrl: ''
    });

    createUI({ state, preview, elements });
    elements.exportStatus.textContent = '';
  } catch (err) {
    console.error(err);
    elements.exportStatus.textContent = `Error: ${err.message || err}`;
  }
}

init();
