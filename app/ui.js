import { sanitizeGiftUrl } from '../engine/sanitize.js';

const MAX_SHARE_URL_CHARS = 3000;
const TO_MAX_LEN = 36;
const FROM_MAX_LEN = 36;
const MESSAGE_MAX_LEN = 280;

const THEME_STICKER_FALLBACKS = {
  'birthday-balloons': [
    { id: 'cake-pink.png', label: 'Cake (Pink)' },
    { id: 'cake-yellow.png', label: 'Cake (Yellow)' },
    { id: 'cake-blue.png', label: 'Cake (Blue)' },
    { id: 'cake-purple.png', label: 'Cake (Purple)' }
  ],
  love: [
    { id: 'heart-red.png', label: 'Heart (Red)' },
    { id: 'heart-pink.png', label: 'Heart (Pink)' },
    { id: 'heart-purple.png', label: 'Heart (Purple)' },
    { id: 'kiss-black.png', label: 'Kiss (Black)' }
  ],
  christmas: [
    { id: 'tree-green.png', label: 'Tree (Green)' },
    { id: 'bauble-gold.png', label: 'Bauble (Gold)' },
    { id: 'snowflake-white.png', label: 'Snowflake (White)' }
  ],
  'thank-you': [{ id: 'bouquet-pastel.png', label: 'Bouquet' }, { id: 'ribbon-soft.png', label: 'Ribbon' }, { id: 'sparkles-gold.png', label: 'Sparkles' }],
  congrats: [{ id: 'trophy-gold.png', label: 'Trophy' }, { id: 'stars-blue.png', label: 'Stars' }, { id: 'confetti-pop.png', label: 'Confetti Pop' }],
  'kids-party': [{ id: 'balloons-rainbow.png', label: 'Balloons' }, { id: 'hat-party.png', label: 'Party Hat' }, { id: 'animal-bear.png', label: 'Animal' }],
  'mothers-day': [{ id: 'flowers-rose.png', label: 'Flowers' }, { id: 'heart-soft.png', label: 'Heart' }],
  'fathers-day': [{ id: 'tie-blue.png', label: 'Tie' }, { id: 'mug-classic.png', label: 'Mug' }],
  'new-baby': [{ id: 'pram-soft.png', label: 'Pram' }, { id: 'bottle-mint.png', label: 'Bottle' }, { id: 'stars-baby.png', label: 'Stars' }],
  'get-well': [{ id: 'bandage-red.png', label: 'Bandage' }, { id: 'tea-cup.png', label: 'Tea Cup' }, { id: 'heart-heal.png', label: 'Heart' }],
  sorry: [{ id: 'heart-small.png', label: 'Small Heart' }, { id: 'note-soft.png', label: 'Note' }, { id: 'flower-soft.png', label: 'Flower' }],
  'thinking-of-you': [{ id: 'cloud-soft.png', label: 'Cloud' }, { id: 'heart-soft.png', label: 'Heart' }, { id: 'envelope-soft.png', label: 'Envelope' }],
  graduation: [{ id: 'cap-black.png', label: 'Cap' }, { id: 'diploma-white.png', label: 'Diploma' }, { id: 'stars-gold.png', label: 'Stars' }],
  anniversary: [{ id: 'heart-red.png', label: 'Heart' }, { id: 'kiss-pink.png', label: 'Kiss Mark' }],
  'good-luck': [{ id: 'star-gold.png', label: 'Star' }, { id: 'clover-green.png', label: 'Clover' }]
};

const SVG_BY_THEME = {
  birthday: '<g fill="%23f78ec9"><circle cx="120" cy="90" r="40"/><rect x="70" y="90" width="100" height="45" rx="10"/></g><rect x="88" y="58" width="6" height="28" fill="%23ffd56b"/><rect x="116" y="52" width="6" height="34" fill="%236fa8ff"/><rect x="144" y="58" width="6" height="28" fill="%23b985ff"/>',
  love: '<g fill="%23ef4f8f"><path d="M120 170c-4-20-62-42-62-88 0-22 18-40 40-40 16 0 26 8 32 20 6-12 16-20 32-20 22 0 40 18 40 40 0 46-58 68-62 88z"/></g>',
  christmas: '<polygon points="120,34 58,130 92,130 76,176 164,176 148,130 182,130" fill="%2342a95f"/><rect x="108" y="176" width="24" height="24" fill="%23a66b37"/>',
  default: '<g fill="%237f6df2"><circle cx="86" cy="110" r="26"/><circle cx="120" cy="88" r="34"/><circle cx="156" cy="110" r="24"/></g>'
};

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

function normalizeStickerItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') return { id: item, label: item.replace(/\.[^.]+$/, '') };
    if (!item || typeof item !== 'object') return null;
    if (!item.id) return null;
    return { id: String(item.id), label: String(item.label || item.id.replace(/\.[^.]+$/, '')) };
  }).filter(Boolean);
}

