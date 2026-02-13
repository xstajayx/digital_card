// digital_card/app/ui.js
import { sanitizeGiftUrl } from '../engine/sanitize.js';

export async function loadThemes() {
  const exportStatus = document.getElementById('exportStatus');

  try {
    const idsRes = await fetch('./themes/themes.json', { cache: 'no-store' });
    if (!idsRes.ok) throw new Error(`Failed to load ./themes/themes.json (${idsRes.status})`);
    const ids = await idsRes.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('themes/themes.json must be an array of theme folder names.');
    }

    const themes = [];
    for (const id of ids) {
      const themeRes = await fetch(`./themes/${id}/theme.json`, { cache: 'no-store' });
      if (!themeRes.ok) throw new Error(`Failed to load ./themes/${id}/theme.json (${themeRes.status})`);
      const theme = await themeRes.json();
      if (!theme.id) theme.id = id;
      themes.push(theme);
    }
    return themes;
  } catch (err) {
    console.error(err);
    if (exportStatus) exportStatus.textContent = err.message || 'Unable to load themes.';
    return [];
  }
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
    default: return `${theme.occasion || 'Hello'}, <span class="name">${safeName}</span>!`;
  }
}

function base64UrlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildViewerUrl(encoded) {
  const href = location.href.split('?')[0].split('#')[0];
  const dir = href.slice(0, href.lastIndexOf('/') + 1);
  return `${dir}view.html?d=${encoded}`;
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
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Image compression is unavailable.'));

      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Unsupported image format — please choose a JPEG/PNG.'));
    img.src = dataUrl;
  });
}

async function compressImageFile(file) {
  // SAFE-SIDE: Aggressive test settings
  const raw = await readFileAsDataUrl(file);
  // first pass (still decent)
  const pass1 = await compressDataUrl(raw, 420, 0.60);
  // second pass (smaller)
  const pass2 = await compressDataUrl(pass1, 320, 0.50);
  return pass2;
}

async function buildShareUrlAsync(current) {
  const safeGiftUrl = current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : '';

  const payload = {
    v: 1,
    themeId: current.theme.id,
    to: current.to || '',
    message: current.message || '',
    from: current.from || '',
    watermark: !!current.watermark,
    giftUrl: safeGiftUrl,
    photo: current.photo || ''
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));

  // Keep it conservative for WhatsApp/browser URL lengths
  const MAX_LEN = 6000;
  if (encoded.length > MAX_LEN) {
    throw new Error(`Share link too large (${encoded.length} chars). Use a smaller/cropped photo.`);
  }

  return { url: buildViewerUrl(encoded), encodedLen: encoded.length, photoLen: payload.photo.length };
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

  const setStatus = (msg) => { if (exportStatus) exportStatus.textContent = msg || ''; };

  const setButtonsEnabled = (enabled) => {
    if (shareLinkButton) shareLinkButton.disabled = !enabled;
    if (shareWhatsappButton) shareWhatsappButton.disabled = !enabled;
  };

  function renderThemes(current) {
    themeGallery.innerHTML = '';
    current.themes.forEach((theme) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-card';
      if (current.theme && current.theme.id === theme.id) btn.classList.add('selected');

      btn.innerHTML = `
        <h3>${theme.name || theme.id}</h3>
        <div class="theme-swatch" style="background: linear-gradient(135deg, ${theme.palette?.accent || '#999'}, ${theme.palette?.accent2 || '#666'});"></div>
      `;

      btn.addEventListener('click', () => {
        state.set({
          theme,
          to: theme.defaults?.to || '',
          message: theme.defaults?.message || '',
          from: theme.defaults?.from || ''
        });
      });

      themeGallery.appendChild(btn);
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
  toInput.addEventListener('input', (e) => state.set({ to: e.target.value }));
  messageInput.addEventListener('input', (e) => state.set({ message: e.target.value }));
  fromInput.addEventListener('input', (e) => state.set({ from: e.target.value }));
  watermarkToggle.addEventListener('change', (e) => state.set({ watermark: e.target.checked }));

  giftToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    if (giftField) giftField.style.display = enabled ? 'flex' : 'none';
    state.set({ giftEnabled: enabled, giftUrl: enabled ? (state.get().giftUrl || '') : '' });
  });

  giftInput.addEventListener('input', (e) => {
    const typed = e.target.value;
    const safe = sanitizeGiftUrl(typed);
    state.set({ giftUrl: safe });
    if (typed.trim() && !safe) setStatus('Gift link must be a valid https:// URL.');
  });

  // Photo upload (single clean listener)
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const jobId = ++photoJobId;

    // Hard limit (before reading)
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
      const dataUrl = await compressImageFile(file);
      if (jobId !== photoJobId) return;

      state.set({ photo: dataUrl }); // ✅ THIS is what must persist for sharing
      setStatus(`Photo added ✅ (${dataUrl.length} chars)`);
    } catch (err) {
      console.error(err);
      if (jobId !== photoJobId) return;
      state.set({ photo: '' });
      setStatus(err?.message || 'Could not process photo. Try a different image.');
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
      if (current.photoBusy) return setStatus('Please wait — photo is still processing…');

      setStatus(`Building share… photoLen=${(current.photo || '').length}`);
      const { url, encodedLen } = await buildShareUrlAsync(current);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus(`Link copied ✅ (${encodedLen} chars)`);
      } else {
        setStatus(`Copy this link: ${url}`);
      }
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Unable to build share link.');
    }
  });

  // Share to WhatsApp (no blank page)
  shareWhatsappButton.addEventListener('click', async () => {
    try {
      const current = state.get();
      if (!current.theme) return;
      if (current.photoBusy) return setStatus('Please wait — photo is still processing…');

      setStatus(`Building WhatsApp share… photoLen=${(current.photo || '').length}`);
      const { url } = await buildShareUrlAsync(current);

      const text = `You’ve got a card 🎉 ${url}`;
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;

      // ✅ More reliable than window.open (prevents blank page issues)
      window.location.href = wa;
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Unable to share to WhatsApp.');
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

    if (giftField) giftField.style.display = current.giftEnabled ? 'flex' : 'none';

    setButtonsEnabled(!current.photoBusy);
    updatePreview(current);
  });
}
