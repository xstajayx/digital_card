// digital_card/app/ui.js
import { sanitizeGiftUrl } from '../engine/sanitize.js';
import { recordPreviewGif } from '../engine/recordGif.js';

// =====================
// Option A limits (no backend)
// =====================
// Keep this conservative for WhatsApp + in-app browsers.
// If you want to push it, raise to 3500, but 3000 is safer.
const MAX_SHARE_URL_CHARS = 3000;

// Photo rules (aggressive to fit in URL)
const UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const PHOTO_MAX_SIDE_1 = 420;             // first compress pass
const PHOTO_QUALITY_1 = 0.60;
const PHOTO_MAX_SIDE_2 = 320;             // second pass (if needed)
const PHOTO_QUALITY_2 = 0.50;

// ---------------------
// Themes
// ---------------------
export async function loadThemes() {
  const exportStatus = document.getElementById('exportStatus');

  let ids = [];
  try {
    const idsRes = await fetch('./themes/themes.json', { cache: 'no-store' });
    if (!idsRes.ok) throw new Error(`Failed to load ./themes/themes.json (${idsRes.status})`);
    ids = await idsRes.json();
  } catch (err) {
    console.error('Theme list load failed for ./themes/themes.json', err);
    if (exportStatus) exportStatus.textContent = 'Unable to load theme list. Check console for details.';
    return [];
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    const msg = 'themes/themes.json must be an array of theme folder names.';
    console.error(msg);
    if (exportStatus) exportStatus.textContent = msg;
    return [];
  }

  const themes = [];
  for (const id of ids) {
    const themeUrl = `./themes/${id}/theme.json`;
    try {
      const res = await fetch(themeUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const theme = await res.json();
      if (!theme.id) theme.id = id;
      themes.push(theme);
    } catch (err) {
      console.error(`Theme load failed for ${themeUrl}`, err);
    }
  }

  if (!themes.length && exportStatus) {
    exportStatus.textContent = 'No themes could be loaded. Check console errors for failing URLs.';
  }

  return themes;
}

// ---------------------
// Headline builder
// ---------------------
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

// ---------------------
// URL-safe base64 encode
// ---------------------
function base64UrlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// ---------------------
// Photo helpers
// ---------------------
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read image file.'));
    r.readAsDataURL(file);
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

async function compressImageFile(file, maxSide, quality) {
  const dataUrl = await readFileAsDataUrl(file);
  return compressDataUrl(dataUrl, maxSide, quality);
}

// ---------------------
// Build viewer URL
// ---------------------
function buildViewerUrl(encoded) {
  const href = location.href.split('?')[0].split('#')[0];
  const dir = href.slice(0, href.lastIndexOf('/') + 1);
  return `${dir}view.html?d=${encoded}`;
}

// ---------------------
// Build share URL (Option A: no backend)
// ---------------------
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

  // 1) encode once
  let encoded = base64UrlEncode(JSON.stringify(payload));
  let url = buildViewerUrl(encoded);

  // 2) if too long and we have a photo, re-compress photo harder
  if (url.length > MAX_SHARE_URL_CHARS && payload.photo) {
    payload.photo = await compressDataUrl(payload.photo, PHOTO_MAX_SIDE_2, PHOTO_QUALITY_2);
    encoded = base64UrlEncode(JSON.stringify(payload));
    url = buildViewerUrl(encoded);
  }

  // 3) hard fail if still too big
  if (url.length > MAX_SHARE_URL_CHARS) {
    throw new Error(
      `This card is too large to share by link (URL ${url.length} chars, limit ${MAX_SHARE_URL_CHARS}). ` +
      `Try a different photo, or use a tighter crop.`
    );
  }

  return { url, urlLen: url.length };
}

