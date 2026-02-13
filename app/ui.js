// digital_card/app/ui.js
import { sanitizeGiftUrl } from '../engine/sanitize.js';

/* ---------------------------
   THEMES LOADING
----------------------------*/
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
   GREETING / HEADLINE
----------------------------*/
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
   BASE64 URL SAFE
----------------------------*/
function base64UrlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/* ---------------------------
   IMAGE HELPERS
----------------------------*/
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
      if (!ctx) {
        reject(new Error('Image compression is unavailable.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
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

/* ---------------------------
   SHARE URL BUILDING
----------------------------*/
function buildViewerUrl(encoded) {
  const href = location.href.split('?')[0].split('#')[0];
  const dir = href.slice(0, href.lastIndexOf('/') + 1);
  return `${dir}view.html?d=${encoded}`;
}

async function buildShareUrlAsync(current, state) {
  const safeGiftUrl = current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : '';
  const MAX_LEN = 6500;

  const makePayload = (photo) => ({
    v: 1,
    themeId: current.theme.id,
    to: current.to,
    message: current.message,
    from: current.from,
    watermark: current.watermark,
    giftUrl: safeGiftUrl,
    photo: photo || ''
  });

  // Start with current preview photo (already compressed for preview)
  let sharePhoto = current.photo || '';

  // If we have a photo, always make a SHARE-optimised version first
  if (sharePhoto) {
    sharePhoto = await compressDataUrl(sharePhoto, 520, 0.62);

    let testEncoded = base64UrlEncode(JSON.stringify(makePayload(sharePhoto)));
    if (testEncoded.length > MAX_LEN) {
      sharePhoto = await compressDataUrl(sharePhoto, 420, 0.56);
    }

    testEncoded = base64UrlEncode(JSON.stringify(makePayload(sharePhoto)));
    if (testEncoded.length > MAX_LEN) {
      sharePhoto = await compressDataUrl(sharePhoto, 320, 0.50);
    }

    // Optional: keep preview matched to what will be shared
    try { state.set({ photo: sharePhoto }); } catch {}
  }

  // Try with photo
  let encoded = base64UrlEncode(JSON.stringify(makePayload(sharePhoto)));
  if (encoded.length <= MAX_LEN) {
    return { url: buildViewerUrl(encoded), encodedLen: encoded.length, usedPhoto: !!sharePhoto };
  }

  // Fallback: share WITHOUT photo (still shareable)
  encoded = base64UrlEncode(JSON.stringify(makePayload('')));
  if (encoded.length <= MAX_LEN) {
    return { url: buildViewerUrl(encoded), encodedLen: encoded.length, usedPhoto: false };
  }

  throw new Error('Card data is too large to share by link. Shorten the message and remove the photo.');
}

/* ---------------------------
   UI
----------------------------*/
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
        <h3>${theme.name || theme.id}</h3>
        <div class="theme-swatch" style="background: linear-gradient(135deg, ${theme.palette?.accent || '#999'}, ${theme.palette?.accent2 || '#666'});"></div>
      `;

      card.addEventListener('click', () => {
        state.set({
          theme,
          to: theme?.defaults?.to || '',
          message: theme?.defaults?.message || '',
          from: theme?.defaults?.from || ''
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

  // Text fields
  toInput.addEventListener('input', (e) => state.set({ to: e.target.value }));
  messageInput.addEventListener('input', (e) => state.set({ message: e.target.value }));
  fromInput.addEventListener('input', (e) => state.set({ from: e.target.value }));

  // Toggles
  watermarkToggle.addEventListener('change', (e) => state.set({ watermark: e.target.checked }));

  giftToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    giftField.style.display = enabled ? 'flex' : 'none';
    state.set({ giftEnabled: enabled, giftUrl: enabled ? (state.get().giftUrl || '') : '' });
  });

  giftInput.addEventListener('input', (e) => {
    const typed = e.target.value;
    const safe = sanitizeGiftUrl(typed);
    state.set({ giftUrl: safe });
    if (typed.trim() && !safe) setStatus('Gift link must be a valid https:// URL.');
  });

  // Photo upload
  photoInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const jobId = ++photoJobId;

    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      state.set({ photo: '', photoBusy: false });
      setButtonsEnabled(true);
      setStatus('Photo must be 2MB or smaller.');
      photoInput.value = '';
      return;
    }

    setButtonsEnabled(false);
    setStatus('Optimising photo…');
    state.set({ photoBusy: true });

    try {
      // Preview compression (good quality)
      const dataUrl = await compressImageFile(file, 640, 0.72);
      if (jobId !== photoJobId) return;

      state.set({ photo: dataUrl });
      setStatus('Photo added ✅');
    } catch (err) {
      console.error(err);
      if (jobId !== photoJobId) return;
      state.set({ photo: '' });
      setStatus(
        err?.message === 'Unsupported image format — please choose a JPEG/PNG.'
          ? err.message
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

      setButtonsEnabled(false);
      setStatus('Building share link…');

      const { url, encodedLen, usedPhoto } = await buildShareUrlAsync(current, state);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus(
          usedPhoto
            ? `Share link copied! (${encodedLen} chars)`
            : `Share link copied (photo removed to fit). (${encodedLen} chars)`
        );
      } else {
        setStatus(`Clipboard unavailable. Copy this link: ${url}`);
      }
    } catch (err) {
      console.error('Share link failed:', err);
      setStatus(err.message || 'Unable to build share link.');
    } finally {
      setButtonsEnabled(true);
    }
  });

  // Share WhatsApp (no dead blank tab)
  shareWhatsappButton.addEventListener('click', async () => {
    const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');

    if (popup && !popup.closed) {
      popup.document.open();
      popup.document.write(`
        <title>Preparing…</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <body style="font-family:system-ui;padding:18px">
          <h3>Preparing your WhatsApp share…</h3>
          <p>Please wait.</p>
        </body>
      `);
      popup.document.close();
    }

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

      setButtonsEnabled(false);
      setStatus('Building WhatsApp message…');

      const { url, usedPhoto } = await buildShareUrlAsync(current, state);
      const waUrl = `https://wa.me/?text=${encodeURIComponent(`You’ve got a card 🎉 ${url}`)}`;

      if (popup && !popup.closed) popup.location.href = waUrl;
      else window.location.href = waUrl;

      setStatus(usedPhoto ? 'Opening WhatsApp…' : 'Opening WhatsApp (photo removed to fit)…');
    } catch (err) {
      console.error('WhatsApp share failed:', err);
      setStatus(err.message || 'Unable to share to WhatsApp.');

      if (popup && !popup.closed) {
        popup.document.body.innerHTML = `
          <h3>Couldn’t build the share link</h3>
          <p style="color:#666">${(err && err.message) ? err.message : 'Unknown error'}</p>
          <p>You can close this tab and try again.</p>
        `;
        setTimeout(() => { try { popup.close(); } catch {} }, 2500);
      }
    } finally {
      setButtonsEnabled(true);
    }
  });

  // State subscription
  state.subscribe((current) => {
    renderThemes(current);

    if (toInput.value !== current.to) toInput.value = current.to;
    if (messageInput.value !== current.message) messageInput.value = current.message;
    if (fromInput.value !== current.from) fromInput.value = current.from;

    if (giftInput.value !== (current.giftUrl || '')) giftInput.value = current.giftUrl || '';
    if (watermarkToggle.checked !== current.watermark) watermarkToggle.checked = current.watermark;
    if (giftToggle.checked !== current.giftEnabled) giftToggle.checked = current.giftEnabled;

    giftField.style.display = current.giftEnabled ? 'flex' : 'none';
    setButtonsEnabled(!current.photoBusy);

    updatePreview(current);
  });
}
