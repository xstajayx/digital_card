export function roseImage(stage) {
  const image = document.createElement("img");
  const base = new URL(`../assets/rose/${stage.id}`, import.meta.url);
  image.width = 640;
  image.height = 960;
  image.alt = stage.alt;
  image.sizes = "(max-width: 480px) calc(100vw - 36px), 430px";
  image.srcset = `${base}-480.webp 480w, ${base}-960.webp 960w`;
  image.src = `${base}-480.webp`;
  return image;
}

export function writeRoseNote(container, { greeting, message, signature }) {
  container.hidden = greeting === "" && message === "" && signature === "";
  for (const [part, value] of Object.entries({ greeting, message, signature })) {
    const node = container.querySelector(`[data-note="${part}"]`);
    node.textContent = value;
    node.hidden = value === "";
  }
}
