import { renderFlowers } from "../engine/flowers/render.js";

export function noteContent(container, gift) {
  for (const part of ["greeting", "message", "signature"]) {
    const node = container.querySelector(`[data-note="${part}"]`);
    node.textContent = gift[part];
    node.hidden = gift[part] === "";
  }
}

export function flowerPresentation(root, product, gift, { opened = false, onOpen = () => {} } = {}) {
  const art = root.querySelector("[data-art]");
  const note = root.querySelector("[data-letter]");
  const action = root.querySelector("button[data-bloom]");
  const status = root.querySelector("[data-status]");
  const title = root.querySelector("[data-title]");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const plural = product.kind === "bouquet" || product.heads[0].species !== "rose";
  title.textContent = plural ? "Someone sent you flowers" : "Someone sent you a rose";
  const firstLabel = product.kind === "bouquet" ? "Watch your flowers bloom" : "Watch your flower bloom";
  const replayLabel = product.kind === "bouquet" ? "Watch them bloom again" : "Watch it bloom again";
  const hasNote = Boolean(gift.greeting || gift.message || gift.signature);
  let complete = opened;
  let frame;
  let watchdog;
  let drawing;
  let playing = false;

  function stop() {
    cancelAnimationFrame(frame);
    clearTimeout(watchdog);
    playing = false;
  }

  function finish(announce = false) {
    stop();
    try {
      drawing?.draw(drawing.duration);
    } catch {}
    complete = true;
    note.hidden = !hasNote;
    action.removeAttribute("aria-disabled");
    action.textContent = replayLabel;
    action.hidden = motion.matches || !drawing;
    if (announce) status.textContent = "In full bloom";
    onOpen();
  }

  function play() {
    if (playing) return;
    if (motion.matches || !drawing || typeof requestAnimationFrame !== "function") {
      finish(true);
      return;
    }
    playing = true;
    action.setAttribute("aria-disabled", "true");
    status.textContent = "Blooming…";
    const start = performance.now();
    const tick = (now) => {
      try {
        const time = Math.max(0, now - start);
        if (time >= drawing.duration) finish(true);
        else {
          drawing.draw(time);
          frame = requestAnimationFrame(tick);
        }
      } catch {
        finish(true);
      }
    };
    try {
      drawing.draw(0);
      frame = requestAnimationFrame(tick);
      watchdog = setTimeout(() => finish(true), drawing.duration + 160);
    } catch {
      finish(true);
    }
  }

  noteContent(note, gift);
  art.hidden = false;
  action.hidden = false;
  action.removeAttribute("aria-disabled");
  try {
    drawing = renderFlowers(art, product, opened || motion.matches);
  } catch {
    art.replaceChildren();
    art.hidden = true;
    status.textContent = "The illustration is unavailable. Your note is below.";
  }
  action.textContent = firstLabel;
  note.hidden = true;
  if (complete || motion.matches || !drawing) finish();
  const motionChange = () => {
    if (motion.matches) finish();
    else if (complete && drawing) {
      action.hidden = false;
      action.textContent = replayLabel;
    }
  };
  motion.addEventListener("change", motionChange);
  action.addEventListener("click", play);

  return () => {
    stop();
    action.removeEventListener("click", play);
    motion.removeEventListener("change", motionChange);
  };
}
