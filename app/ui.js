import { exportGif } from '../engine/export.js';

export async function loadThemes() {
  // ✅ Use relative paths for GitHub Pages repos
  const idsRes = await fetch('./themes/themes.json', { cache: 'no-store' });
  if (!idsRes.ok) throw new Error(`Failed to load ./themes/themes.json (${idsRes.status})`);
  const ids = await idsRes.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('themes/themes.json must be an array of theme folder names.');
  }

  const themes = await Promise.all(
    ids.map(async (id) => {
      const themeRes = await fetch(`./themes/${id}/theme.json`, { cache: 'no-store' });
      if (!themeRes.ok) throw new Error(`Failed to load ./themes/${id}/theme.json (${themeRes.status})`);
      return await themeRes.json();
    })
  );

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

  // ✅ Reliable export size
  const doc = previewFrame.contentDocument;
  const cardEl = doc && doc.querySelector('.card');
  const rect = cardEl ? cardEl.getBoundingClientRect() : previewFrame.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(480, Math.round(rect.height));

  try {
    const blob = await exportGif({
      theme: current.theme,
      content: {
        headline,
        message: current.message,
        from: current.from,
        photo: current.photo
      },
      watermark: current.watermark,
      width,
      height,
      fps: 10,
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
    toInput.value = current.to;
    messageInput.value = current.message;
    fromInput.value = current.from;
    watermarkToggle.checked = current.watermark;
    updatePreview(current);
  });
}
