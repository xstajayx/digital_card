import { hostedShareURL } from "./hosted-cards.js";
import { assertPreparedShareable } from "./prepared-editor.js";
import { assertPhotoShareable } from "./photo-card.js";
import { sanitizeGiftUrl } from "../engine/sanitize.js";
import { ILLUSTRATIONS, illustrationUrl } from "../engine/illustrations.js";
import {
  birthdayNumber,
  cardContent,
  contrastRatio,
  validateCard,
} from "../engine/card-data.js";
import { buildShareUrl } from "../engine/share-codec.js";
import { bindShareActions } from "./share-actions.js";
import { offerOccasion } from "./occasion-dialog.js";
const $ = (id) => document.getElementById(id);
const labels = [
  "",
  "Continue →",
  "Write a message →",
  "Choose a style →",
  "Preview & share →",
];
const palettes = [
  ["Garden", "#eef4e9", "#374c3c"],
  ["Blush", "#fff0f1", "#592f3d"],
  ["Moonlight", "#f0edfa", "#35304e"],
  ["Honey", "#fff3dc", "#57432b"],
  ["Ink", "#263d39", "#fff6e9"],
];
const button = (className, label) => {
  const node = document.createElement("button");
  node.type = "button";
  node.className = className;
  if (label) node.textContent = label;
  return node;
};
const selection = (container, value, key) =>
  container
    .querySelectorAll("button")
    .forEach((node) =>
      node.setAttribute("aria-pressed", String(node.dataset[key] === value)),
    );