function fallbackSvgDataUri(themeId) {
  let key = 'default';
  if (String(themeId).startsWith('birthday')) key = 'birthday';
  else if (themeId === 'love' || themeId === 'anniversary') key = 'love';
  else if (themeId === 'christmas') key = 'christmas';
  const body = SVG_BY_THEME[key] || SVG_BY_THEME.default;
  return `data:image/svg+xml;utf8,${`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 220'><rect width='100%' height='100%' fill='none'/>${body}</svg>`}`;
}

async function loadStickersForTheme(themeId) {
  if (!themeId) return [];
  try {
    const res = await fetch(`./stickers/${themeId}/stickers.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const normalized = normalizeStickerItems(data);
      if (normalized.length) return normalized;
    }
  } catch {
    // fallback below
  }
  return normalizeStickerItems(THEME_STICKER_FALLBACKS[themeId] || []);
}

async function buildShareUrlAsync(current) {
  const safeGiftUrl = current.giftEnabled ? sanitizeGiftUrl(current.giftUrl || '') : '';
  const birthdayNumber = current.birthdayNumberEnabled ? normalizeBirthdayNumber(current.birthdayNumber) : '';
  const stickerValid = current.stickers.some((s) => s.id === current.stickerId);
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
    stickerId: stickerValid ? current.stickerId : ''
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const url = buildViewerUrl(encoded);
  if (url.length > MAX_SHARE_URL_CHARS) throw new Error('Share link is too long. Shorten message or gift URL.');
  return { url };
}

export function createUI({ state, preview, elements }) {
  const {
    toInput, messageInput, fromInput, fontSelect, watermarkToggle, giftToggle, giftInput, giftField,
    birthdayNumberToggle, birthdayNumberInput, birthdayNumberField, paperColorInput, inkColorInput,
    resetColorsButton, themeGallery, stickerGallery, replayButton, replayButtonInline,
    shareLinkButton, shareWhatsappButton, exportStatus
  } = elements;

  let stickerThemeVersion = 0;
  let loadedStickerThemeId = "";

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
      button.addEventListener('click', async () => {
        const stickers = await loadStickersForTheme(theme.id);
        loadedStickerThemeId = theme.id;
        state.set({
          theme,
          stickers,
          stickerId: '',
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

  function renderStickerGallery(current) {
    stickerGallery.innerHTML = '';

    const noneTile = document.createElement('button');
    noneTile.type = 'button';
    noneTile.className = `sticker-tile none-option${!current.stickerId ? ' is-active' : ''}`;
    noneTile.textContent = 'None';
    noneTile.addEventListener('click', () => state.set({ stickerId: '' }));
    stickerGallery.appendChild(noneTile);

    current.stickers.forEach((sticker) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = `sticker-tile${current.stickerId === sticker.id ? ' is-active' : ''}`;
      tile.title = sticker.label;

      const img = document.createElement('img');
      img.alt = sticker.label;
      img.src = `./stickers/${current.theme?.id}/${sticker.id}`;
      img.loading = 'lazy';
      img.onerror = () => { img.src = fallbackSvgDataUri(current.theme?.id); };

      const label = document.createElement('span');
      label.textContent = sticker.label;

      tile.appendChild(img);
      tile.appendChild(label);
      tile.addEventListener('click', () => state.set({ stickerId: sticker.id }));
      stickerGallery.appendChild(tile);
    });
  }

  function updateBirthdayUI(current) {
    const isBirthdayTheme = String(current.theme?.id || '').startsWith('birthday');
    const showBirthdayControls = isBirthdayTheme || current.birthdayNumberEnabled;
    birthdayNumberToggle.checked = !!current.birthdayNumberEnabled;
    birthdayNumberField.style.display = showBirthdayControls ? '' : 'none';
    birthdayNumberInput.value = current.birthdayNumber || '';
  }

  async function ensureStickers(current) {
    if (!current.theme) return;
    if (loadedStickerThemeId === current.theme.id) return;
    if (Array.isArray(current.stickers) && current.stickers.length) {
      loadedStickerThemeId = current.theme.id;
      return;
    }
    const version = ++stickerThemeVersion;
    const stickers = await loadStickersForTheme(current.theme.id);
    if (version !== stickerThemeVersion) return;
    const valid = stickers.some((s) => s.id === current.stickerId);
    loadedStickerThemeId = current.theme.id;
    state.set({ stickers, stickerId: valid ? current.stickerId : '' });
  }

  function updatePreview(current) {
    if (!current.theme) return;
    const validSticker = current.stickers.some((s) => s.id === current.stickerId) ? current.stickerId : '';
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
      stickerId: validSticker,
      themeId: current.theme.id
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
    renderStickerGallery(current);
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
    ensureStickers(current);
  });
}
