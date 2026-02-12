import { exportGif } from '../engine/export.js';

export async function loadThemes() {
  const exportStatus = document.getElementById('exportStatus');
  let ids = [];

  try {
    const idsRes = await fetch('./themes/themes.json', { cache: 'no-store' });
    if (!idsRes.ok) throw new Error(`Failed to load ./themes/themes.json (${idsRes.status})`);
    ids = await idsRes.json();
  } catch (error) {
    console.error('Theme list load failed for ./themes/themes.json', error);
    if (exportStatus) {
      exportStatus.textContent = 'Unable to load theme list. Check console for details.';
    }
    return [];
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    const message = 'themes/themes.json must be an array of theme folder names.';
    console.error(message);
    if (exportStatus) exportStatus.textContent = message;
    return [];
  }

  const themes = [];
  for (const id of ids) {
    const themeUrl = `./themes/${id}/theme.json`;
    try {
      const themeRes = await fetch(themeUrl, { cache: 'no-store' });
      if (!themeRes.ok) {
        throw new Error(`HTTP ${themeRes.status}`);
      }
      const theme = await themeRes.json();
      if (!theme.id) theme.id = id;
      themes.push(theme);
    } catch (error) {
      console.error(`Theme load failed for ${themeUrl}`, error);
    }
  }

  if (!themes.length && exportStatus) {
    exportStatus.textContent = 'No themes could be loaded. Check console errors for failing URLs.';
  }

  return themes;
}

function greetingFor(theme, name) {
  const safeName = name || 'Friend';
  switch (theme.id) {
    case 'birthday-balloons':
      return `Happy Birthday, <span class="name">${safeName}</span>! 🎉`;
    case 'kids-party':
      return `Party Time, <span class="name">${safeName}</span>! 🥳`;
    case 'thank-you':
      return `Thank you, <span class="name">${safeName}</span>!`;
    case 'love':
      return `All my love, <span class="name">${safeName}</span>! 💖`;
    case 'congrats':
      return `Congratulations, <span class="name">${safeName}</span>! 🎊`;
    case 'christmas':
      return `Merry Christmas, <span class="name">${safeName}</span>! 🎄`;
    default:
      return `${theme.occasion}, <span class="name">${safeName}</span>!`;
  }
}

export function createUI({ state, preview, elements }) {
  const {
    toInput,
    messageInput,
    fromInput,
    photoInput,
    watermarkToggle,
    themeGallery,
    replayButton,
    downloadButton,
    exportStatus,
    previewFrame
  } = elements;

  function renderThemes(current) {
    themeGallery.innerHTML = '';
    current.themes.forEach((theme) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'theme-card';
      if (current.theme && current.theme.id === theme.id) {
        card.classList.add('selected');
      }
      card.innerHTML = `
        <h3>${theme.name}</h3>
        <div class="theme-swatch" style="background: linear-gradient(135deg, ${theme.palette.accent}, ${theme.palette.accent2});"></div>
      `;
      card.addEventListener('click', () => {
        state.set({
          theme,
          to: theme.defaults.to,
          message: theme.defaults.message,
          from: theme.defaults.from
        });
      });
      themeGallery.appendChild(card);
    });
  }

  function updatePreview(current) {
    if (!current.theme) return;
    const headline = greetingFor(current.theme, current.to);
    preview.setTheme(current.theme);
    preview.setContent({
      headline,
      message: current.message,
      from: current.from,
      photo: current.photo
    });
    preview.setWatermark(current.watermark);
    preview.play();
  }

  toInput.addEventListener('input', (event) => {
    state.set({ to: event.target.value });
  });
  messageInput.addEventListener('input', (event) => {
    state.set({ message: event.target.value });
  });
  fromInput.addEventListener('input', (event) => {
    state.set({ from: event.target.value });
  });
  watermarkToggle.addEventListener('change', (event) => {
    state.set({ watermark: event.target.checked });
  });
  photoInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => state.set({ photo: reader.result });
    reader.readAsDataURL(file);
  });

  replayButton.addEventListener('click', () => preview.play());

  downloadButton.addEventListener('click', async () => {
    const current = state.get();
    if (!current.theme) return;

    downloadButton.disabled = true;
    exportStatus.textContent = 'Preparing export...';

    const headline = greetingFor(current.theme, current.to);

    try {
      const blob = await exportGif({
        iframe: previewFrame,
        theme: current.theme,
        content: {
          headline,
          message: current.message,
          from: current.from,
          photo: current.photo
        },
        watermark: current.watermark,
        fps: 14,
        durationMs: Math.max(7000, current.theme.timing.fxStopMs || 8000),
        onProgress: (message) => {
          exportStatus.textContent = message;
        }
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${current.theme.id}-card.gif`;
      anchor.click();
      URL.revokeObjectURL(url);

      exportStatus.textContent = 'Your GIF is ready!';
    } catch (error) {
      console.error(error);
      exportStatus.textContent = `Export failed: ${error.message || error}`;
    } finally {
      downloadButton.disabled = false;
    }
  });

  state.subscribe((current) => {
    renderThemes(current);

    if (toInput.value !== current.to) toInput.value = current.to;
    if (messageInput.value !== current.message) messageInput.value = current.message;
    if (fromInput.value !== current.from) fromInput.value = current.from;

    if (watermarkToggle.checked !== current.watermark) {
      watermarkToggle.checked = current.watermark;
    }

    updatePreview(current);
  });
}
