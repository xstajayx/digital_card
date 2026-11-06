import { catalogueDesign, artPack } from "./catalogue.js";
import { createPhysicalCard } from "./physical-card.js";
import { createOpening } from "./openings/controller.js";
import { illustration, illustrationUrl } from "./illustrations.js";
import { sanitizeGiftUrl } from "./sanitize.js";

const $ = (id) => document.getElementById(id);
const root = $("cardRoot"),
  panel = document.querySelector(".text-panel"),
  card = document.querySelector(".card");
const fonts = {
  fredoka: '"Fredoka", sans-serif',
  pacifico: '"Pacifico", cursive',
  quicksand: '"Quicksand", sans-serif',
  poppins: '"Poppins", sans-serif',
  nunito: '"Nunito", sans-serif',
  playfair: '"Playfair Display", serif',
};
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const glyphs = {
  hearts: "♡",
  flowers: "❀",
  snow: "❄",
  stars: "✦",
  sparkles: "✧",
  balloons: "◒",
  confetti: "✦",
  fade: "·",
};
let data = {},
  version = 0,
  fitTimer = 0,
  runningFit = null,
  themeReady = Promise.resolve(),
  settleTheme,
  themeError = false;
let pendingOpening = false,
  animations = [];
const setVar = (key, value) => root.style.setProperty(key, value);
const setText = (id, value) => {
  if ($(id).textContent !== value) $(id).textContent = value;
};

