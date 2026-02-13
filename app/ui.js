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

function base64UrlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}


function base64UrlDecode(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  return decodeURIComponent(escape(atob(b64 + pad)));
}

function buildShareUrl(current, exportStatus) {
  const payload = {
    v: 1,
    themeId: current.theme.id,
    to: current.to,
    message: current.message,
    from: current.from,
    watermark: current.watermark,
    giftUrl: current.giftEnabled ? (current.giftUrl || '') : '',
    photo: current.photo || ''
  };

  let encoded = base64UrlEncode(JSON.stringify(payload));

  if (encoded.length > 3500 && payload.photo) {
    payload.photo = '';
    payload.photoOmitted = true;
    encoded = base64UrlEncode(JSON.stringify(payload));
    exportStatus.textContent = 'Photo too large for link — shared without photo.';
  }

  const base = location.href.split('?')[0].split('#')[0];
  const dir = base.substring(0, base.lastIndexOf('/') + 1);
  return `${dir}view.html?d=${encoded}`;
}

export function createUI({ state, preview, elements }) {
  const {
    toInput,
    messageInput,
    fromInput,
    photoInput,
    watermarkToggle,
    giftToggle,
    giftInput,
    giftField,
    themeGallery,
    replayButton,
    replayButtonInline,
    shareLinkButton,
    shareWhatsappButton,
    exportStatus
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
      photo: current.photo,
      giftUrl: current.giftEnabled ? current.giftUrl : ''
    });
    preview.setWatermark(current.watermark);
    preview.play();
  }

  toInput.addEventListener('input', (event) => state.set({ to: event.target.value }));
  messageInput.addEventListener('input', (event) => state.set({ message: event.target.value }));
  fromInput.addEventListener('input', (event) => state.set({ from: event.target.value }));
  watermarkToggle.addEventListener('change', (event) => state.set({ watermark: event.target.checked }));

  giftToggle.addEventListener('change', (event) => {
    if (event.target.checked) {
      giftField.style.display = 'flex';
      state.set({ giftEnabled: true });
      return;
    }

    giftField.style.display = 'none';
    state.set({ giftEnabled: false, giftUrl: '' });
  });

  giftInput.addEventListener('input', (event) => {
    state.set({ giftUrl: event.target.value.trim() });
  });

  photoInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => state.set({ photo: reader.result });
    reader.readAsDataURL(file);
  });

  const replay = () => preview.play();
  replayButton.addEventListener('click', replay);
  replayButtonInline.addEventListener('click', replay);

  shareLinkButton.addEventListener('click', async () => {
    const current = state.get();
    if (!current.theme) return;

    const url = buildShareUrl(current, exportStatus);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        exportStatus.textContent = 'Share link copied!';
      } else {
        exportStatus.textContent = `Copy this link: ${url}`;
      }
    } catch (error) {
      exportStatus.textContent = `Copy this link: ${url}`;
    }
  });

  shareWhatsappButton.addEventListener('click', () => {
    const current = state.get();
    if (!current.theme) return;

    const url = buildShareUrl(current, exportStatus);
    const wa = `https://wa.me/?text=${encodeURIComponent('You’ve got a card 🎉 ' + url)}`;
    window.open(wa, '_blank', 'noopener');
    exportStatus.textContent = 'Opening WhatsApp…';
  });

  state.subscribe((current) => {
    renderThemes(current);

    if (toInput.value !== current.to) toInput.value = current.to;
    if (messageInput.value !== current.message) messageInput.value = current.message;
    if (fromInput.value !== current.from) fromInput.value = current.from;
    if (giftInput.value !== current.giftUrl) giftInput.value = current.giftUrl;

    if (watermarkToggle.checked !== current.watermark) {
      watermarkToggle.checked = current.watermark;
    }

    if (giftToggle.checked !== current.giftEnabled) {
      giftToggle.checked = current.giftEnabled;
    }
    giftField.style.display = current.giftEnabled ? 'flex' : 'none';

    updatePreview(current);
  });
}
