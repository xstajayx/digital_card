import { sanitizeGiftUrl } from '../engine/sanitize.js';

const MAX_SHARE_URL_CHARS = 3000;
const TO_MAX_LEN = 36;
const FROM_MAX_LEN = 36;
const MESSAGE_MAX_LEN = 280;
const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_MAX_SIDE = 420;
const PHOTO_QUALITY = 0.6;

export async function loadThemes() {
  const res = await fetch('./themes/themes.json', { cache: 'no-store' });
  const ids = await res.json();
  const themes = [];
  for (const id of ids) {
    const themeRes = await fetch(`./themes/${id}/theme.json`, { cache: 'no-store' });
    const theme = await themeRes.json();
    if (!theme.id) theme.id = id;
    themes.push(theme);
  }
  return themes;
}

function birthdaySuffix(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'th';
  const abs = Math.abs(num);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  const last = abs % 10;
  if (last === 1) return 'st';
  if (last === 2) return 'nd';
  if (last === 3) return 'rd';
  return 'th';
}

function greetingFor(theme, name, birthdayNumberEnabled, birthdayNumber) {
  const safeName = name || 'Friend';
  const isBirthdayTheme = String(theme?.id || '').startsWith('birthday');
  const birthdayNumberValue = String(birthdayNumber || '').trim();
  if (isBirthdayTheme && birthdayNumberEnabled && birthdayNumberValue) {
    return `Happy ${birthdayNumberValue}${birthdaySuffix(birthdayNumberValue)} Birthday, <span class="name">${safeName}</span>!`;
  }

  switch (theme?.id) {
    case 'birthday-balloons': return `Happy Birthday, <span class="name">${safeName}</span>! 🎉`;
    case 'kids-party': return `Party Time, <span class="name">${safeName}</span>! 🥳`;
    case 'thank-you': return `Thank you, <span class="name">${safeName}</span>!`;
    case 'love': return `All my love, <span class="name">${safeName}</span>! 💖`;
    case 'congrats': return `Congratulations, <span class="name">${safeName}</span>! 🎊`;
    case 'christmas': return `Merry Christmas, <span class="name">${safeName}</span>! 🎄`;
    default: return `${theme?.occasion || 'Hello'}, <span class="name">${safeName}</span>!`;
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

function clampValue(value, len) {
  return String(value || '').slice(0, len);
}

function normalizeBirthdayNumber(value) {
  if (value === '' || value == null) return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return String(Math.max(1, Math.min(120, Math.round(num))));
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
      if (!ctx) return reject(new Error('Image compression unavailable.'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Unsupported image format.'));
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

async function buildShareUrlAsync(current) {
  const safeGiftUrl = current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : '';
  const birthdayNumber = current.birthdayNumberEnabled ? normalizeBirthdayNumber(current.birthdayNumber) : '';
  const payload = {
    v: 1,
    themeId: current.theme.id,
    to: current.to || '',
    message: clampValue(current.message, MESSAGE_MAX_LEN),
    from: current.from || '',
    watermark: !!current.watermark,
    giftUrl: safeGiftUrl,
    fontId: current.fontId || 'fredoka',
    birthdayNumber: birthdayNumber || '',
    birthdayNumberEnabled: !!current.birthdayNumberEnabled,
    paperOverride: current.paperOverride || '',
    inkOverride: current.inkOverride || '',
    photo: ''
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const url = buildViewerUrl(encoded);
  if (url.length > MAX_SHARE_URL_CHARS) throw new Error('Share link is too long. Shorten message or gift URL.');
  return { url, payloadLen: encoded.length };
}

export function createUI({ state, preview, elements }) {
  const { toInput, messageInput, fromInput, fontSelect, photoInput, watermarkToggle, giftToggle, giftInput, giftField, birthdayNumberToggle, birthdayNumberInput, birthdayNumberField, paperColorInput, inkColorInput, resetColorsButton, themeGallery, replayButton, replayButtonInline, shareLinkButton, shareWhatsappButton, exportStatus } = elements;

  function setStatus(msg) {
    if (exportStatus) exportStatus.textContent = msg || '';
  }

  function renderThemes(current) {
    themeGallery.innerHTML = '';
    current.themes.forEach((theme) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `theme-tile${current.theme?.id === theme.id ? ' is-active' : ''}`;
      button.textContent = theme.name;
      button.addEventListener('click', () => {
        state.set({
          theme,
          to: clampValue(theme.defaults?.to || '', TO_MAX_LEN),
          message: clampValue(theme.defaults?.message || '', MESSAGE_MAX_LEN),
          from: clampValue(theme.defaults?.from || '', FROM_MAX_LEN),
          paperOverride: '',
          inkOverride: ''
        });
      });
      themeGallery.appendChild(button);
    });
  }

  function updateBirthdayUI(current) {
    const isBirthdayTheme = String(current.theme?.id || '').startsWith('birthday');
    const showBirthdayControls = isBirthdayTheme || current.birthdayNumberEnabled;
    birthdayNumberToggle.checked = !!current.birthdayNumberEnabled;
    birthdayNumberField.style.display = showBirthdayControls ? '' : 'none';
    birthdayNumberInput.value = current.birthdayNumber || '';
  }

  function updatePreview(current) {
    if (!current.theme) return;
    preview.setTheme(current.theme);
    preview.setContent({
      headline: greetingFor(current.theme, current.to, current.birthdayNumberEnabled, current.birthdayNumber),
      message: current.message,
      from: current.from,
      giftUrl: current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : '',
      fontId: current.fontId,
      birthdayNumber: current.birthdayNumberEnabled ? normalizeBirthdayNumber(current.birthdayNumber) : '',
      paperOverride: current.paperOverride || '',
      inkOverride: current.inkOverride || '',
      mode: 'share',
      photo: current.photo || ''
    });
    preview.setWatermark(current.watermark);
  }

  toInput.addEventListener('input', (e) => state.set({ to: clampValue(e.target.value, TO_MAX_LEN) }));
  messageInput.addEventListener('input', (e) => state.set({ message: clampValue(e.target.value, MESSAGE_MAX_LEN) }));
  fromInput.addEventListener('input', (e) => state.set({ from: clampValue(e.target.value, FROM_MAX_LEN) }));
  fontSelect.addEventListener('change', (e) => state.set({ fontId: e.target.value }));
  watermarkToggle.addEventListener('change', (e) => state.set({ watermark: e.target.checked }));

  giftToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    state.set({ giftEnabled: enabled, giftUrl: enabled ? state.get().giftUrl : '' });
  });
  giftInput.addEventListener('input', (e) => state.set({ giftUrl: e.target.value }));

  birthdayNumberToggle.addEventListener('change', (e) => state.set({ birthdayNumberEnabled: e.target.checked }));
  birthdayNumberInput.addEventListener('input', (e) => state.set({ birthdayNumber: normalizeBirthdayNumber(e.target.value) }));

  paperColorInput.addEventListener('input', (e) => state.set({ paperOverride: e.target.value }));
  inkColorInput.addEventListener('input', (e) => state.set({ inkOverride: e.target.value }));
  resetColorsButton.addEventListener('click', () => state.set({ paperOverride: '', inkOverride: '' }));

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > UPLOAD_MAX_BYTES) {
      setStatus('Photo must be 2MB or smaller.');
      photoInput.value = '';
      return;
    }

    try {
      state.set({ photoBusy: true });
      const dataUrl = await readFileAsDataUrl(file);
      const compressed = await compressDataUrl(dataUrl, PHOTO_MAX_SIDE, PHOTO_QUALITY);
      state.set({ photo: compressed, photoBusy: false });
      setStatus('Photo added for preview.');
    } catch (err) {
      state.set({ photo: '', photoBusy: false });
      setStatus(err.message || 'Could not process photo.');
    }
  });

  const replay = () => preview.play();
  replayButton.addEventListener('click', replay);
  replayButtonInline.addEventListener('click', replay);

  shareLinkButton.addEventListener('click', async () => {
    try {
      const { url } = await buildShareUrlAsync(state.get());
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus('Share link copied ✅');
      } else {
        setStatus(url);
      }
    } catch (err) {
      setStatus(err.message || 'Could not create share link.');
    }
  });

  shareWhatsappButton.addEventListener('click', async () => {
    try {
      const { url } = await buildShareUrlAsync(state.get());
      window.open(`https://wa.me/?text=${encodeURIComponent(`You’ve got a card 🎉 ${url}`)}`, '_blank', 'noopener,noreferrer');
      setStatus('Opening WhatsApp…');
    } catch (err) {
      setStatus(err.message || 'Could not share to WhatsApp.');
    }
  });

  state.subscribe((current) => {
    renderThemes(current);
    giftField.style.display = current.giftEnabled ? '' : 'none';
    updateBirthdayUI(current);

    toInput.value = current.to || '';
    messageInput.value = current.message || '';
    fromInput.value = current.from || '';
    fontSelect.value = current.fontId || 'fredoka';
    watermarkToggle.checked = !!current.watermark;
    giftToggle.checked = !!current.giftEnabled;
    giftInput.value = current.giftUrl || '';

    const basePaper = current.theme?.palette?.paper || '#fff7f2';
    const baseInk = current.theme?.palette?.ink || '#2b2622';
    paperColorInput.value = current.paperOverride || basePaper;
    inkColorInput.value = current.inkOverride || baseInk;

    const remaining = Math.max(0, MESSAGE_MAX_LEN - (current.message || '').length);
    const counter = document.getElementById('messageRemaining');
    if (counter) counter.textContent = `${remaining} characters remaining`;

    updatePreview(current);
  });
}
