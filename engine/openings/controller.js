// One controller per renderer. No shared content or payload fields are modified.
export function createOpening(root) {
  const cover = document.createElement("section");
  cover.className = "interactive-opening";
  cover.hidden = true;
  cover.setAttribute("aria-label", "Open your card");
  const art = document.createElement("div");
  art.className = "opening-object";
  art.ariaHidden = "true";
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
  let animation,
    callback,
    sequence = 0;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const state = (value) => {
    root.dataset.openingState = value;
  };
  function complete(run) {
    if (run !== sequence) return;
    cover.hidden = true;
    state("revealed");
    callback?.();
    state("complete");
    root.dispatchEvent(
      new CustomEvent("card-opening-complete", { bubbles: true }),
    );
  }
  async function activate(instant = false) {
    if (root.dataset.openingState !== "ready") return;
    const run = sequence;
    state("opening");
    open.disabled = true;
    try {
      if (!instant && !motion.matches) {
        animation = art.animate(
          cover.dataset.type === "envelope"
            ? [
                { transform: "rotateX(0)" },
                { transform: "rotateX(-140deg) translateY(-80px)", opacity: 0 },
              ]
            : [
                { transform: "translateY(0) rotate(0)" },
                { transform: "translateY(-100px) rotate(-12deg)", opacity: 0 },
              ],
          { duration: 750, easing: "ease-in", fill: "forwards" },
        );
        await animation.finished;
      }
    } catch {
    } finally {
      complete(run);
    }
  }
  open.onclick = () => activate();
  skip.onclick = () => {
    if (root.dataset.openingState === "opening") {
      animation?.cancel();
    } else activate(true);
  };
  motion.addEventListener("change", () => {
    if (motion.matches && root.dataset.openingState === "opening")
      animation?.cancel();
  });
  return {
    reset(type, onReveal) {
      sequence++;
      animation?.cancel();
      callback = onReveal;
      state("idle");
      cover.hidden = true;
      if (!["envelope", "gift-box"].includes(type)) {
        return false;
      }
      cover.dataset.type = type;
      art.textContent = type === "envelope" ? "♡" : "✦";
      text.textContent =
        type === "envelope"
          ? "A little note, sealed with love."
          : "A little surprise, wrapped just for you.";
      open.disabled = false;
      cover.hidden = false;
      state("ready");
      return true;
    },
  };
}