function buildEffects(type) {
  const edges = document.createDocumentFragment(),
    effects = document.createDocumentFragment();
  for (let i = 0; i < 4; i++) {
    const node = document.createElement("span");
    node.textContent = glyphs[type];
    edges.append(node);
  }
  // Deterministic, finite particles; built on design changes only.
  for (let i = 0; i < (type === "fade" ? 0 : 22); i++) {
    const node = document.createElement("span");
    const kind = type === "balloons" && i >= 14 ? "confetti" : type;
    node.className = `particle ${kind}`;
    node.textContent = ["balloons", "confetti"].includes(kind)
      ? ""
      : glyphs[kind];
    node.style.left = `${(i * 37 + 7) % 94}%`;
    node.style.top = type === "snow" ? "-5%" : "100%";
    effects.append(node);
  }
  $("edgeDecor").replaceChildren(edges);
  $("openingEffects").replaceChildren(effects);
}
function stopAnimations() {
  animations.forEach((a) => a.cancel());
  animations = [];
}
const openingController = createOpening(root);
const physical = createPhysicalCard(root, card, () => revealEffects());
window.physicalStage = (stage) => physical.preview(stage);
root.addEventListener("physical-layout", () => {
  version++;
  queueFit();
});
function replay() {
  if (physical.enabled) {
    openingController.reset("none", () => {});
    stopAnimations();
    physical.reset();
    return;
  }
  if (
    !openingController.reset(
      data.openingConfig?.type || data.features?.opening,
      revealEffects,
      data.openingConfig || {},
      data.recipient,
      data.from,
    )
  )
    revealEffects();
}
function revealEffects() {
  stopAnimations();
  root.dataset.replays = String(Number(root.dataset.replays || 0) + 1);
  if (
    (physical.enabled && !data.physicalConfig.effects) ||
    motion.matches ||
    root.dataset.fits !== "true" ||
    typeof card.animate !== "function"
  )
    return;
  if (!physical.enabled)
    animations.push(
      card.animate(
        [
          { opacity: 0, transform: "scale(.98)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 650, easing: "cubic-bezier(.2,.7,.3,1)" },
      ),
    );
  const type = selectedEffect(data);
  $("openingEffects")
    .querySelectorAll(".particle")
    .forEach((node, i) => {
      const snow = type === "snow",
        distance = root.clientHeight + 80;
      animations.push(
        node.animate(
          [
            {
              opacity: 0,
              transform: `translate(0,0) rotate(0deg) scale(${type === "flowers" ? 0.3 : 0.8})`,
            },
            { opacity: 0.8, offset: 0.15 },
            {
              opacity: 0,
              transform: `translate(${(i % 2 ? 1 : -1) * (18 + i)}px,${snow ? distance : -distance}px) rotate(${i % 2 ? 30 : -25}deg) scale(1)`,
            },
          ],
          {
            duration: snow ? 3800 : 2400 + (i % 3) * 250,
            delay: i * 38,
            easing: "ease-out",
          },
        ),
      );
    });
  if (!$("stickerImg").parentElement.hidden)
    animations.push(
      $("stickerImg").animate(
        [
          { transform: "translateY(3px)" },
          { transform: "translateY(-2px)" },
          { transform: "translateY(0)" },
        ],
        { duration: 1800, easing: "ease-in-out" },
      ),
    );
}
motion.addEventListener("change", () => {
  if (motion.matches) stopAnimations();
});

function changeTheme(id) {
  settleTheme?.();
  themeError = false;
  const link = $("themeStyles");
  const cssId = artPack(catalogueDesign(id) || {})?.cssThemeId || id;
  const href = new URL(`../themes/${cssId}/theme.css`, import.meta.url).href;
  // Multiple packs share one layout stylesheet. Assigning the same href is not
  // guaranteed to dispatch another load event; reuse its already loaded sheet.
  if (link.href === href && link.sheet) {
    themeReady = Promise.resolve();
    return;
  }
  themeReady = new Promise((resolve) => {
    settleTheme = resolve;
    link.onload = () => resolve();
    link.onerror = () => {
      themeError = true;
      resolve();
    };
    link.href = href;
  });
}
function queueFit() {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => checkFit().catch(reportFailure), 70);
}
function reportFailure() {
  root.dataset.fits = "false";
  root.dataset.ready = "true";
  $("overflowNotice").hidden = false;
  parent.postMessage(
    {
      type: "card-fit",
      valid: false,
      error: "The card could not finish loading. Please refresh to try again.",
    },
    location.origin,
  );
}
function selectedEffect(card) {
  return card.openingConfig?.effect && card.openingConfig.effect !== "theme"
    ? card.openingConfig.effect
    : card.features?.opening || "fade";
}
window.setCardData = (next) => {
  if (!/^[a-z0-9-]+$/.test(next.themeId)) return;
  const changedTheme = next.themeId !== data.themeId;
  const changedPhysical = !!next.physicalConfig !== !!data.physicalConfig;
  const changedOpening = next.openingConfig?.type !== data.openingConfig?.type;
  const changedEffect = selectedEffect(next) !== selectedEffect(data);
  data = next;
  version++;
  root.dataset.updates = String(Number(root.dataset.updates || 0) + 1);
  if (changedTheme) {
    stopAnimations();
    changeTheme(data.themeId);
    buildEffects(
      Object.hasOwn(glyphs, selectedEffect(data))
        ? selectedEffect(data)
        : "fade",
    );
    pendingOpening = true;
  }
  if (changedEffect && !changedTheme)
    buildEffects(
      Object.hasOwn(glyphs, selectedEffect(data))
        ? selectedEffect(data)
        : "fade",
    );
  if (changedOpening || changedPhysical) pendingOpening = true;
  openingController.configure(
    data.openingConfig || {},
    data.recipient,
    data.from,
  );
  const p = data.palette;
  setVar("--paper", data.paperOverride || p.paper);
  setVar("--ink", data.inkOverride || p.ink);
  for (const key of ["accent", "accent2", "gold"]) setVar(`--${key}`, p[key]);
  setVar("--card-font", fonts[data.fontId] || fonts.fredoka);
  root.dataset.font = data.fontId;
  setText("headline", data.headline || "");
  setText("message", data.message || "");
  setText("from", data.from || "");
  $("ageMark").hidden = !data.milestone || !data.birthdayNumber;
  setText("ageMark", data.birthdayNumber || "");
  const item = illustration(data.themeId, data.stickerId),
    image = $("stickerImg");
  image.parentElement.hidden = !item;
  if (item) {
    const src = illustrationUrl(item);
    if (image.src !== src) image.src = src;
    image.alt = item.label;
  } else image.removeAttribute("src");
  const gift = sanitizeGiftUrl(data.giftUrl);
  $("giftBlock").hidden = !gift;
  if (gift) {
    $("giftButton").href = gift;
    setText("giftDomain", new URL(gift).hostname.replace(/^www\./, ""));
  } else $("giftButton").removeAttribute("href");
  $("watermark").hidden = !data.watermark;
  physical.update(data);
  if (physical.enabled) root.dataset.font = data.physicalConfig.handwriting;
  queueFit();
};
function sizes(size, preferred) {
  setVar("--message-size", `${size / 16}rem`);
  setVar("--signature-size", `${size / 16}rem`);
  setVar("--heading-size", `${Math.max(22, 30 - (preferred - size)) / 16}rem`);
}
function fits() {
  const contained = (element, container) => {
    const a = element.getBoundingClientRect(),
      b = container.getBoundingClientRect();
    return (
      a.top >= b.top - 1 &&
      a.bottom <= b.bottom + 1 &&
      a.left >= b.left - 1 &&
      a.right <= b.right + 1
    );
  };
  return (
    card.scrollHeight <= card.clientHeight + 1 &&
    card.scrollWidth <= card.clientWidth + 1 &&
    panel.scrollHeight <= panel.clientHeight + 1 &&
    panel.scrollWidth <= panel.clientWidth + 1 &&
    [...panel.children]
      .filter((e) => e.getClientRects().length)
      .every(
        (e) => e.scrollWidth <= e.clientWidth + 1 && contained(e, panel),
      ) &&
    [...card.children].filter((e) => !e.hidden).every((e) => contained(e, card))
  );
}
async function measure(generation) {
  await themeReady;
  await document.fonts.load(getComputedStyle($("message")).font);
  if (physical.enabled) {
    await document.fonts.load(getComputedStyle($("from")).font);
    await physical.readyFonts();
  }
  await document.fonts.ready;
  if (generation !== version) return;
  if (themeError) throw new Error("Design stylesheet unavailable.");
  const preferred = [14, 16, 18, 20].includes(data.textSize)
    ? data.textSize
    : 18;
  let size = preferred;
  sizes(size, preferred);
  while (!fits() && size > 14) sizes(--size, preferred);
  const valid = fits() && (!physical.enabled || physical.fitCover());
  root.dataset.fits = String(valid);
  root.dataset.ready = "true";
  root.dataset.fitSize = String(size);
  root.dataset.measuredVersion = String(generation);
  $("overflowNotice").hidden = valid;
  parent.postMessage(
    {
      type: "card-fit",
      valid,
      size,
      ...(physical.enabled && !valid
        ? {
            error:
              "The cover or inside page needs more room. Shorten the cover greeting or message, or choose smaller text. Read comfortably preserves every word.",
          }
        : {}),
    },
    location.origin,
  );
  if (pendingOpening) {
    pendingOpening = false;
    replay();
  }
  return valid;
}
async function checkFit() {
  clearTimeout(fitTimer);
  for (;;) {
    const generation = version;
    if (!runningFit || runningFit.generation !== generation)
      runningFit = { generation, promise: measure(generation) };
    const job = runningFit;
    let valid;
    try {
      valid = await job.promise;
    } finally {
      if (runningFit === job) runningFit = null;
    }
    if (generation === version) return valid;
  }
}
window.checkFit = checkFit;
window.play = async () => {
  try {
    await checkFit();
    replay();
  } catch {
    reportFailure();
  }
};
let lastWidth = 0,
  lastHeight = 0;
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  if (width === lastWidth && height === lastHeight) return;
  lastWidth = width;
  lastHeight = height;
  version++;
  if (data.themeId) queueFit();
}).observe(document.documentElement);
