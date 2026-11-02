import { TONES } from "./config.js";
export function createOpening(root) {
  const cover = document.createElement("section");
  cover.className = "interactive-opening";
  cover.hidden = true;
  cover.setAttribute("aria-label", "Open your card");
  const art = document.createElement("div");
  art.className = "opening-object";
  art.ariaHidden = "true";
  const layers = {};
  for (const name of [
    "insert",
    "back",
    "ribbon",
    "lid",
    "front",
    "flap",
    "seal",
    "tag",
  ]) {
    const node = document.createElement("span");
    node.className = "opening-" + name;
    art.append(node);
    layers[name] = node;
  }
  layers.insert.textContent = "A little hello";
  layers.seal.textContent = "♡";
  const text = document.createElement("p");
  const open = document.createElement("button");
  open.type = "button";
  open.textContent = "Open your card";
  const skip = document.createElement("button");
  skip.type = "button";
  skip.textContent = "Skip opening";
  skip.className = "opening-skip";
  cover.append(art, text, open, skip);
  root.append(cover);
  let animations = [],
    callback,
    sequence = 0,
    configuration = {};
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const state = (value) => {
    root.dataset.openingState = value;
  };
  function cancel() {
    animations.forEach((a) => a.cancel());
    animations = [];
  }
  function configure(config = {}, recipient = "", sender = "") {
    configuration = config;
    const colors = TONES[config.tone];
    for (const [i, key] of [
      "--wrap-paper",
      "--wrap-accent",
      "--wrap-ink",
    ].entries()) {
      if (colors) cover.style.setProperty(key, colors[i]);
      else cover.style.removeProperty(key);
    }
    cover.dataset.wrap = config.wrap || "plain";
    layers.seal.hidden = config.seal === false;
    layers.tag.textContent = recipient
      ? `For ${recipient}`
      : "Especially for you";
    text.textContent = sender
      ? `${sender} sent you a little hello.`
      : "Someone has sent you a little hello.";
  }
  function complete(run) {
    if (run !== sequence || root.dataset.openingState === "complete") return;
    cancel();
    cover.hidden = true;
    state("revealed");
    try {
      callback?.();
    } finally {
      state("complete");
      root.dispatchEvent(
        new CustomEvent("card-opening-complete", { bubbles: true }),
      );
    }
  }
  async function animate(node, frames, duration) {
    const animation = node.animate(frames, {
      duration,
      easing: "cubic-bezier(.2,.6,.3,1)",
      fill: "forwards",
    });
    animations.push(animation);
    await animation.finished;
  }
  async function activate(instant = false) {
    if (root.dataset.openingState !== "ready") return;
    const run = sequence;
    state("opening");
    open.disabled = true;
    const fallback = setTimeout(() => complete(run), 3500);
    try {
      if (!instant && !motion.matches && typeof art.animate === "function") {
        if (cover.dataset.type === "envelope") {
          if (configuration.seal !== false)
            await animate(
              layers.seal,
              [
                { transform: "scale(1)" },
                { transform: "scale(1.3) rotate(-20deg)", opacity: 0 },
              ],
              180,
            );
          if (run !== sequence) return;
          await animate(
            layers.flap,
            [{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }],
            450,
          );
        } else {
          await animate(
            layers.ribbon,
            [
              { transform: "scaleX(1)" },
              { transform: "scaleX(0)", opacity: 0 },
            ],
            250,
          );
          if (run !== sequence) return;
          await animate(
            layers.lid,
            [
              { transform: "translateY(0) rotate(0)" },
              { transform: "translateY(-95px) rotate(-15deg)", opacity: 0 },
            ],
            450,
          );
        }
        if (run !== sequence) return;
        await animate(
          layers.insert,
          [
            { transform: "translateY(0)", opacity: 1 },
            { transform: "translateY(-100px) scale(1.12)", opacity: 1 },
          ],
          550,
        );
        await animate(
          art,
          [{ opacity: 1 }, { opacity: 0, transform: "scale(1.15)" }],
          200,
        );
      }
    } catch {
    } finally {
      clearTimeout(fallback);
      complete(run);
    }
  }
  open.onclick = () => activate();
  skip.onclick = () => {
    if (root.dataset.openingState === "opening") complete(sequence);
    else activate(true);
  };
  motion.addEventListener("change", () => {
    if (motion.matches && root.dataset.openingState === "opening")
      complete(sequence);
  });
  return {
    configure,
    reset(type, onReveal, config = {}, recipient = "", sender = "") {
      sequence++;
      cancel();
      callback = onReveal;
      state("idle");
      cover.hidden = true;
      configure(config, recipient, sender);
      if (!["envelope", "gift-box"].includes(type)) return false;
      if (typeof art.animate !== "function") {
        state("complete");
        return false;
      }
      cover.dataset.type = type;
      open.disabled = false;
      cover.hidden = false;
      state("ready");
      return true;
    },
  };
}
