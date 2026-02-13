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
      to: initialTheme?.defaults?.to || '',
      message: initialTheme?.defaults?.message || '',
      from: initialTheme?.defaults?.from || '',
      watermark: true,
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
