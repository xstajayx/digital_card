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
    themeGallery: document.getElementById('themeGallery'),
    replayButton: document.getElementById('replayButton'),
    downloadButton: document.getElementById('downloadButton'),
    exportStatus: document.getElementById('exportStatus'),
    previewFrame: document.getElementById('cardPreview')
  };

  const state = createState();
  const preview = await createCardController(elements.previewFrame);

  const themes = await loadThemes();
  const initialTheme = themes[0];

  state.set({
    themes,
    theme: initialTheme,
    to: initialTheme.defaults.to,
    message: initialTheme.defaults.message,
    from: initialTheme.defaults.from,
    watermark: true
  });

  createUI({ state, preview, elements });
}

init();
