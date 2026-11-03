// Sender-only adapter. Shared card schemas, rendering and opening controllers stay unchanged.
import { defaultPhysical } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
import { cardContent, validateCard } from "../engine/card-data.js";
import {
  normalizePhoto,
  loadPhoto,
  drawCrop,
  editedPhoto,
  validateEdit,
} from "./photo-image.js";
import { photoDraft } from "./photo-drafts.js";
const sessions = new WeakMap();
export function assertPhotoShareable(state) {
  if (sessions.get(state)?.active)
    throw new Error(
      "Photo cards are local previews only. Photos cannot be shared yet. Choose Traditional illustrated card to share an illustrated version.",
    );
}
const node = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
export function bindPhotoEditor(state, preview) {
  const frame = document.getElementById("cardPreview"),
    doc = frame.contentDocument,
    root = doc.getElementById("cardRoot");
  let wasActive = false,
    mode = "illustrated",
    edit = validateEdit(),
    source = null,
    loaded = null,
    outputUrl = "",
    busy = 0,
    rendering = 0,
    drawing = 0,
    dragging = null,
    processing = false;
  const box = node("fieldset", "picker-section photo-picker"),
    legend = node("legend", null, "A proper card, made personal");
  box.append(legend);
  const intro = node(
    "p",
    "helper",
    "Photo cards are local previews only — they cannot be shared yet. Your photo is processed on this device, never uploaded.",
  );
  box.append(intro);
  const fields = {};
  function field(key, title, type, options) {
    const label = node("label", "field"),
      span = node("span", null, title),
      input = node(type === "select" ? "select" : "input");
    input.id = "photo-" + key;
    if (type !== "select") input.type = type;
    if (options)
      for (const [value, text] of options) {
        const o = node("option", null, text);
        o.value = value;
        input.append(o);
      }
    fields[key] = input;
    label.append(span, input);
    box.append(label);
    return input;
  }
  const type = field("type", "Card type", "select", [
    ["illustrated", "Traditional illustrated card"],
    ["cover", "Photo cover card · local preview"],
    ["memory", "Photo memory card · local preview"],
  ]);
  const controls = node("div", "photo-controls");
  box.append(controls);
  const uploadLabel = node("label", "field"),
    uploadTitle = node("span", null, "Choose or replace your photo"),
    upload = node("input");
  upload.type = "file";
  upload.id = "localPhotoUpload";
  upload.accept = "image/jpeg,image/png,image/webp";
  uploadLabel.append(uploadTitle, upload);
  controls.append(uploadLabel);
  controls.append(
    node(
      "p",
      "helper",
      "JPEG, PNG or still WebP · up to 10 MB / 24 megapixels. Edited copies are re-encoded without original metadata. Tiny images may look soft.",
    ),
  );
  function moveField(key, title, type, options) {
    const input = field(key, title, type, options);
    controls.append(input.parentElement);
    return input;
  }
  const layout = moveField("layout", "Photo placement", "select", [
    ["framed", "Framed photograph on cover"],
    ["full", "Full-cover photograph with a greeting band"],
    ["inside", "Inside-left photograph"],
  ]);
  const aspect = moveField("aspect", "Photo frame", "select", [
    ["portrait", "Portrait · 3:4"],
    ["square", "Square · 1:1"],
  ]);
  const border = moveField("border", "Photo finish", "select", [
    ["paper", "Paper mount"],
    ["gold", "Gold frame"],
    ["rectangle", "Simple rectangle"],
    ["rounded", "Soft rounded corners"],
  ]);
  const alt = moveField(
    "alt",
    "Describe your photo (for accessible preview)",
    "text",
  );
  alt.maxLength = 160;
  alt.value = edit.alt;
  const canvas = node("canvas", "photo-crop-canvas");
  canvas.id = "photoCropCanvas";
  canvas.width = 450;
  canvas.height = 600;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Photo crop preview. Drag to reposition, or use the labelled position sliders.",
  );
  controls.append(canvas);
  for (const [key, title, min, max, step] of [
    ["zoom", "Zoom", 1, 3, 0.01],
    ["x", "Horizontal position", -1, 1, 0.01],
    ["y", "Vertical position", -1, 1, 0.01],
  ]) {
    const input = moveField(key, title, "range");
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = edit[key];
  }
  const actions = node("div", "photo-actions");
  controls.append(actions);
  function button(title, handler, parent = actions) {
    const b = node("button", "button small", title);
    b.type = "button";
    b.onclick = handler;
    parent.append(b);
    return b;
  }
  const rotate = button("Rotate 90°", () =>
    change({ ...edit, rotation: (edit.rotation + 90) % 360 }),
  );
  rotate.id = "photoRotate";
  button("Reset crop", () =>
    change({ ...edit, zoom: 1, x: 0, y: 0, rotation: 0 }),
  );
  const remove = button("Remove photo", () => {
    busy++;
    processing = false;
    release();
    source = null;
    mode = "illustrated";
    sync();
    apply();
    say("Photo removed. The illustrated card is available for sharing.");
  });
  remove.id = "photoRemove";
  const status = node("p", "photo-status");
  status.id = "photoStatus";
  status.setAttribute("role", "status");
  box.append(status);
  const error = node("p", "warning");
  error.id = "photoError";
  error.setAttribute("role", "alert");
  box.append(error);
  const drafts = node("div", "photo-actions");
  box.append(drafts);
  button(
    "Save photo draft",
    () => saveDraft().catch((e) => problem(e.message)),
    drafts,
  ).id = "savePhotoDraft";
  button(
    "Restore photo draft",
    () => restoreDraft().catch((e) => problem(e.message)),
    drafts,
  ).id = "restorePhotoDraft";
  button(
    "Delete photo draft",
    () => deleteDraft().catch((e) => problem(e.message)),
    drafts,
  ).id = "deletePhotoDraft";
  box.append(
    node(
      "p",
      "helper",
      "Save photo draft stores a processed photo and this card in IndexedDB on this browser/device. It is separate from your illustrated draft. Anyone using this browser may access it; clearing browser data or private browsing may lose it. Unsaved photos are lost on refresh.",
    ),
  );
  document.querySelector('[data-panel="4"] .extras').before(box);
  const notice = node(
    "p",
    "photo-local-notice",
    "Local photo preview · Sharing is unavailable until secure photo storage is ready.",
  );
  notice.id = "photoLocalNotice";
  notice.setAttribute("role", "status");
  document.querySelector(".preview-heading").after(notice);
  const pages = node("div", "photo-page-switch");
  pages.setAttribute("role", "group");
  pages.setAttribute("aria-label", "Inside card pages");
  document.querySelector(".preview-stage").after(pages);
  const photoPage = button("Inside photo page", () => page("photo"), pages),
    messagePage = button("Inside message page", () => page("message"), pages);
  photoPage.id = "photoPage";
  messagePage.id = "messagePage";
  const style = doc.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("../assets/photo-card-frame.css", import.meta.url).href;
  style.onload = () => {
    apply();
    if (mode !== "illustrated" && source)
      preview.checkFit().catch((e) => problem(e.message));
  };
  doc.head.append(style);
  const figure = node("figure", "local-photo-zone"),
    image = node("img", "local-card-photo");
  figure.append(image);
  figure.hidden = true;
  // The unfolded cover's reverse face lies above the stationary left page.
  // Mirror the photo on that native face, as the engine does for illustrations.
  const backFigure = node("figure", "local-photo-back-zone");
  const backImage = node("img", "local-card-photo-back");
  backImage.alt = "";
  backFigure.append(backImage);
  backFigure.hidden = true;
  doc.querySelector(".paper-inside-face").append(backFigure);
  doc.querySelector(".paper-front-face").prepend(figure);
  function say(text) {
    status.textContent = text;
    error.textContent = "";
  }
  function problem(text) {
    error.textContent = text;
  }
  function release() {
    rendering++;
    if (loaded) URL.revokeObjectURL(loaded.url);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    loaded = null;
    outputUrl = "";
    image.removeAttribute("src");
    backImage.removeAttribute("src");
  }
  function page(value) {
    root.dataset.localPage = value;
    syncPages();
  }
  function syncPages() {
    const inside = root.dataset.physicalState === "inside",
      mobile = frame.clientWidth <= 500;
    if (!inside) root.dataset.localPage = "message";
    pages.hidden = !(
      mode === "memory" &&
      edit.layout === "inside" &&
      inside &&
      mobile &&
      source
    );
    const showing =
      inside &&
      root.dataset.localPage === "photo" &&
      mobile &&
      mode !== "illustrated" &&
      edit.layout === "inside";
    {
      const right = doc.querySelector(".paper-right");
      right.inert = !inside || showing;
      right.setAttribute("aria-hidden", String(!inside || showing));
    }
    photoPage.setAttribute("aria-pressed", String(showing));
    messagePage.setAttribute("aria-pressed", String(!showing));
  }
  new MutationObserver(syncPages).observe(root, {
    attributes: true,
    attributeFilter: ["data-physical-state"],
  });
  new ResizeObserver(() => {
    apply();
  }).observe(frame);
  function sync() {
    type.value = mode;
    controls.hidden = mode === "illustrated";
    notice.hidden = mode === "illustrated";
    canvas.hidden = !source;
    for (const key of ["layout", "aspect", "border", "alt", "zoom", "x", "y"])
      fields[key].value = edit[key];
    [...layout.options].find((o) => o.value === "inside").disabled =
      mode !== "memory";
    for (const el of [
      rotate,
      remove,
      ...["zoom", "x", "y"].map((k) => fields[k]),
    ])
      el.disabled = !source;
    if (mode !== "illustrated") {
      document.getElementById("shareFallback").hidden = true;
      document.querySelector(".transport-link")?.remove();
      document.getElementById("rememberOccasionPrompt").hidden = true;
      document.getElementById("exportStatus").textContent =
        "Photo cards are local previews only. No photo-sharing link can be created yet.";
    }
    if (mode === "illustrated" && wasActive)
      document.getElementById("exportStatus").textContent =
        "Illustrated card selected. You can share it once all the text fits.";
    wasActive = mode !== "illustrated";
    syncPages();
  }
  function apply() {
    const active = mode !== "illustrated",
      ready = active && !!outputUrl;
    root.classList.toggle("local-photo-card", ready);
    root.dataset.localLayout = ready ? edit.layout : "";
    root.dataset.localBorder = edit.border;
    root.dataset.localAspect = edit.aspect;
    figure.hidden = !ready;
    backFigure.hidden = !ready || edit.layout !== "inside";
    if (!ready || edit.layout !== "inside") backImage.removeAttribute("src");
    if (ready) {
      const parent = doc.querySelector(
        edit.layout === "inside" ? ".paper-left" : ".paper-front-face",
      );
      if (figure.parentElement !== parent) parent.prepend(figure);
      image.src = outputUrl;
      image.alt = edit.alt || "Personal photograph";
      if (edit.layout === "full") {
        figure.style.width = "";
        figure.style.height = "";
      } else if (parent.clientWidth && parent.clientHeight) {
        const ratio = edit.aspect === "square" ? 1 : 0.75;
        const width = Math.min(
          parent.clientWidth - 40,
          parent.clientHeight *
            (edit.layout === "inside" ? 0.78 : 0.54) *
            ratio,
        );
        figure.style.width = Math.max(1, width) + "px";
        figure.style.height = Math.max(1, width / ratio) + "px";
      }
    }
    if (ready && edit.layout === "inside") {
      backImage.src = outputUrl;
      backFigure.style.width = figure.style.width;
      backFigure.style.height = figure.style.height;
    }
    syncPages();
  }
  function scheduleApply() {
    queueMicrotask(() =>
      requestAnimationFrame(() => {
        apply();
      }),
    );
  }
  async function render() {
    const run = ++rendering;
    if (!loaded) {
      apply();
      return;
    }
    canvas.height = edit.aspect === "square" ? 450 : 600;
    drawCrop(canvas, loaded.image, edit);
    const blob = await editedPhoto(loaded.image, edit);
    if (run !== rendering) return;
    const previous = outputUrl;
    outputUrl = URL.createObjectURL(blob);
    apply();
    if (previous) URL.revokeObjectURL(previous);
    await preview.checkFit();
  }
  function change(next) {
    try {
      edit = validateEdit(next);
      sync();
      // Placement, finish and accessibility update in the same event. Raster
      // encoding may finish later without leaving the photo on the old page.
      apply();
      cancelAnimationFrame(drawing);
      drawing = requestAnimationFrame(() =>
        render().catch((e) => problem(e.message)),
      );
    } catch (e) {
      problem(e.message);
    }
  }
  function ensurePhysical() {
    const s = state.get();
    if (!s.physicalConfig)
      state.set({
        physicalConfig: defaultPhysical(),
        openingConfig: {
          ...(s.openingConfig || defaultOpening()),
          type: "envelope",
        },
      });
  }
  type.onchange = () => {
    busy++;
    processing = false;
    mode = type.value;
    if (mode !== "illustrated") {
      if (mode === "cover" && edit.layout === "inside")
        edit = { ...edit, layout: "framed" };
      ensurePhysical();
    }
    sync();
    apply();
    if (mode !== "illustrated")
      say(
        source
          ? "Your local photo is ready to edit. Sharing is unavailable."
          : "Choose a photo to create your local preview.",
      );
  };
  for (const key of ["layout", "aspect", "border", "alt", "zoom", "x", "y"])
    fields[key].addEventListener(
      ["zoom", "x", "y", "alt"].includes(key) ? "input" : "change",
      () =>
        change({
          ...edit,
          [key]: ["zoom", "x", "y"].includes(key)
            ? Number(fields[key].value)
            : fields[key].value,
        }),
    );
  upload.onchange = async () => {
    const file = upload.files?.[0],
      run = ++busy;
    upload.value = "";
    if (!file) return;
    processing = true;
    say("Processing your photo on this device…");
    try {
      const blob = await normalizePhoto(file),
        next = await loadPhoto(blob);
      if (run !== busy) {
        URL.revokeObjectURL(next.url);
        return;
      }
      release();
      source = blob;
      loaded = next;
      edit = { ...edit, zoom: 1, x: 0, y: 0, rotation: 0 };
      ensurePhysical();
      sync();
      await render();
      say(
        "Local photo preview ready. Adjust the crop, then preview the front cover or inside pages below.",
      );
    } catch (e) {
      if (run === busy) problem(e.message);
    } finally {
      if (run === busy) processing = false;
    }
  };
  canvas.onpointerdown = (e) => {
    if (!loaded) return;
    dragging = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      edit: { ...edit },
    };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    const rect = canvas.getBoundingClientRect();
    change({
      ...edit,
      x: Math.max(
        -1,
        Math.min(
          1,
          dragging.edit.x + ((e.clientX - dragging.x) / rect.width) * 2,
        ),
      ),
      y: Math.max(
        -1,
        Math.min(
          1,
          dragging.edit.y + ((e.clientY - dragging.y) / rect.height) * 2,
        ),
      ),
    });
  };
  canvas.onpointerup = canvas.onpointercancel = () => {
    dragging = null;
  };
  async function saveDraft() {
    if (processing)
      throw new Error("Wait for the photo to finish processing before saving.");
    if (mode === "illustrated" || !source)
      throw new Error(
        "Choose a photo card and add a photo before saving a photo draft.",
      );
    const current = state.get(),
      card = validateCard({ ...cardContent(current), v: 5 }, current.themes);
    await photoDraft("write", {
      version: 1,
      card,
      mode,
      edit: validateEdit(edit),
      blob: source,
    });
    say(
      "Photo draft saved on this browser/device. It is still a local preview and cannot be shared.",
    );
    return "Photo draft saved on this browser/device. Use Restore photo draft in Personalise to recover it.";
  }
  async function restoreDraft() {
    const run = ++busy;
    processing = true;
    try {
      const raw = await photoDraft("read");
      if (
        !raw ||
        raw.version !== 1 ||
        !["cover", "memory"].includes(raw.mode) ||
        !(raw.blob instanceof Blob)
      )
        throw new Error(
          "No complete photo draft was found. Your current card was kept.",
        );
      const card = validateCard(raw.card, state.get().themes),
        crop = validateEdit(raw.edit);
      if (
        !card.physicalConfig ||
        (raw.mode === "cover" && crop.layout === "inside")
      )
        throw new Error(
          "The saved photo layout is not supported. Your current card was kept.",
        );
      const clean = await normalizePhoto(raw.blob),
        next = await loadPhoto(clean);
      if (run !== busy) {
        URL.revokeObjectURL(next.url);
        throw new Error(
          "A newer photo action cancelled this restore. Your current card was kept.",
        );
      }
      release();
      source = clean;
      loaded = next;
      mode = raw.mode;
      edit = crop;
      state.set({
        ...card,
        openingConfig: card.openingConfig,
        physicalConfig: card.physicalConfig,
        birthdayNumberEnabled: !!card.birthdayNumber,
        giftEnabled: !!card.giftUrl,
        fontChosen: true,
      });
      sync();
      await render();
      say(
        "Local photo draft restored. Nothing has been uploaded; sharing remains unavailable.",
      );
      return "Photo draft restored.";
    } finally {
      if (run === busy) processing = false;
    }
  }
  async function deleteDraft() {
    await photoDraft("delete");
    say(
      "Saved photo draft deleted from this browser. Your current preview is kept.",
    );
    return "Saved photo draft deleted. Your current preview is kept.";
  }
  const session = {
    get active() {
      return mode !== "illustrated";
    },
    saveDraft,
    restoreDraft,
    deleteDraft,
    illustrated() {
      busy++;
      processing = false;
      mode = "illustrated";
      sync();
      apply();
    },
  };
  sessions.set(state, session);
  state.subscribe((s, changed) => {
    if (
      mode !== "illustrated" &&
      changed.includes("physicalConfig") &&
      !s.physicalConfig
    )
      mode = "illustrated";
    scheduleApply();
    sync();
  });
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      busy++;
      release();
    }
  });
  sync();
  return session;
}
