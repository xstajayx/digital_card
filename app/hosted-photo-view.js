// Recipient-only photo attachment. Reuses the existing book, layout CSS and controls.
export async function attachHostedPhoto(frame, photo, blob) {
  const doc = frame.contentDocument,
    root = doc.getElementById("cardRoot");
  if (
    !["cover", "memory"].includes(photo.kind) ||
    !["full", "framed", "inside"].includes(photo.layout) ||
    !["square", "portrait"].includes(photo.aspect) ||
    !["rectangle", "rounded", "paper", "gold"].includes(photo.border) ||
    typeof photo.alt !== "string" ||
    photo.alt.length > 160 ||
    (photo.kind === "cover" && photo.layout === "inside")
  )
    throw new Error("This card photo layout is invalid.");
  const style = doc.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("../assets/photo-card-frame.css", import.meta.url).href;
  await new Promise((resolve, reject) => {
    style.onload = resolve;
    style.onerror = () =>
      reject(new Error("This card photo could not be displayed."));
    doc.head.append(style);
  });
  const url = URL.createObjectURL(blob),
    figure = doc.createElement("figure"),
    image = doc.createElement("img"),
    back = doc.createElement("figure"),
    backImage = doc.createElement("img");
  figure.className = "local-photo-zone";
  image.className = "local-card-photo";
  image.alt = photo.alt || "Personal photograph";
  figure.append(image);
  back.className = "local-photo-back-zone";
  backImage.className = "local-card-photo-back";
  backImage.alt = "";
  back.append(backImage);
  image.src = url;
  await image.decode();
  if (
    image.naturalWidth > 1600 ||
    image.naturalHeight > 1600 ||
    Math.min(image.naturalWidth, image.naturalHeight) < 32
  ) {
    URL.revokeObjectURL(url);
    throw new Error("This card photo has unsupported dimensions.");
  }
  root.classList.add("local-photo-card");
  root.dataset.localLayout = photo.layout;
  root.dataset.localBorder = photo.border;
  root.dataset.localAspect = photo.aspect;
  root.dataset.localPage = "message";
  doc
    .querySelector(
      photo.layout === "inside" ? ".paper-left" : ".paper-front-face",
    )
    .prepend(figure);
  if (photo.layout === "inside") {
    backImage.src = url;
    doc.querySelector(".paper-inside-face").prepend(back);
  }
  const pages = document.createElement("div");
  pages.className = "recipient-photo-pages";
  pages.setAttribute("role", "group");
  pages.setAttribute("aria-label", "Inside card pages");
  const make = (text, value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "button";
    b.textContent = text;
    b.onclick = () => {
      root.dataset.localPage = value;
      layout();
    };
    pages.append(b);
    return b;
  };
  const photoButton = make("Photo", "photo"),
    messageButton = make("Message", "message");
  frame.after(pages);
  function layout() {
    const parent = figure.parentElement;
    if (photo.layout !== "full" && parent.clientWidth && parent.clientHeight) {
      const ratio = photo.aspect === "square" ? 1 : 0.75,
        w = Math.min(
          parent.clientWidth - 40,
          parent.clientHeight *
            (photo.layout === "inside" ? 0.78 : 0.54) *
            ratio,
        );
      figure.style.width = Math.max(1, w) + "px";
      figure.style.height = Math.max(1, w / ratio) + "px";
      back.style.width = figure.style.width;
      back.style.height = figure.style.height;
    }
    const inside = root.dataset.physicalState === "inside",
      mobile = frame.clientWidth <= 500,
      showing =
        inside &&
        mobile &&
        root.dataset.localPage === "photo" &&
        photo.layout === "inside";
    if (!inside) root.dataset.localPage = "message";
    pages.hidden = !(inside && mobile && photo.layout === "inside");
    const right = doc.querySelector(".paper-right");
    right.inert = !inside || showing;
    right.setAttribute("aria-hidden", String(!inside || showing));
    photoButton.setAttribute("aria-pressed", String(showing));
    messageButton.setAttribute("aria-pressed", String(!showing));
  }
  new ResizeObserver(layout).observe(frame);
  new MutationObserver(layout).observe(root, {
    attributes: true,
    attributeFilter: ["data-physical-state"],
  });
  layout();
  window.addEventListener("pagehide", (e) => {
    if (!e.persisted) URL.revokeObjectURL(url);
  });
}
