// digital_card/app/ui.js
import { sanitizeGiftUrl } from '../engine/sanitize.js';
import { exportGif } from '../engine/export.js';

const MAX_SHARE_URL_CHARS = 3000;
const TO_MAX_LEN = 36;
const FROM_MAX_LEN = 36;
const DEFAULT_MESSAGE_MAX_LEN = 180;
const BIRTHDAY_SHARE_MESSAGE_MAX_LEN = 420;

const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_MAX_SIDE_1 = 420;
const PHOTO_QUALITY_1 = 0.60;

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

function buildViewerUrl(encoded) {
  const href = location.href.split('?')[0].split('#')[0];
  const dir = href.slice(0, href.lastIndexOf('/') + 1);
  return `${dir}view.html?d=${encoded}`;
}


function getMaxMessageLength(current) {
  if (current?.mode === 'share' && current?.theme?.id === 'birthday-balloons') {
    return BIRTHDAY_SHARE_MESSAGE_MAX_LEN;
  }
  return DEFAULT_MESSAGE_MAX_LEN;
}

async function buildShareUrlAsync(current) {
  const safeGiftUrl = current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : '';

  const maxLen = getMaxMessageLength(current);
  const safeMsg = (current.message || '').slice(0, maxLen);

  const payload = {
    v: 1,
    themeId: current.theme.id,
    to: current.to || '',
    message: safeMsg,
    from: current.from || '',
    watermark: !!current.watermark,
    giftEnabled: !!current.giftEnabled,
    giftUrl: safeGiftUrl,
    fontId: current.fontId || 'fredoka',
    photo: current.mode === 'share' ? '' : (current.photo || '')
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const url = buildViewerUrl(encoded);

  if (url.length > MAX_SHARE_URL_CHARS) {
    throw new Error(
      `This card is too large to share by link (URL ${url.length} chars, limit ${MAX_SHARE_URL_CHARS}). ` +
      'Please shorten your message or gift link.'
    );
  }

  return { url, payloadLen: encoded.length };
}

export function createUI({ state, preview, elements }) {
  const {
    toInput,
    messageInput,
    fromInput,
    fontSelect,
    photoInput,
    watermarkToggle,
    giftToggle,
    giftInput,
    giftField,
    themeGallery,
    replayButton,
    replayButtonInline,
    createGifButton,
    shareLinkButton,
    shareWhatsappButton,
    exportStatus,
    previewFrame,
    modeShareButton,
    modeGifButton,
    gifResult,
    gifPreviewImage,
    downloadGifLink
  } = elements;

  let photoJobId = 0;
  let gifUrl = '';

  function setStatus(msg) {
    if (exportStatus) exportStatus.textContent = msg || '';
  }

  function resetGifResult() {
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    gifUrl = '';
    if (gifPreviewImage) gifPreviewImage.removeAttribute('src');
    if (downloadGifLink) downloadGifLink.removeAttribute('href');
    if (gifResult) gifResult.hidden = true;
  }

  function setShareEnabled(enabled) {
    if (shareLinkButton) shareLinkButton.disabled = !enabled;
    if (shareWhatsappButton) shareWhatsappButton.disabled = !enabled;
  }

  function renderMode(current) {
    const isShare = current.mode !== 'gif';

    modeShareButton?.classList.toggle('is-active', isShare);
    modeGifButton?.classList.toggle('is-active', !isShare);

    updateModeUI(current.mode);

    giftToggle?.closest('label')?.classList.toggle('is-hidden', !isShare);
    giftField?.classList.toggle('is-hidden', !isShare || !current.giftEnabled);
    document.querySelector('.gift-hint')?.classList.toggle('is-hidden', !isShare);

    if (isShare) {
      resetGifResult();
    }
  }

  function updateModeUI(mode) {
    const isGif = mode === 'gif';
    const photoField = photoInput?.closest('label');
    if (photoField) photoField.style.display = isGif ? 'flex' : 'none';
    if (shareLinkButton) shareLinkButton.style.display = isGif ? 'none' : 'inline-flex';
    if (shareWhatsappButton) shareWhatsappButton.style.display = isGif ? 'none' : 'inline-flex';
    if (createGifButton) createGifButton.style.display = isGif ? 'inline-flex' : 'none';
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
          to: clampValue(theme?.defaults?.to ?? '', TO_MAX_LEN),
          message: clampValue(theme?.defaults?.message ?? '', getMaxMessageLength({ mode: state.get().mode, theme })),
          from: clampValue(theme?.defaults?.from ?? '', FROM_MAX_LEN)
        });
      });
      themeGallery.appendChild(btn);
    });
  }

  function updatePreview(current) {
    if (!current.theme) return;

    const trimmedMessage = clampValue(current.message, getMaxMessageLength(current));
    const safeGiftUrl = current.mode === 'share' && current.giftEnabled
      ? sanitizeGiftUrl(current.giftUrl || '')
      : '';

    preview.setTheme(current.theme);
    preview.setContent({
      headline: greetingFor(current.theme, current.to),
      message: trimmedMessage,
      from: current.from,
      photo: current.mode === 'gif' ? current.photo : '',
      giftUrl: safeGiftUrl,
      fontId: current.fontId || 'fredoka',
      mode: current.mode || 'share'
    });
    preview.setWatermark(current.watermark);
    preview.play();
  }

  function clampValue(value, maxLen) {
    return (value || '').slice(0, maxLen);
  }

  function updateMessageRemaining(currentLen, maxLen) {
    const remainingEl = document.getElementById('messageRemaining');
    if (!remainingEl) return;
    const remaining = Math.max(0, maxLen - currentLen);
    remainingEl.textContent = `${remaining} characters remaining`;
  }

  toInput.setAttribute('maxlength', String(TO_MAX_LEN));
  fromInput.setAttribute('maxlength', String(FROM_MAX_LEN));
  messageInput.setAttribute('maxlength', String(DEFAULT_MESSAGE_MAX_LEN));

  modeShareButton?.addEventListener('click', () => state.set({ mode: 'share', photo: '' }));
  modeGifButton?.addEventListener('click', () => state.set({ mode: 'gif', giftEnabled: false, giftUrl: '' }));

  toInput.addEventListener('input', (e) => {
    const trimmed = clampValue(e.target.value, TO_MAX_LEN);
    if (e.target.value !== trimmed) e.target.value = trimmed;
    state.set({ to: trimmed });
  });

  messageInput.addEventListener('input', (e) => {
    const typed = e.target.value || '';
    const maxLen = getMaxMessageLength(state.get());
    const trimmed = clampValue(typed, maxLen);
    if (typed !== trimmed) {
      e.target.value = trimmed;
      setStatus('Message trimmed to fit card.');
    }
    updateMessageRemaining(trimmed.length, maxLen);
    state.set({ message: trimmed });
  });

  fromInput.addEventListener('input', (e) => {
    const trimmed = clampValue(e.target.value, FROM_MAX_LEN);
    if (e.target.value !== trimmed) e.target.value = trimmed;
    state.set({ from: trimmed });
  });

  fontSelect?.addEventListener('change', (e) => state.set({ fontId: e.target.value }));

  watermarkToggle.addEventListener('change', (e) => state.set({ watermark: e.target.checked }));

  giftToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    state.set({ giftEnabled: enabled, giftUrl: enabled ? state.get().giftUrl : '' });
  });

  giftInput.addEventListener('input', (e) => {
    const typed = e.target.value;
    const safe = sanitizeGiftUrl(typed);
    state.set({ giftUrl: safe });
    if (typed.trim() && !safe) setStatus('Gift link must be a valid https:// URL.');
  });

  photoInput.addEventListener('change', async (e) => {
    if (state.get().mode !== 'gif') {
      photoInput.value = '';
      state.set({ photo: '' });
      return;
    }

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

    state.set({ photoBusy: true });
    setShareEnabled(false);
    setStatus('Optimising photo…');

    try {
      const dataUrl = await compressImageFile(file, PHOTO_MAX_SIDE_1, PHOTO_QUALITY_1);
      if (jobId !== photoJobId) return;
      state.set({ photo: dataUrl });
      setStatus(`Photo added ✅ (${(dataUrl || '').length} chars)`);
    } catch (err) {
      if (jobId !== photoJobId) return;
      console.error(err);
      state.set({ photo: '' });
      setStatus(err?.message || 'Could not process photo. Try a different image.');
    } finally {
      if (jobId === photoJobId) {
        state.set({ photoBusy: false });
        setShareEnabled(true);
      }
    }
  });

  const replay = () => preview.play();
  replayButton.addEventListener('click', replay);
  replayButtonInline.addEventListener('click', replay);

  createGifButton?.addEventListener('click', async () => {
    const current = state.get();
    if (current.mode !== 'gif') return;

    createGifButton.disabled = true;
    resetGifResult();

    try {
      const blob = await exportGif({
        iframe: previewFrame,
        theme: current.theme,
        content: {
          headline: greetingFor(current.theme, current.to),
          message: current.message,
          from: current.from,
          photo: current.photo
        },
        watermark: current.watermark,
        fps: 10,
        durationMs: 3000,
        onProgress: (msg) => setStatus(msg)
      });

      gifUrl = URL.createObjectURL(blob);
      if (gifPreviewImage) gifPreviewImage.src = gifUrl;
      if (downloadGifLink) {
        downloadGifLink.href = gifUrl;
        downloadGifLink.download = `digital-card-${Date.now()}.gif`;
      }
      if (gifResult) gifResult.hidden = false;
      setStatus('GIF ready ✅');
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'Could not create GIF.');
    } finally {
      createGifButton.disabled = false;
    }
  });

  shareLinkButton.addEventListener('click', async () => {
    try {
      const current = state.get();
      if (!current.theme) return;
      if (current.photoBusy) return setStatus('Please wait — photo is still processing…');

      setStatus('Building share link…');
      const { url, payloadLen } = await buildShareUrlAsync(current);

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus(`Share link ready (payload: ${payloadLen} chars). Copied ✅`);
      } else {
        setStatus(`Share link ready (payload: ${payloadLen} chars). Clipboard unavailable — copy this link:\n${url}`);
      }
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'Unable to build share link.');
    }
  });

  shareWhatsappButton.addEventListener('click', async () => {
    try {
      const current = state.get();
      if (!current.theme) return;
      if (current.photoBusy) return setStatus('Please wait — photo is still processing…');

      setStatus('Building WhatsApp message…');
      const { url, payloadLen } = await buildShareUrlAsync(current);
      const text = `You’ve got a card 🎉 ${url}`;
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(wa, '_blank', 'noopener,noreferrer');

      setStatus(`Share link ready (payload: ${payloadLen} chars). Opening WhatsApp…`);
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'Unable to share to WhatsApp.');
    }
  });

  state.subscribe((current) => {
    renderThemes(current);

    if (toInput.value !== current.to) toInput.value = current.to;
    if (messageInput.value !== current.message) messageInput.value = current.message;
    if (fromInput.value !== current.from) fromInput.value = current.from;
    if (fontSelect && fontSelect.value !== current.fontId) fontSelect.value = current.fontId;
    if (giftInput.value !== current.giftUrl) giftInput.value = current.giftUrl;

    if (watermarkToggle.checked !== current.watermark) watermarkToggle.checked = current.watermark;
    if (giftToggle.checked !== current.giftEnabled) giftToggle.checked = current.giftEnabled;

    setShareEnabled(!current.photoBusy);
    const maxMessageLength = getMaxMessageLength(current);
    messageInput.setAttribute('maxlength', String(maxMessageLength));
    updateMessageRemaining((current.message || '').length, maxMessageLength);

    if (current.mode !== 'gif' && photoInput.value) {
      photoInput.value = '';
    }

    renderMode(current);
    updatePreview(current);
  });
}