export function createUI({ state, preview }) {
  let step = 1,
    filter = "All",
    search = "",
    designKey = "",
    stickerKey = "",
    summaryKey = "",
    revision = 0;
  const themes = state.get().themes;
  const occasions = [
    ...new Map(themes.map((theme) => [theme.occasionId, theme])).values(),
  ];
  const fields = {
    toInput: "to",
    messageInput: "message",
    fromInput: "from",
    giftInput: "giftUrl",

    paperColorInput: "paperOverride",
    inkColorInput: "inkOverride",
  };
  function goTo(next, focus = true) {
    step = Math.max(1, Math.min(5, next));
    $("studio").dataset.step = String(step);
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = Number(panel.dataset.panel) !== step;
    });
    document.querySelectorAll(".steps button").forEach((node) => {
      if (Number(node.dataset.step) === step)
        node.setAttribute("aria-current", "step");
      else node.removeAttribute("aria-current");
    });
    $("backStep").disabled = step === 1;
    $("nextStep").hidden = step === 5;
    $("nextStep").textContent = labels[step] || "";
    $("stepProgress").textContent = `Step ${step} of 5`;
    if (focus) {
      document
        .querySelector(`[data-panel="${step}"] h2`)
        .focus({ preventScroll: true });
      $("studio").scrollIntoView({ block: "start", behavior: "instant" });
    }
    // A hidden mobile preview acquires its real viewport on step 5.
    if (step === 5) {
      if (state.get().physicalConfig) preview.physicalStage("envelope");
      requestAnimationFrame(() => preview.checkFit().catch(() => {}));
    } else if (state.get().physicalConfig) {
      preview.physicalStage(
        step === 2 ? "cover" : step >= 3 ? "inside" : "envelope",
      );
    }
  }
  document
    .querySelectorAll(".steps button")
    .forEach((node) => (node.onclick = () => goTo(Number(node.dataset.step))));
  document
    .querySelectorAll("[data-go]")
    .forEach((node) => (node.onclick = () => goTo(Number(node.dataset.go))));
  $("backStep").onclick = () => goTo(step - 1);
  $("nextStep").onclick = () => goTo(step + 1);
  $("previewJump").onclick = () => goTo(5);

  function chooseTheme(theme) {
    const current = state.get();
    if (theme.id === current.theme.id) return;
    const copy = {};
    for (const key of ["message"]) {
      if (current[key] === current.theme.defaults[key])
        copy[key] = theme.defaults[key];
    }
    state.set({
      ...copy,
      theme,
      ...(current.physicalConfig
        ? {
            physicalConfig: {
              ...current.physicalConfig,
              coverArt: "",
              insideArt: "default",
            },
          }
        : {}),
      stickerId: "",
      paperOverride: "",
      inkOverride: "",
      fontId: current.fontChosen
        ? current.fontId
        : theme.defaultFontId || "fredoka",
      birthdayNumberEnabled: theme.birthday
        ? current.birthdayNumberEnabled
        : false,
    });
  }
  function renderOccasions() {
    const fragment = document.createDocumentFragment();
    for (const theme of occasions) {
      const node = button("occasion-tile");
      node.dataset.occasion = theme.occasionId;
      node.style.setProperty("--tile-paper", theme.palette.paper);
      node.style.setProperty("--tile-ink", theme.palette.ink);
      const symbol = document.createElement("span");
      symbol.className = "occasion-symbol";
      symbol.ariaHidden = "true";
      symbol.textContent = theme.symbol;
      const label = document.createElement("span");
      label.textContent = theme.occasion;
      node.append(symbol, label);
      node.onclick = () =>
        chooseTheme(themes.find((t) => t.occasionId === theme.occasionId));
      fragment.append(node);
    }
    $("occasionGallery").replaceChildren(fragment);
    for (const name of [
      "All",
      "Celebrate",
      "Love & family",
      "Everyday",
      "Seasonal",
    ]) {
      const node = button("filter-button", name);
      node.dataset.filter = name;
      node.setAttribute("aria-pressed", String(name === filter));
      node.onclick = () => {
        filter = name;
        selection($("occasionFilters"), filter, "filter");
        filterOccasions();
      };
      $("occasionFilters").append(node);
    }
  }
  function filterOccasions() {
    let count = 0;
    $("occasionGallery")
      .querySelectorAll("button")
      .forEach((node) => {
        const occasion = occasions.find(
          (t) => t.occasionId === node.dataset.occasion,
        );
        node.hidden =
          !(filter === "All" || occasion.group === filter) ||
          !occasion.occasion.toLocaleLowerCase().includes(search);
        if (!node.hidden) count++;
      });
    $("noOccasions").hidden = count !== 0;
  }
  $("occasionSearch").oninput = (event) => {
    search = event.target.value.trim().toLocaleLowerCase();
    filterOccasions();
  };
  function renderDesigns(current) {
    const fragment = document.createDocumentFragment();
    const designs = themes.filter(
      (theme) => theme.occasionId === current.theme.occasionId,
    );
    $("designDescription").textContent = current.theme.occasion;
    for (const theme of designs) {
      const node = button("theme-tile");
      node.dataset.theme = theme.id;
      node.setAttribute("aria-label", theme.name);
      const mini = document.createElement("span");
      mini.className = "mini-card";
      mini.dataset.style = theme.style;
      mini.ariaHidden = "true";
      mini.style.setProperty("--tile-paper", theme.palette.paper);
      mini.style.setProperty("--tile-ink", theme.palette.ink);
      const symbol = document.createElement("span");
      symbol.className = "mini-symbol";
      symbol.textContent = theme.symbol;
      const title = document.createElement("strong");
      title.textContent = theme.greeting;
      const small = document.createElement("small");
      small.textContent = "A little something, just for you.";
      mini.append(symbol, title, small);
      const label = document.createElement("span");
      label.className = "design-name";
      label.textContent = theme.name;
      const tick = document.createElement("span");
      tick.className = "design-check";
      tick.ariaHidden = "true";
      tick.textContent = "✓";
      label.append(tick);
      node.append(mini, label);
      node.onclick = () => chooseTheme(theme);
      fragment.append(node);
    }
    $("themeGallery").replaceChildren(fragment);
  }
  function chooseIllustration(id) {
    const s = state.get();
    state.set({
      stickerId: id,
      ...(s.physicalConfig
        ? { physicalConfig: { ...s.physicalConfig, coverArt: id || "none" } }
        : {}),
    });
  }
  function renderIllustrations(items) {
    const fragment = document.createDocumentFragment();
    const none = button("sticker-tile none-option");
    none.dataset.sticker = "";
    const icon = document.createElement("span");
    icon.className = "none-icon";
    icon.ariaHidden = "true";
    icon.textContent = "∅";
    none.append(icon, document.createTextNode("None"));
    none.onclick = () => chooseIllustration("");
    fragment.append(none);
    for (const item of items) {
      const node = button("sticker-tile");
      node.dataset.sticker = item.id;
      const image = document.createElement("img");
      image.src = illustrationUrl(item);
      image.alt = "";
      image.width = 67;
      image.height = 55;
      const label = document.createElement("span");
      label.textContent = item.label;
      node.append(image, label);
      node.onclick = () => chooseIllustration(item.id);
      fragment.append(node);
    }
    $("stickerGallery").replaceChildren(fragment);
  }
  palettes.forEach(([name, paper, ink]) => {
    const node = button("palette-preset");
    node.setAttribute("aria-label", `${name} colours`);
    node.dataset.paper = paper;
    node.dataset.ink = ink;
    const swatch = document.createElement("span");
    swatch.ariaHidden = "true";
    swatch.style.setProperty("--swatch-paper", paper);
    swatch.style.setProperty("--swatch-ink", ink);
    node.append(swatch);
    node.onclick = () => {
      state.set({ paperOverride: paper, inkOverride: ink });
      if (state.get().physicalConfig) preview.physicalStage("cover");
    };
    $("palettePresets").append(node);
  });
  Object.entries(fields).forEach(([id, key]) =>
    $(id).addEventListener("input", (event) =>
      state.set({ [key]: event.target.value }),
    ),
  );
  $("fontSelect").onchange = (event) => {
    const fontId = event.target.value,
      s = state.get();
    state.set({
      fontId,
      fontChosen: true,
      ...(s.physicalConfig
        ? {
            physicalConfig: {
              ...s.physicalConfig,
              handwriting: fontId,
              signature: fontId,
            },
          }
        : {}),
    });
  };
  $("birthdayNumberInput").oninput = (event) =>
    state.set({
      birthdayNumber: event.target.value,
      birthdayNumberEnabled: event.target.value !== "",
    });
  $("textSize").onchange = (event) =>
    state.set({ textSize: Number(event.target.value) });
  for (const [id, key] of [
    ["watermarkToggle", "watermark"],
    ["giftToggle", "giftEnabled"],
    ["birthdayNumberToggle", "birthdayNumberEnabled"],
  ])
    $(id).onchange = (event) => state.set({ [key]: event.target.checked });
  let previousMessage = "";
  $("suggestMessage").onclick = () => {
    previousMessage = state.get().message;
    state.set({ message: state.get().theme.defaults.message });
    $("undoSuggestion").hidden = false;
  };
  $("undoSuggestion").onclick = () => {
    state.set({ message: previousMessage });
    $("undoSuggestion").hidden = true;
  };
  $("resetColorsButton").onclick = () =>
    state.set({ paperOverride: "", inkOverride: "" });
  $("resetDesignButton").onclick = () => {
    state.set({
      fontId: state.get().theme.defaultFontId || "fredoka",
      fontChosen: false,
      openingConfig: state.get().openingConfig,
      physicalConfig: state.get().physicalConfig
        ? {
            ...state.get().physicalConfig,
            handwriting: state.get().theme.defaultFontId || "fredoka",
            signature: state.get().theme.defaultFontId || "fredoka",
          }
        : null,
      textSize: 18,
      paperOverride: "",
      inkOverride: "",
      stickerId: "",
      birthdayNumberEnabled: false,
      birthdayNumber: "",
      giftEnabled: false,
      giftUrl: "",
      watermark: true,
    });
    $("exportStatus").textContent =
      "Design reset. Your occasion, design, names and message are kept.";
  };
  $("replayButton").onclick = () => preview.play();
  $("quickShareButton").onclick = () => $("nativeShareButton").click();
  renderOccasions();

  state.subscribe((current, changed) => {
    revision++;
    $("rememberOccasionPrompt").hidden = true;
    $("occasionSavedStatus").textContent = "";
    document.querySelector(".transport-link")?.remove();
    const theme = current.theme,
      items = ILLUSTRATIONS[theme.id] || [];
    if (theme.occasionId !== designKey) {
      designKey = theme.occasionId;
      renderDesigns(current);
    }
    const nextStickers = JSON.stringify(items);
    if (nextStickers !== stickerKey) {
      stickerKey = nextStickers;
      renderIllustrations(items);
    }
    if (changed.includes("theme")) {
      selection($("occasionGallery"), theme.occasionId, "occasion");
      selection($("themeGallery"), theme.id, "theme");
    }
    selection(
      $("stickerGallery"),
      current.physicalConfig
        ? current.physicalConfig.coverArt === "none"
          ? ""
          : current.physicalConfig.coverArt ||
            current.stickerId ||
            items[0]?.id ||
            ""
        : current.stickerId,
      "sticker",
    );
    // Do not assign unchanged values: preserve selection, caret and input composition.
    for (const [id, key] of Object.entries(fields))
      if (changed.includes(key) && $(id).value !== current[key])
        $(id).value = current[key];
    $("fontSelect").value = current.fontId;
    $("textSize").value = current.textSize;
    $("watermarkToggle").checked = current.watermark;
    $("giftToggle").checked = current.giftEnabled;
    $("giftField").hidden = !current.giftEnabled;
    const badGift =
      current.giftEnabled &&
      current.giftUrl &&
      !sanitizeGiftUrl(current.giftUrl);
    $("giftError").textContent = badGift
      ? "Use an HTTPS link without a username or password."
      : "";
    $("giftInput").setAttribute("aria-invalid", String(!!badGift));
    $("birthdayControls").hidden = !theme.birthday;
    $("birthdayNumberToggle").checked = current.birthdayNumberEnabled;
    $("birthdayNumberField").hidden = false;
    if ($("birthdayNumberInput").value !== String(current.birthdayNumber))
      $("birthdayNumberInput").value = current.birthdayNumber;
    const badAge =
      current.birthdayNumberEnabled && !birthdayNumber(current.birthdayNumber);
    $("birthdayError").textContent = badAge
      ? "Enter a whole number from 1 to 120, or leave blank."
      : "";
    $("birthdayNumberInput").setAttribute("aria-invalid", String(!!badAge));
    const paper = current.paperOverride || theme.palette.paper,
      ink = current.inkOverride || theme.palette.ink;
    if ($("paperColorInput").value !== paper)
      $("paperColorInput").value = paper;
    if ($("inkColorInput").value !== ink) $("inkColorInput").value = ink;
    const ratio = contrastRatio(paper, ink);
    $("contrastStatus").className = ratio < 4.5 ? "warning" : "helper";
    $("contrastStatus").textContent =
      ratio < 4.5
        ? "Choose a darker text or lighter background for easier reading."
        : "";
    $("palettePresets")
      .querySelectorAll("button")
      .forEach((node) =>
        node.setAttribute(
          "aria-pressed",
          String(node.dataset.paper === paper && node.dataset.ink === ink),
        ),
      );
    $("messageRemaining").textContent =
      `${Array.from(current.message).length.toLocaleString()} characters`;
    const summary = [
      `For ${current.to || "someone special"}`,
      `${theme.occasion} · ${theme.name}`,
      `From ${current.from || "you"}`,
    ];
    if (JSON.stringify(summary) !== summaryKey) {
      summaryKey = JSON.stringify(summary);
      $("cardSummary").replaceChildren();
      for (const text of summary) {
        const p = document.createElement("p");
        p.textContent = text;
        $("cardSummary").append(p);
      }
    }
    const content = cardContent(current);
    $("fullMessageText").textContent =
      `${content.headline}\n\n${content.message}\n\n${content.from}`;
    preview.update(content);
    if (changed.length < 10) {
      $("exportStatus").textContent = "";
      $("shareFallback").hidden = true;
    }
  });
  bindShareActions({
    getContext: () => state.get(),
    buttons: {
      email: $("emailShareButton"),
      sms: $("smsShareButton"),
      copy: $("shareLinkButton"),
      native: $("nativeShareButton"),
      whatsapp: $("shareWhatsappButton"),
    },
    status: $("exportStatus"),
    fallback: $("shareFallback"),
    linkInput: $("shareUrl"),
    mirrors: [$("quickShareButton")],
    async getUrl() {
      const hosted = hostedShareURL(state);
      if (!hosted) assertPhotoShareable(state);
      assertPreparedShareable(state);
      const before = revision,
        current = state.get();
      if (
        current.giftEnabled &&
        current.giftUrl &&
        !sanitizeGiftUrl(current.giftUrl)
      )
        throw new Error(
          "Use a valid HTTPS gift link without username or password.",
        );
      if (
        current.birthdayNumberEnabled &&
        !birthdayNumber(current.birthdayNumber)
      )
        throw new Error(
          "Enter a birthday number from 1 to 120, or turn it off.",
        );
      if (!(await preview.checkFit()))
        throw new Error(
          "Content does not fit. Choose smaller text or shorten the message before sharing.",
        );
      const card = validateCard(
        {
          ...cardContent(current),
          v: current.physicalConfig ? 5 : current.openingConfig ? 4 : 3,
        },
        themes,
      );
      const url = hosted || (await buildShareUrl(card));
      if (before !== revision)
        throw new Error(
          "Your card changed while preparing the link. Please share again.",
        );
      if (!hosted) assertPhotoShareable(state);
      else if (hosted !== hostedShareURL(state))
        throw new Error("Your hosted card changed. Please share again.");
      assertPreparedShareable(state);
      offerOccasion(current);
      return url;
    },
  });
  goTo(new URLSearchParams(location.search).has("design") ? 2 : 1, false);
}
