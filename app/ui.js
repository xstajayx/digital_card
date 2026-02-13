// digital_card/app/ui.js
import { sanitizeGiftUrl } from '../engine/sanitize.js';

export async function loadThemes() {
  const exportStatus = document.getElementById('exportStatus');
  let ids = [];

  try {
    const idsRes = await fetch('./themes/themes.json', { cache: 'no-store' });
    if (!idsRes.ok) throw new Error(`Failed to load ./themes/themes.json (${idsRes.status})`);
    ids = await idsRes.json();
  } catch (error) {
    console.error('Theme list load failed for ./themes/themes.json', error);
    if (exportStatus) exportStatus.textContent = 'Unable to load theme list. Check console for details.';
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
      if (!themeRes.ok) throw new Error(`HTTP ${themeRes.status}`);
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
    case 'birthday-balloons': return `Happy Birthday, <span class="name">${safeName}</span>! 🎉`;
    case 'kids-party': return `Party Time, <span class="name">${safeName}</span>! 🥳`;
    case 'thank-you': return `Thank you, <span class="name">${safeName}</span>!`;
    case 'love': return `All my love, <span class="name">${safeName}</span>! 💖`;
    case 'congrats': return `Congratulations, <span class="name">${safeName}</span>! 🎊`;
    case 'christmas': return `Merry Christmas, <span class="name">${safeName}</span>! 🎄`;
    default: return `${theme.occasion}, <span class="name">${safeName}</span>!`;
  }
}

function base64UrlEncode(str) {
  // Safe unicode base64
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
      const scale = Math.min(1, maxSide / longest);
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Image compression is unavailable.'));

      ctx.drawImage(img, 0, 0, width, height);

      // Always output JPEG for smallest size
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Unsupported image format — please choose a JPEG/PNG.'));
    img.src = dataUrl;
  });
}

async function compressImageFile(file, maxSide, quality) {
  const dataUrl = await readFileAsDataUrl(file);
  return compressDataUrl(dataUrl, maxSide, quality);
}

function buildViewerUrl(encoded) {
  const href = location.href.split('?')[0].split('#')[0];
  const dir = href.slice(0, href.lastIndexOf('/') + 1);
  return `${dir}view.html?d=${encoded}`;
}

/**
 * SAFE MVP SETTINGS (for debugging / proof of concept)
 * - very conservative URL max length
 * - aggressive photo compression
 * - will drop photo if still too big (but card still shares)
 */
