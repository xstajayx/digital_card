import { DESIGNS } from "../catalogue/designs.js";
import { EVERGREEN, selectPromotion, nextLondonMidnight } from "../engine/seasonal-banner.js";

const banner = document.getElementById("seasonalBanner");
const heading = banner.querySelector("h1");
const description = banner.querySelector("p");
const link = banner.querySelector("a");
const image = banner.querySelector("img");
const available = new Set(DESIGNS.map(({ occasionId }) => occasionId));
let timer;
let generation = 0;

function show(item) {
  if (banner.dataset.promotion === item.id) return;
  banner.dataset.promotion = item.id;
  heading.textContent = item.headline;
  description.textContent = item.description;
  link.textContent = item.cta;
  link.href = item.href;
  image.alt = item.alt;
  image.src = item.artwork;
}

async function refresh() {
  const request = ++generation;
  const now = Date.now();
  clearTimeout(timer);
  if (!document.hidden) timer = setTimeout(refresh, nextLondonMidnight(now) - now);
  const missingArtwork = new Set();
  let selected = selectPromotion(now, { available });
  if (selected.id === banner.dataset.promotion) return;
  show(EVERGREEN);
  while (selected.id !== EVERGREEN.id) {
    const probe = new Image();
    probe.src = selected.artwork;
    try {
      await probe.decode();
    } catch {
      if (request !== generation) return;
      missingArtwork.add(selected.id);
      selected = selectPromotion(now, { available, missingArtwork });
      continue;
    }
    if (request === generation) show(selected);
    return;
  }
}
document.addEventListener("visibilitychange", refresh);
window.addEventListener("pageshow", refresh);
refresh();
