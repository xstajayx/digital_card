import { sanitizeGiftUrl } from "../engine/sanitize.js";
import { ILLUSTRATIONS } from "../engine/illustrations.js";
import { greetingFor, loadThemes } from "../engine/card-data.js";
export { loadThemes };
const MAX_SHARE_URL_CHARS = 12000;
const textValue = (value) => String(value || "");
const normalizeBirthdayNumber = (value) =>
  value === ""
    ? ""
    : String(Math.max(1, Math.min(120, Math.round(Number(value) || 1))));
const loadStickersForTheme = async (id) => ILLUSTRATIONS[id] || [];
const base64UrlEncode = (str) =>
  btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const buildViewerUrl = (encoded) =>
  new URL("view.html?d=" + encoded, location.href).href;
async function buildShareUrlAsync(current) {
  const safeGiftUrl = current.giftEnabled
    ? sanitizeGiftUrl(current.giftUrl || "")
    : "";
  const birthdayNumber = current.birthdayNumberEnabled
    ? normalizeBirthdayNumber(current.birthdayNumber)
    : "";
  const stickerValid = current.stickers.some((s) => s.id === current.stickerId);
  const payload = {
    v: 2,
    textSize: current.textSize,
    themeId: current.theme.id,
    to: current.to || "",
    message: textValue(current.message),
    from: current.from || "",
    watermark: !!current.watermark,
    giftUrl: safeGiftUrl,
    fontId: current.fontId || "fredoka",
    birthdayNumber: birthdayNumber || "",
    birthdayNumberEnabled: !!current.birthdayNumberEnabled,
    paperOverride: current.paperOverride || "",
    inkOverride: current.inkOverride || "",
    stickerId: stickerValid ? current.stickerId : "",
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const url = buildViewerUrl(encoded);
  if (url.length > MAX_SHARE_URL_CHARS)
    throw new Error("Share link is too long. Shorten message or gift URL.");
  return { url };
}

export function createUI({ state, preview, elements }) {
  const {
    toInput,
    messageInput,
    fromInput,
    fontSelect,
    watermarkToggle,
    giftToggle,
    giftInput,
    giftField,
    birthdayNumberToggle,
    birthdayNumberInput,
    birthdayNumberField,
    paperColorInput,
    inkColorInput,
    resetColorsButton,
    themeGallery,
    stickerGallery,
    replayButton,
    replayButtonInline,
    shareLinkButton,
    shareWhatsappButton,
    exportStatus,
  } = elements;

  let stickerThemeVersion = 0;
  let loadedStickerThemeId = "";

  function setStatus(msg) {
    if (exportStatus) exportStatus.textContent = msg || "";
  }

  function renderThemes(current) {
    themeGallery.innerHTML = "";
    current.themes.forEach((theme) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `theme-tile${current.theme?.id === theme.id ? " is-active" : ""}`;
      button.textContent = theme.name;
      button.addEventListener("click", async () => {
        const stickers = await loadStickersForTheme(theme.id);
        loadedStickerThemeId = theme.id;
        state.set({
          theme,
          stickers,
          stickerId: "",
          to: textValue(theme.defaults?.to || ""),
          message: textValue(theme.defaults?.message || ""),
          from: textValue(theme.defaults?.from || ""),
          paperOverride: "",
          inkOverride: "",
        });
      });
      themeGallery.appendChild(button);
    });
  }

  function renderStickerGallery(current) {
    stickerGallery.innerHTML = "";

    const noneTile = document.createElement("button");
    noneTile.type = "button";
    noneTile.className = `sticker-tile none-option${!current.stickerId ? " is-active" : ""}`;
    noneTile.textContent = "None";
    noneTile.addEventListener("click", () => state.set({ stickerId: "" }));
    stickerGallery.appendChild(noneTile);

    current.stickers.forEach((sticker) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `sticker-tile${current.stickerId === sticker.id ? " is-active" : ""}`;
      tile.title = sticker.label;

      const img = document.createElement("img");
      img.alt = sticker.label;
      img.src = `./stickers/${current.theme?.id}/${sticker.asset}`;
      img.loading = "lazy";

      const label = document.createElement("span");
      label.textContent = sticker.label;

      tile.appendChild(img);
      tile.appendChild(label);
      tile.addEventListener("click", () =>
        state.set({ stickerId: sticker.id }),
      );
      stickerGallery.appendChild(tile);
    });
  }

  function updateBirthdayUI(current) {
    const isBirthdayTheme = String(current.theme?.id || "").startsWith(
      "birthday",
    );
    const showBirthdayControls =
      isBirthdayTheme || current.birthdayNumberEnabled;
    birthdayNumberToggle.checked = !!current.birthdayNumberEnabled;
    birthdayNumberField.style.display = showBirthdayControls ? "" : "none";
    birthdayNumberInput.value = current.birthdayNumber || "";
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
    state.set({ stickers, stickerId: valid ? current.stickerId : "" });
  }

  function updatePreview(current) {
    if (!current.theme) return;
    const validSticker = current.stickers.some(
      (s) => s.id === current.stickerId,
    )
      ? current.stickerId
      : "";
    preview.setTheme(current.theme);
    preview.setContent({
      textSize: current.textSize,
      recipient: current.to || "Friend",
      headline: greetingFor(
        current.theme,
        current.to,
        current.birthdayNumberEnabled,
        current.birthdayNumber,
      ),
      message: current.message,
      from: current.from,
      giftUrl: current.giftEnabled
        ? sanitizeGiftUrl(current.giftUrl || "")
        : "",
      fontId: current.fontId,
      birthdayNumber: current.birthdayNumberEnabled
        ? normalizeBirthdayNumber(current.birthdayNumber)
        : "",
      paperOverride: current.paperOverride || "",
      inkOverride: current.inkOverride || "",
      mode: "share",
      stickerId: validSticker,
      themeId: current.theme.id,
    });
    preview.setWatermark(current.watermark);
  }

  toInput.addEventListener("input", (e) =>
    state.set({ to: textValue(e.target.value) }),
  );
  messageInput.addEventListener("input", (e) =>
    state.set({ message: textValue(e.target.value) }),
  );
  fromInput.addEventListener("input", (e) =>
    state.set({ from: textValue(e.target.value) }),
  );
  fontSelect.addEventListener("change", (e) =>
    state.set({ fontId: e.target.value }),
  );
  watermarkToggle.addEventListener("change", (e) =>
    state.set({ watermark: e.target.checked }),
  );

  giftToggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    state.set({
      giftEnabled: enabled,
      giftUrl: enabled ? state.get().giftUrl : "",
    });
  });
  giftInput.addEventListener("input", (e) =>
    state.set({ giftUrl: e.target.value }),
  );

  birthdayNumberToggle.addEventListener("change", (e) =>
    state.set({ birthdayNumberEnabled: e.target.checked }),
  );
  birthdayNumberInput.addEventListener("input", (e) =>
    state.set({ birthdayNumber: normalizeBirthdayNumber(e.target.value) }),
  );

  paperColorInput.addEventListener("input", (e) =>
    state.set({ paperOverride: e.target.value }),
  );
  inkColorInput.addEventListener("input", (e) =>
    state.set({ inkOverride: e.target.value }),
  );
  resetColorsButton.addEventListener("click", () =>
    state.set({ paperOverride: "", inkOverride: "" }),
  );

  document
    .getElementById("textSize")
    .addEventListener("change", (e) =>
      state.set({ textSize: Number(e.target.value) }),
    );
  document.getElementById("resetDesignButton").addEventListener("click", () =>
    state.set({
      fontId: "fredoka",
      textSize: 18,
      paperOverride: "",
      inkOverride: "",
      stickerId: "",
      birthdayNumberEnabled: false,
      birthdayNumber: "",
      giftEnabled: false,
      giftUrl: "",
      watermark: true,
    }),
  );
  const replay = () => preview.play();
  replayButton.addEventListener("click", replay);
  replayButtonInline.addEventListener("click", replay);

  shareLinkButton.addEventListener("click", async () => {
    try {
      if (!(await preview.checkFit()))
        throw new Error(
          "Content does not fit. Choose smaller text or edit your message before sharing.",
        );
      if (
        state.get().giftEnabled &&
        state.get().giftUrl &&
        !sanitizeGiftUrl(state.get().giftUrl)
      )
        throw new Error(
          "Use a valid HTTPS gift URL without username or password.",
        );
      const { url } = await buildShareUrlAsync(state.get());
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus("Share link copied ✅");
      } else {
        setStatus(url);
      }
    } catch (err) {
      setStatus(err.message || "Could not create share link.");
    }
  });

  shareWhatsappButton.addEventListener("click", async () => {
    try {
      if (!(await preview.checkFit()))
        throw new Error(
          "Content does not fit. Choose smaller text or edit your message before sharing.",
        );
      if (
        state.get().giftEnabled &&
        state.get().giftUrl &&
        !sanitizeGiftUrl(state.get().giftUrl)
      )
        throw new Error(
          "Use a valid HTTPS gift URL without username or password.",
        );
      const { url } = await buildShareUrlAsync(state.get());
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`You’ve got a card 🎉 ${url}`)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setStatus("Opening WhatsApp…");
    } catch (err) {
      setStatus(err.message || "Could not share to WhatsApp.");
    }
  });

  state.subscribe((current) => {
    document.getElementById("textSize").value = current.textSize || 18;
    renderThemes(current);
    renderStickerGallery(current);
    giftField.style.display = current.giftEnabled ? "" : "none";
    updateBirthdayUI(current);

    toInput.value = current.to || "";
    messageInput.value = current.message || "";
    fromInput.value = current.from || "";
    fontSelect.value = current.fontId || "fredoka";
    watermarkToggle.checked = !!current.watermark;
    giftToggle.checked = !!current.giftEnabled;
    giftInput.value = current.giftUrl || "";

    const basePaper = current.theme?.palette?.paper || "#fff7f2";
    const baseInk = current.theme?.palette?.ink || "#2b2622";
    paperColorInput.value = current.paperOverride || basePaper;
    inkColorInput.value = current.inkOverride || baseInk;

    const remaining = Array.from(current.message || "").length;
    const counter = document.getElementById("messageRemaining");
    if (counter)
      counter.textContent = `${remaining} characters · paragraphs preserved`;

    updatePreview(current);
    ensureStickers(current);
  });
}
