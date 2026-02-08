<link id="themeStyles" rel="stylesheet" href="" />
<script>
  function setVar(k,v){ document.documentElement.style.setProperty(k, v); }

  function replay(){
    const root = document.getElementById('cardRoot');
    if(!root) return;
    root.classList.remove('play');
    void root.offsetWidth;
    root.classList.add('play');
  }

  window.setCardData = (data) => {
    // Theme CSS
    const themeStyles = document.getElementById('themeStyles');
    if (themeStyles && data.themeCssHref) themeStyles.href = data.themeCssHref;

    // Vars
    const p = data.palette || {};
    const t = data.timing || {};
    if (p.paper) setVar('--paper', p.paper);
    if (p.ink) setVar('--ink', p.ink);
    if (p.accent) setVar('--accent', p.accent);
    if (p.accent2) setVar('--accent2', p.accent2);
    if (p.gold) setVar('--gold', p.gold);

    if (t.balloonsMs != null) setVar('--balloons-duration', `${t.balloonsMs}ms`);
    if (t.insideDelayMs != null) setVar('--inside-delay', `${t.insideDelayMs}ms`);
    if (t.headlineDelayMs != null) setVar('--headline-delay', `${t.headlineDelayMs}ms`);
    if (t.subDelayMs != null) setVar('--sub-delay', `${t.subDelayMs}ms`);
    if (t.fromDelayMs != null) setVar('--from-delay', `${t.fromDelayMs}ms`);
    if (t.fxStartMs != null) setVar('--fx-start', `${t.fxStartMs}ms`);
    if (t.fxStopMs != null) setVar('--fx-stop', `${t.fxStopMs}ms`);

    // Content
    const headlineEl = document.getElementById('headline');
    const messageEl  = document.getElementById('message');
    const fromEl     = document.getElementById('from');
    const photoEl    = document.getElementById('photo');
    const placeholderEl = document.getElementById('placeholder');

    if (headlineEl) headlineEl.innerHTML = data.headline || '';
    if (messageEl) messageEl.textContent = data.message || '';
    if (fromEl) fromEl.textContent = data.from || '';

    if (photoEl && placeholderEl) {
      if (data.photoDataUrl) {
        photoEl.src = data.photoDataUrl;
        photoEl.style.display = 'block';
        placeholderEl.style.display = 'none';
      } else {
        photoEl.removeAttribute('src');
        photoEl.style.display = 'none';
        placeholderEl.style.display = 'flex';
      }
    }

    // Features / watermark
    const wm = document.getElementById('watermark');
    if (wm) wm.style.display = data.watermark ? 'block' : 'none';

    const f = data.features || {};
    const curtain = document.getElementById('balloonCurtain');
    const confetti = document.getElementById('confetti');
    const sparkles = document.getElementById('sparkles');
    if (curtain) curtain.style.display = f.balloonCurtain ? 'flex' : 'none';
    if (confetti) confetti.style.display = f.confetti ? 'block' : 'none';
    if (sparkles) sparkles.style.display = f.sparkles ? 'block' : 'none';

    replay();
  };

  window.play = replay;
</script>