async function buildShareUrlAsync(current) {
  const safeGiftUrl = current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : '';

  const payload = {
    v: 1,
    themeId: current.theme.id,
    to: current.to,
    message: current.message,
    from: current.from,
    watermark: current.watermark,
    giftUrl: safeGiftUrl,
    photo: current.photo || ''
  };

  // Conservative limit for WhatsApp / mobile
  const MAX_LEN = 4500;

  const encodePayload = (p) => base64UrlEncode(JSON.stringify(p));

  let encoded = encodePayload(payload);

  // If too long and we have a photo: compress HARD for sharing
  let droppedPhoto = false;

  if (encoded.length > MAX_LEN && payload.photo) {
    payload.photo = await compressDataUrl(payload.photo, 320, 0.50);
    encoded = encodePayload(payload);
  }
  if (encoded.length > MAX_LEN && payload.photo) {
    payload.photo = await compressDataUrl(payload.photo, 256, 0.45);
    encoded = encodePayload(payload);
  }
  if (encoded.length > MAX_LEN && payload.photo) {
    payload.photo = await compressDataUrl(payload.photo, 220, 0.40);
    encoded = encodePayload(payload);
  }

  // If STILL too long: drop photo for share
  if (encoded.length > MAX_LEN && payload.photo) {
    payload.photo = '';
    droppedPhoto = true;
    encoded = encodePayload(payload);
  }

  if (encoded.length > MAX_LEN) {
    throw new Error('Card is still too large to share. Shorten the message and try again.');
  }

  return {
    url: buildViewerUrl(encoded),
    encodedLen: encoded.length,
    droppedPhoto
  };
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

  let photoJobId = 0;

  function setStatus(msg) {
    if (exportStatus) exportStatus.textContent = msg;
  }

  function setButtonsEnabled(enabled) {
    if (shareLinkButton) shareLinkButton.disabled = !enabled;
    if (shareWhatsappButton) shareWhatsappButton.disabled = !enabled;
  }

  function renderThemes(current) {
    themeGallery.innerHTML = '';
    current.themes.forEach((theme) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'theme-card';
      if (current.theme && current.theme.id === theme.id) card.classList.add('selected');

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

    preview.setTheme(current.theme);
    preview.setContent({
      headline: greetingFor(current.theme, current.to),
      message: current.message,
      from: current.from,
      photo: current.photo,
      giftUrl: current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : ''
    });
    preview.setWatermark(current.watermark);
    preview.play();
  }

  // Inputs
  toInput.addEventListener('input', (event) => state.set({ to: event.target.value }));
  messageInput.addEventListener('input', (event) => state.set({ message: event.target.value }));
  fromInput.addEventListener('input', (event) => state.set({ from: event.target.value }));
  watermarkToggle.addEventListener('change', (event) => state.set({ watermark: event.target.checked }));

  giftToggle.addEventListener('change', (event) => {
    const enabled = event.target.checked;
    giftField.style.display = enabled ? 'flex' : 'none';
    if (!enabled) {
      state.set({ giftEnabled: false, giftUrl: '' });
      return;
    }
    state.set({ giftEnabled: true });
  });

  giftInput.addEventListener('input', (event) => {
    const typedValue = event.target.value;
    const safe = sanitizeGiftUrl(typedValue);
    state.set({ giftUrl: safe });
    if (typedValue.trim() && !safe) {
      setStatus('Gift link must be a valid https:// URL.');
    }
  });

  // Photo upload (aggressive compression for test)
  photoInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const jobId = ++photoJobId;

    // hard size limit (input file)
    if (file.size > 2 * 1024 * 1024) {
      state.set({ photo: '', photoBusy: false });
      setButtonsEnabled(true);
      setStatus('Photo must be 2MB or smaller.');
      photoInput.value = '';
      return;
    }

    state.set({ photoBusy: true });
    setButtonsEnabled(false);
    setStatus('Optimising photo…');

    try {
      // ✅ VERY LOW for test: 420px + 0.60
      // (Preview will still look OK in a small card)
      const dataUrl = await compressImageFile(file, 420, 0.60);

      if (jobId !== photoJobId) return;

      state.set({ photo: dataUrl });
      setStatus(`Photo added ✅ (${dataUrl.length} chars)`);
    } catch (error) {
      if (jobId !== photoJobId) return;
      state.set({ photo: '' });
      setStatus(
        error?.message === 'Unsupported image format — please choose a JPEG/PNG.'
          ? error.message
          : 'Could not process photo. Try a different image.'
      );
    } finally {
      if (jobId === photoJobId) {
        state.set({ photoBusy: false });
        setButtonsEnabled(true);
      }
    }
  });

  // Replay
  const replay = () => preview.play();
  replayButton.addEventListener('click', replay);
  replayButtonInline.addEventListener('click', replay);

  // Share Link
  shareLinkButton.addEventListener('click', async () => {
    try {
      const current = state.get();
      if (!current.theme) return;

      if (current.photoBusy) {
        setStatus('Please wait — photo is still processing…');
        return;
      }

      setStatus('Building share link…');

      const { url, encodedLen, droppedPhoto } = await buildShareUrlAsync(current);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus(`Share link copied! (payload: ${encodedLen} chars)${droppedPhoto ? ' — photo removed for sharing' : ''}`);
      } else {
        setStatus(`Copy this link: ${url}`);
      }
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Unable to build share link.');
    }
  });

  // Share WhatsApp (no popup)
  shareWhatsappButton.addEventListener('click', async () => {
    try {
      const current = state.get();
      if (!current.theme) return;

      if (current.photoBusy) {
        setStatus('Please wait — photo is still processing…');
        return;
      }

      setStatus('Building WhatsApp message…');

      const { url, encodedLen, droppedPhoto } = await buildShareUrlAsync(current);

      const text = `You’ve got a card 🎉 ${url}`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

      // ✅ Avoid blank popup tab behaviour
      window.location.href = waUrl;

      // Might not display because navigation happens immediately
      setStatus(`Opening WhatsApp… (payload: ${encodedLen} chars)${droppedPhoto ? ' — photo removed for sharing' : ''}`);
    } catch (error) {
      console.error(error);
      setStatus(error.message || 'Unable to share to WhatsApp.');
    }
  });

  // Subscribe
  state.subscribe((current) => {
    renderThemes(current);

    if (toInput.value !== current.to) toInput.value = current.to;
    if (messageInput.value !== current.message) messageInput.value = current.message;
    if (fromInput.value !== current.from) fromInput.value = current.from;
    if (giftInput.value !== current.giftUrl) giftInput.value = current.giftUrl;

    if (watermarkToggle.checked !== current.watermark) watermarkToggle.checked = current.watermark;
    if (giftToggle.checked !== current.giftEnabled) giftToggle.checked = current.giftEnabled;

    giftField.style.display = current.giftEnabled ? 'flex' : 'none';

    setButtonsEnabled(!current.photoBusy);

    updatePreview(current);
  });
}