// ---------------------
// UI
// ---------------------
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
    recordGifButton,
    shareLinkButton,
    shareWhatsappButton,
    exportStatus
  } = elements;

  let photoJobId = 0;

  function setStatus(msg) {
    if (exportStatus) exportStatus.textContent = msg || '';
  }

  function setShareEnabled(enabled) {
    if (shareLinkButton) shareLinkButton.disabled = !enabled;
    if (shareWhatsappButton) shareWhatsappButton.disabled = !enabled;
  }

  function renderThemes(current) {
    themeGallery.innerHTML = '';
    current.themes.forEach((theme) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-card';
      if (current.theme && current.theme.id === theme.id) btn.classList.add('selected');
      btn.innerHTML = `
        <h3>${theme.name}</h3>
        <div class="theme-swatch" style="background: linear-gradient(135deg, ${theme.palette.accent}, ${theme.palette.accent2});"></div>
      `;
      btn.addEventListener('click', () => {
        state.set({
          theme,
          to: theme?.defaults?.to ?? '',
          message: theme?.defaults?.message ?? '',
          from: theme?.defaults?.from ?? ''
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

  // ---- inputs ----
  toInput.addEventListener('input', (e) => state.set({ to: e.target.value }));
  messageInput.addEventListener('input', (e) => state.set({ message: e.target.value }));
  fromInput.addEventListener('input', (e) => state.set({ from: e.target.value }));
  watermarkToggle.addEventListener('change', (e) => state.set({ watermark: e.target.checked }));

  giftToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    giftField.style.display = enabled ? 'flex' : 'none';
    state.set({ giftEnabled: enabled, giftUrl: enabled ? state.get().giftUrl : '' });
  });

  giftInput.addEventListener('input', (e) => {
    const typed = e.target.value;
    const safe = sanitizeGiftUrl(typed);
    state.set({ giftUrl: safe });
    if (typed.trim() && !safe) setStatus('Gift link must be a valid https:// URL.');
  });

  // ---- photo upload (single listener, no duplicates) ----
  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const jobId = ++photoJobId;

    if (file.size > UPLOAD_MAX_BYTES) {
      state.set({ photo: '', photoBusy: false });
      setShareEnabled(true);
      setStatus('Photo must be 2MB or smaller.');
      photoInput.value = '';
      return;
    }

    // lock share while processing
    state.set({ photoBusy: true });
    setShareEnabled(false);
    setStatus('Optimising photo…');

    try {
      // compress once
      let dataUrl = await compressImageFile(file, PHOTO_MAX_SIDE_1, PHOTO_QUALITY_1);
      if (jobId !== photoJobId) return;

      // set photo
      state.set({ photo: dataUrl });

      // quick sanity: show size
      const photoLen = (dataUrl || '').length;
      setStatus(`Photo added ✅ (${photoLen} chars)`);

      // optional: warn if likely too big
      // (final URL can still be okay after encoding, but this is a good hint)
      if (photoLen > 12000) {
        setStatus(`Photo added ✅ (${photoLen} chars) — may be too large to share, we’ll compress again if needed.`);
      }
    } catch (err) {
      if (jobId !== photoJobId) return;
      console.error(err);
      state.set({ photo: '' });
      setStatus(
        err?.message === 'Unsupported image format — please choose a JPEG/PNG.'
          ? err.message
          : 'Could not process photo. Try a different image.'
      );
    } finally {
      if (jobId === photoJobId) {
        state.set({ photoBusy: false });
        setShareEnabled(true);
      }
    }
  });

  // ---- replay ----
  const replay = () => preview.play();
  replayButton.addEventListener('click', replay);
  replayButtonInline.addEventListener('click', replay);

  // ---- Record GIF ----
  if (recordGifButton) {
    recordGifButton.addEventListener('click', async () => {
      recordGifButton.disabled = true;
      try {
        await recordPreviewGif({
          previewFrame: elements.previewFrame,
          preview,
          setStatus
        });
      } catch (err) {
        console.error(err);
        setStatus(err?.message || 'Could not record GIF.');
      } finally {
        recordGifButton.disabled = false;
      }
    });
  }

  // ---- Share: copy link ----
  shareLinkButton.addEventListener('click', async () => {
    try {
      const current = state.get();
      if (!current.theme) return;
      if (current.photoBusy) return setStatus('Please wait — photo is still processing…');

      setStatus('Building share link…');

      const { url, urlLen } = await buildShareUrlAsync(current);

      // copy
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus(`Share link copied ✅ (${urlLen} chars)`);
      } else {
        setStatus(`Clipboard unavailable — copy this link:\n${url}`);
      }
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'Unable to build share link.');
    }
  });

  // ---- Share: WhatsApp ----
  shareWhatsappButton.addEventListener('click', async () => {
    try {
      const current = state.get();
      if (!current.theme) return;
      if (current.photoBusy) return setStatus('Please wait — photo is still processing…');

      setStatus('Building WhatsApp message…');

      const { url, urlLen } = await buildShareUrlAsync(current);

      // IMPORTANT: open directly to wa.me (no intermediate blank page)
      const text = `You’ve got a card 🎉 ${url}`;
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(wa, '_blank', 'noopener,noreferrer');

      setStatus(`Ready to share ✅ (${urlLen} chars)`);
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'Unable to share to WhatsApp.');
    }
  });

  // ---- state subscription ----
  state.subscribe((current) => {
    renderThemes(current);

    // keep inputs in sync
    if (toInput.value !== current.to) toInput.value = current.to;
    if (messageInput.value !== current.message) messageInput.value = current.message;
    if (fromInput.value !== current.from) fromInput.value = current.from;
    if (giftInput.value !== current.giftUrl) giftInput.value = current.giftUrl;

    if (watermarkToggle.checked !== current.watermark) watermarkToggle.checked = current.watermark;
    if (giftToggle.checked !== current.giftEnabled) giftToggle.checked = current.giftEnabled;

    giftField.style.display = current.giftEnabled ? 'flex' : 'none';
    setShareEnabled(!current.photoBusy);

    updatePreview(current);
  });
}
