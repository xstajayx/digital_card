const templateCache = { html: null };

async function loadTemplate() {
  if (templateCache.html) return templateCache.html;
  const response = await fetch('/engine/card-template.html');
  templateCache.html = await response.text();
  return templateCache.html;
}

function applyThemeVars(doc, theme) {
  const root = doc.documentElement;
  const { palette, timing } = theme;
  root.style.setProperty('--paper', palette.paper);
  root.style.setProperty('--ink', palette.ink);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent2', palette.accent2);
  root.style.setProperty('--gold', palette.gold);
  root.style.setProperty('--balloons-duration', `${timing.balloonsMs}ms`);
  root.style.setProperty('--inside-delay', `${timing.insideDelayMs}ms`);
  root.style.setProperty('--headline-delay', `${timing.headlineDelayMs}ms`);
  root.style.setProperty('--sub-delay', `${timing.subDelayMs}ms`);
  root.style.setProperty('--from-delay', `${timing.fromDelayMs}ms`);
  root.style.setProperty('--fx-start', `${timing.fxStartMs}ms`);
  root.style.setProperty('--fx-stop', `${timing.fxStopMs}ms`);
}

export async function createCardController(iframe) {
  const html = await loadTemplate();

  await new Promise((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    iframe.srcdoc = html;
  });

  const doc = iframe.contentDocument;
  const root = doc.getElementById('cardRoot');
  const headlineEl = doc.getElementById('headline');
  const messageEl = doc.getElementById('message');
  const fromEl = doc.getElementById('from');
  const photoEl = doc.getElementById('photo');
  const placeholderEl = doc.getElementById('placeholder');
  const watermarkEl = doc.getElementById('watermark');
  const confettiEl = doc.getElementById('confetti');
  const sparklesEl = doc.getElementById('sparkles');
  const curtainEl = doc.getElementById('balloonCurtain');
  const themeStyles = doc.getElementById('themeStyles');

  return {
    doc,
    root,
    setTheme(theme) {
      applyThemeVars(doc, theme);
      themeStyles.setAttribute('href', `/themes/${theme.id}/theme.css`);
      curtainEl.style.display = theme.features.balloonCurtain ? 'flex' : 'none';
      confettiEl.style.display = theme.features.confetti ? 'block' : 'none';
      sparklesEl.style.display = theme.features.sparkles ? 'block' : 'none';
    },
    setContent({ headline, message, from, photo }) {
      headlineEl.innerHTML = headline;
      messageEl.textContent = message;
      fromEl.textContent = from;
      if (photo) {
        photoEl.src = photo;
        photoEl.style.display = 'block';
        placeholderEl.style.display = 'none';
      } else {
        photoEl.removeAttribute('src');
        photoEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
      }
    },
    setWatermark(enabled) {
      watermarkEl.style.display = enabled ? 'block' : 'none';
    },
    play() {
      root.classList.remove('play');
      void root.offsetWidth;
      root.classList.add('play');
    }
  };
}
