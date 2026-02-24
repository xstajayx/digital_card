import { createState } from './state.js';
import { createUI, loadThemes } from './ui.js';
import { createCardController } from '../engine/preview.js';

async function init() {
  const elements = {
    toInput: document.getElementById('toInput'),
    messageInput: document.getElementById('messageInput'),
    fromInput: document.getElementById('fromInput'),
    fontSelect: document.getElementById('fontSelect'),
    photoInput: document.getElementById('photoInput'),
    watermarkToggle: document.getElementById('watermarkToggle'),
    giftToggle: document.getElementById('giftToggle'),
    giftInput: document.getElementById('giftInput'),
    giftField: document.getElementById('giftField'),
    birthdayNumberToggle: document.getElementById('birthdayNumberToggle'),
    birthdayNumberInput: document.getElementById('birthdayNumberInput'),
    birthdayNumberField: document.getElementById('birthdayNumberField'),
    paperColorInput: document.getElementById('paperColorInput'),
    inkColorInput: document.getElementById('inkColorInput'),
    resetColorsButton: document.getElementById('resetColorsButton'),
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
    const initialTheme = themes[0];

    state.set({
      themes,
      theme: initialTheme,
      to: (initialTheme?.defaults?.to || '').slice(0, 36),
      message: (initialTheme?.defaults?.message || '').slice(0, 280),
      from: (initialTheme?.defaults?.from || '').slice(0, 36),
      fontId: 'fredoka',
      watermark: true,
      mode: 'share',
      giftEnabled: false,
      giftUrl: '',
      birthdayNumberEnabled: false,
      birthdayNumber: '',
      paperOverride: '',
      inkOverride: ''
    });

    createUI({ state, preview, elements });
    elements.exportStatus.textContent = '';
  } catch (err) {
    console.error(err);
    elements.exportStatus.textContent = `Error: ${err.message || err}`;
  }
}

init();
