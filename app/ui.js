// digital_card/app/ui.js
import { sanitizeGiftUrl } from '../engine/sanitize.js';

/* ---------------------------
   THEMES
---------------------------- */
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

/* ---------------------------
   GREETING
---------------------------- */
function greetingFor(theme, name) {
  const safeName = name || 'Friend';
  switch (theme.id) {
    case 'birthday-balloons': return `Happy Birthday, <span class="name">${safeName}</span>! 🎉`;
    case 'kids-party': return `Party Time, <span class="name">${safeName}</span>! 🥳`;
    case 'thank-you': return `Thank you, <span class="name">${safeName}</span>!`;
    case 'love': return `All my love, <span class="name">${safeName}</span>! 💖`;
    case 'congrats': return `Congratulations, <span class="name">${safeName}</span>! 🎊`;
    case 'christmas': return `Merry Christmas, <span class="name">${safeName}</span>! 🎄`;
    default: return `${theme.occasion || 'Hello'}, <span class="name">${safeName}</span>!`;
  }
}

/* ---------------------------
   URL ENCODE / BUILD
---------------------------- */
function base64UrlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildViewerUrl(encoded) {
  const href = location.href.split('?')[0].split('#')[0];
  const dir = href.slice(0, href.lastIndexOf('/') + 1);
  return `${dir}view.html?d=${encoded}`;
}

/* ---------------------------
   IMAGE HELPERS
---------------------------- */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

// Safer compression (prevents decode quirks on mobile)
function compressDataUrl(dataUrl, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      try {
        if (img.decode) {
          try { await img.decode(); } catch {}
        }

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

        // JPEG yields smaller payloads for URLs
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(new Error('Could not compress image.'));
      }
    };

    img.onerror = () => reject(new Error('Unsupported image format — please choose a JPEG/PNG.'));
    img.src = dataUrl;
  });
}

async function compressImageFile(file, maxSide, quality) {
  const dataUrl = await readFileAsDataUrl(file);
  return compressDataUrl(dataUrl, maxSide, quality);
}

/* ---------------------------
   SHARE PAYLOAD
---------------------------- */
async function buildShareUrlAsync(current, state) {
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

  // Practical limit (WhatsApp + browsers get unreliable when huge)
  const MAX_LEN = 6500;

  let encoded = base64UrlEncode(JSON.stringify(payload));

  // Multi-pass shrink if needed
  if (encoded.length > MAX_LEN && payload.photo) {
    const pass2 = await compressDataUrl(payload.photo, 420, 0.60);
    payload.photo = pass2;
    try { state.set({ photo: pass2 }); } catch {}
    encoded = base64UrlEncode(JSON.stringify(payload));
  }

  if (encoded.length > MAX_LEN && payload.photo) {
    const pass3 = await compressDataUrl(payload.photo, 320, 0.52);
    payload.photo = pass3;
    try { state.set({ photo: pass3 }); } catch {}
    encoded = base64UrlEncode(JSON.stringify(payload));
  }

  if (encoded.length > MAX_LEN) {
    throw new Error('Photo still too large to share by link. Use a smaller/cropped photo.');
  }

  return { url: buildViewerUrl(encoded), encodedLen: encoded.length };
}

