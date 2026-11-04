import { PAPERS } from "./physical-schema.js";
import {
  ILLUSTRATIONS,
  illustration,
  illustrationUrl,
} from "./illustrations.js";
import { TONES } from "./openings/config.js";
const make = (tag, cls, text) => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};
export function createPhysicalCard(root, card, onReveal) {
  const marker = document.createComment("original card position");
  card.before(marker);
  const scene = make("section", "physical-scene");
  scene.hidden = true;
  scene.setAttribute("aria-label", "Folded greeting card");
  const stage = make("div", "physical-stage"),
    back = make("div", "paper-envelope-back"),
    book = make("div", "paper-book");
  const left = make("section", "paper-left");
  left.setAttribute("aria-label", "Inside left page");
  const leftArt = make("img", "paper-left-art");
  leftArt.alt = "";
  left.append(leftArt);
  const right = make("section", "paper-right");
  right.setAttribute("aria-label", "Inside right page");
  const tooLong = make(
    "p",
    "paper-too-long",
    "This card needs a little more room. Use Read comfortably below to read every word.",
  );
  right.append(tooLong);
  const cover = make("button", "paper-cover");
  cover.type = "button";
  cover.setAttribute("aria-label", "Open folded card");
  const front = make("span", "paper-front-face"),
    inside = make("span", "paper-inside-face");
  inside.ariaHidden = "true";
  const title = make("span", "paper-cover-title"),
    art = make("img", "paper-cover-art"),
    name = make("span", "paper-cover-name"),
    insideArt = make("img", "paper-inside-art");
  art.alt = "";
  insideArt.alt = "";
  front.append(
    make("span", "paper-cover-ornament", "✧"),
    title,
    art,
    name,
    make("span", "paper-cover-brand", "Silent Hello"),
  );
  inside.append(insideArt);
  cover.append(front, inside);
  book.append(left, right, cover);
  const envelope = make("button", "paper-envelope-front");
  envelope.type = "button";
  envelope.setAttribute("aria-label", "Open envelope");
  const tag = make("span", "paper-envelope-tag"),
    flap = make("div", "paper-envelope-flap"),
    seal = make("span", "paper-envelope-seal", "♡");
  envelope.append(tag);
  flap.ariaHidden = "true";
  back.ariaHidden = "true";
  stage.append(back, book, envelope, flap, seal);
  const controls = make("div", "paper-controls");
  const action = make("button", "paper-action", "Open envelope"),
    skip = make("button", "paper-skip", "Skip to message"),
    read = make("button", "paper-read", "Read comfortably");
  for (const b of [action, skip, read]) b.type = "button";
  controls.append(action, skip, read);
  scene.append(stage, controls);
  root.append(scene);
  const reader = make("dialog", "paper-reader");
  reader.setAttribute("aria-label", "Full card reading view");
  const closeReader = make("button", "paper-reader-close", "Back to card"),
    readerText = make("div", "paper-reader-text");
  closeReader.type = "button";
  reader.append(closeReader, readerText);
  root.append(reader);
  let enabled = false,
    data = {},
    sequence = 0,
    animations = [],
    state = "envelope";
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  function cancel() {
    animations.forEach((a) => a.cancel());
    animations = [];
  }
  function setState(value) {
    state = value;
    root.dataset.physicalState = value;
    scene.dataset.state = value;
    action.disabled = [
      "unsealing",
      "extracting",
      "unfolding",
      "closing",
    ].includes(value);
    action.textContent =
      value === "inside"
        ? "Close card"
        : value === "cover"
          ? "Open card"
          : "Open envelope";
    envelope.disabled = value !== "envelope";
    cover.disabled = value !== "cover";
    cover.setAttribute("aria-hidden", String(value !== "cover"));
    cover.tabIndex = value === "cover" ? 0 : -1;
    right.inert = value !== "inside";
    right.setAttribute("aria-hidden", String(value !== "inside"));
    left.setAttribute("aria-hidden", String(value !== "inside"));
    skip.hidden = value === "inside";
  }
  function show(where) {
    sequence++;
    cancel();
    book.classList.toggle("is-open", where === "inside");
    scene.classList.toggle("is-extracted", where !== "envelope");
    setState(where);
  }
  async function animate(node, frames, duration, run) {
    if (run !== sequence) return;
    if (motion.matches || !node.animate) return;
    const a = node.animate(frames, {
      duration,
      easing: "cubic-bezier(.2,.65,.25,1)",
      fill: "forwards",
    });
    animations.push(a);
    await a.finished;
  }
  async function extract() {
    if (state !== "envelope") return;
    const run = ++sequence;
    setState("unsealing");
    const timeout = setTimeout(() => {
      if (run === sequence) show("cover");
    }, 3000);
    try {
      if (!seal.hidden)
        await animate(
          seal,
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(1.15) rotate(-12deg)" },
          ],
          160,
          run,
        );
      await animate(
        flap,
        [{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }],
        450,
        run,
      );
      if (run !== sequence) return;
      setState("extracting");
      const x = innerWidth > 500 ? "-14%" : "0";
      await animate(
        book,
        [
          {
            transform: `translate(${x},110px) scale(.56)`,
            clipPath: "inset(0 0 70% 0)",
          },
          {
            transform: `translate(${x},-100px) scale(.56)`,
            clipPath: "inset(0 0 0 0)",
          },
        ],
        650,
        run,
      );
      if (run !== sequence) return;
      await Promise.all(
        [back, envelope, flap, seal].map((node) =>
          animate(node, [{ opacity: 1 }, { opacity: 0 }], 180, run),
        ),
      );
      if (run !== sequence) return;
      await animate(
        book,
        [
          { transform: `translate(${x},-100px) scale(.56)` },
          {
            transform: innerWidth > 500 ? "translateX(-25%)" : "translateX(0)",
          },
        ],
        400,
        run,
      );
      if (run !== sequence) return;
      show("cover");
      action.focus({ preventScroll: true });
    } catch {
      if (run === sequence) show("cover");
    } finally {
      clearTimeout(timeout);
    }
  }
  async function unfold() {
    if (!["cover", "inside"].includes(state)) return;
    const opening = state === "cover",
      run = ++sequence;
    setState(opening ? "unfolding" : "closing");
    const timeout = setTimeout(() => {
      if (run === sequence) show(opening ? "inside" : "cover");
    }, 2200);
    try {
      await Promise.all([
        animate(
          cover,
          [
            { transform: `rotateY(${opening ? 0 : -178}deg)` },
            { transform: `rotateY(${opening ? -178 : 0}deg)` },
          ],
          850,
          run,
        ),
        animate(
          book,
          [
            {
              transform:
                innerWidth > 500
                  ? opening
                    ? "translateX(-25%)"
                    : "translateX(0)"
                  : "translateX(0)",
            },
            {
              transform:
                innerWidth > 500
                  ? opening
                    ? "translateX(0)"
                    : "translateX(-25%)"
                  : "translateX(0)",
            },
          ],
          850,
          run,
        ),
      ]);
      if (run !== sequence) return;
      show(opening ? "inside" : "cover");
      if (opening) {
        onReveal();
        root.dispatchEvent(
          new CustomEvent("physical-card-opened", { bubbles: true }),
        );
        action.focus({ preventScroll: true });
      }
    } catch {
      if (run === sequence) show(opening ? "inside" : "cover");
    } finally {
      clearTimeout(timeout);
    }
  }
  action.onclick = () => (state === "envelope" ? extract() : unfold());
  envelope.onclick = extract;
  cover.onclick = unfold;
  skip.onclick = () => {
    show("inside");
    onReveal();
  };
  read.onclick = () => {
    parent.postMessage({ type: "card-reader-open" }, location.origin);
    if (reader.showModal) reader.showModal();
    else reader.setAttribute("open", "");
    closeReader.focus();
  };
  closeReader.onclick = () => {
    if (reader.close) reader.close();
    else reader.removeAttribute("open");
    read.focus();
  };
  motion.addEventListener("change", () => {
    if (motion.matches && action.disabled)
      show(state === "unfolding" ? "inside" : "cover");
  });
  function artwork(node, id, empty) {
    const items = ILLUSTRATIONS[data.themeId] || [];
    const item =
      id === "default" || (id === "" && !empty)
        ? illustration(data.themeId, data.physicalConfig.coverArt) ||
          illustration(data.themeId, data.stickerId) ||
          items[0]
        : illustration(data.themeId, id);
    node.hidden = !item;
    if (item) node.src = illustrationUrl(item);
    else node.removeAttribute("src");
  }
  new ResizeObserver(() => {
    if (enabled) root.dispatchEvent(new CustomEvent("physical-layout"));
  }).observe(stage);
  return {
    get enabled() {
      return enabled;
    },
    update(next) {
      data = next;
      const was = enabled;
      enabled = !!data.physicalConfig;
      if (!enabled) {
        if (was) {
          show("envelope");
          marker.before(card);
          card.style.removeProperty("--card-font");
          card.querySelector("#from").style.fontFamily = "";
          scene.hidden = true;
          root.removeAttribute("data-physical");
          reader.close?.();
        }
        return false;
      }
      if (!was) {
        right.append(card);
        scene.hidden = false;
        root.dataset.physical = "true";
        show("envelope");
      }
      const cfg = data.physicalConfig;
      root.dataset.paper = cfg.paper;
      const [paper, ink] = PAPERS[cfg.paper];
      scene.style.setProperty("--inside-paper", paper);
      scene.style.setProperty("--inside-ink", ink);
      const tone = TONES[data.openingConfig?.tone] || [
        data.palette.paper,
        data.palette.accent,
        data.palette.ink,
      ];
      for (const [i, key] of [
        "--envelope-paper",
        "--envelope-accent",
        "--envelope-ink",
      ].entries())
        scene.style.setProperty(key, tone[i]);
      seal.hidden = data.openingConfig?.seal === false;
      tag.textContent = data.recipient
        ? `For ${data.recipient}`
        : "Especially for you";
      front.style.setProperty(
        "--cover-font",
        root.style.getPropertyValue("--card-font"),
      );
      title.textContent =
        cfg.coverGreeting || data.coverDefault || data.headline;
      cover.setAttribute(
        "aria-label",
        `Open folded card. ${title.textContent}`,
      );
      envelope.setAttribute(
        "aria-label",
        `Open envelope addressed to ${data.recipient || "you"}`,
      );
      name.textContent = Object.hasOwn(cfg, "coverName")
        ? cfg.coverName
        : data.recipient
          ? `For ${data.recipient}`
          : "";
      artwork(art, cfg.coverArt, false);
      artwork(leftArt, cfg.insideArt, true);
      artwork(insideArt, cfg.insideArt, true);
      const family = {
        fredoka: "Fredoka",
        poppins: "Poppins",
        quicksand: "Quicksand",
        nunito: "Nunito",
        pacifico: "Pacifico",
        playfair: "Playfair Display",
      };
      card.style.setProperty(
        "--card-font",
        `"${family[cfg.handwriting]}",sans-serif`,
      );
      card.querySelector("#from").style.fontFamily =
        `"${family[cfg.signature]}",serif`;
      card.querySelector("#headline").textContent = data.recipient
        ? `Dear ${data.recipient},`
        : "A little note for you";
      card.querySelector("#ageMark").hidden = true;
      card.querySelector(".sticker-zone").hidden = true;
      readerText.textContent = `${title.textContent}\n\n${card.querySelector("#headline").textContent}\n\n${data.message}\n\n${data.from}`;
      return true;
    },
    reset() {
      if (enabled) show("envelope");
    },
    preview(where) {
      if (enabled) show(where === "journey" ? "envelope" : where);
    },
    async readyFonts() {
      await document.fonts.load(getComputedStyle(title).font);
    },
    fitCover() {
      let size = 30;
      title.style.fontSize = size + "px";
      while (front.scrollHeight > front.clientHeight + 1 && size > 20)
        title.style.fontSize = --size + "px";
      return (
        front.scrollHeight <= front.clientHeight + 1 &&
        title.scrollWidth <= title.clientWidth + 1
      );
    },
  };
}