/* ---------------------------
   UI
---------------------------- */
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
    if (exportStatus) exportStatus.textContent = msg || '';
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
          to: theme.defaults?.to || '',
          message: theme.defaults?.message || '',
          from: theme.defaults?.from || ''
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

  /* Inputs */
  toInput.addEventListener('input', (e) => state.set({ to: e.target.value }));
  messageInput.addEventListener('input', (e) => state.set({ message: e.target.value }));
  fromInput.addEventListener('input', (e) => state.set({ from: e.target.value }));
  watermarkToggle.addEventListener('change', (e) => state.set({ watermark: e.target.checked }));

  giftToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    if (giftField) giftField.style.display = enabled ? 'flex' : 'none';
    if (!enabled) {
      state.set({ giftEnabled: false, giftUrl: '' });
    } else {
      state.set({ giftEnabled: true });
    }
  });

  giftInput.addEventListener('input', (e) => {
    const typed = e.target.value;
    const safe = sanitizeGiftUrl(typed);
    state.set({ giftUrl: safe });
    if (typed.trim() && !safe) setStatus('Gift link must be a valid https:// URL.');
  });

  /* Photo */
  photoInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const jobId = ++photoJobId;

    // immediate UI response
    setButtonsEnabled(false);
    setStatus('Optimising photo…');

    if (file.size > 2 * 1024 * 1024) {
      state.set({ photo: '', photoBusy: false });
      setButtonsEnabled(true);
      setStatus('Photo must be 2MB or smaller.');
      photoInput.value = '';
      return;
    }

    try {
      state.set({ photoBusy: true });

      const dataUrl = await compressImageFile(file, 640, 0.72);
      if (jobId !== photoJobId) return;

      state.set({ photo: dataUrl });
      setStatus('Photo added ✅');
    } catch (error) {
      if (jobId !== photoJobId) return;

      try { state.set({ photo: '' }); } catch {}
      const msg =
        error?.message === 'Unsupported image format — please choose a JPEG/PNG.'
          ? error.message
          : 'Could not process photo. Try a different image.';
      setStatus(msg);
    } finally {
      if (jobId === photoJobId) {
        try { state.set({ photoBusy: false }); } catch {}
      }
      setButtonsEnabled(true);
    }
  });

  /* Replay */
  const replay = () => preview.play();
  replayButton.addEventListener('click', replay);
  replayButtonInline.addEventListener('click', replay);

  /* Share Link */
  shareLinkButton.addEventListener('click', async () => {
    setStatus('Share clicked…');

    try {
      const current = state.get();
      if (!current.theme) return;

      if (current.photoBusy) {
        setStatus('Please wait — photo is still processing…');
        return;
      }

      setStatus('Building share link…');
      const { url, encodedLen } = await buildShareUrlAsync(current, state);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus(`Share link copied! (${encodedLen} chars)`);
      } else {
        setStatus(`Clipboard unavailable. Copy this link: ${url}`);
      }
    } catch (error) {
      console.error('Share link failed:', error);
      setStatus(error.message || 'Unable to build share link.');
    }
  });

  /* Share WhatsApp */
  shareWhatsappButton.addEventListener('click', async () => {
    // open immediately (keeps click gesture)
    const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');

    setStatus('Share clicked…');

    try {
      const current = state.get();
      if (!current.theme) {
        if (popup) popup.close();
        return;
      }

      if (current.photoBusy) {
        setStatus('Please wait — photo is still processing…');
        if (popup) popup.close();
        return;
      }

      setStatus('Building share link…');
      const { url } = await buildShareUrlAsync(current, state);

      const waUrl = `https://wa.me/?text=${encodeURIComponent(`You’ve got a card 🎉 ${url}`)}`;

      if (popup && !popup.closed) {
        popup.location.href = waUrl;
      } else {
        location.href = waUrl;
      }

      setStatus('Opening WhatsApp…');
    } catch (error) {
      console.error('WhatsApp share failed:', error);
      setStatus(error.message || 'Unable to build share link.');
      if (popup && !popup.closed) popup.close();
    }
  });

  /* State */
  state.subscribe((current) => {
    renderThemes(current);

    if (toInput.value !== current.to) toInput.value = current.to;
    if (messageInput.value !== current.message) messageInput.value = current.message;
    if (fromInput.value !== current.from) fromInput.value = current.from;

    if (giftInput.value !== (current.giftUrl || '')) giftInput.value = current.giftUrl || '';
    if (watermarkToggle.checked !== !!current.watermark) watermarkToggle.checked = !!current.watermark;
    if (giftToggle.checked !== !!current.giftEnabled) giftToggle.checked = !!current.giftEnabled;

    if (giftField) giftField.style.display = current.giftEnabled ? 'flex' : 'none';

    setButtonsEnabled(!current.photoBusy);

    updatePreview(current);
  });
}
