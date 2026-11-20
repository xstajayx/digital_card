const NS = "http://www.w3.org/2000/svg";
const HEART_PATH = "M32 57C25 53 5 40 3 24C1 13 7 5 17 5C24 5 29 9 32 14C37 7 42 5 48 5C59 5 65 14 61 26C57 40 42 51 32 57Z";
export function heartArt(color) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 64 62");
  svg.setAttribute("aria-hidden", "true");
  svg.style.color = color;
  const layers = [
    [HEART_PATH, "currentColor", { stroke: "#76566a", "stroke-opacity": ".26", "stroke-width": "1" }],
    ["M5 26C9 36 22 48 32 52C41 48 54 37 59 27C56 39 43 52 32 57C22 51 9 41 5 26Z", "#734b62", { opacity: ".18" }],
    ["M8 21C8 12 18 8 25 13C20 11 13 16 12 22C10 25 8 24 8 21Z", "#fff", { opacity: ".53" }],
    ["M36 15C43 8 53 10 57 17C52 13 45 12 40 17C37 20 35 18 36 15Z", "#fff", { opacity: ".28" }],
  ];
  for (const [d, fill, attrs] of layers) {
    const path = document.createElementNS(NS, "path");
    for (const [name, value] of Object.entries({ d, fill, ...attrs })) path.setAttribute(name, value);
    svg.append(path);
  }
  return svg;
}

export function createJarArt(container, theme) {
  container.classList.add("jar-art");
  container.style.setProperty("--jar-ink", theme.ink);
  container.style.setProperty("--jar-tint", theme.tint);
  container.setAttribute("aria-hidden", "true");
  const glass = document.createElement("div");
  glass.className = "jar-glass";
  const pieces = document.createElement("div");
  pieces.className = "jar-pieces";
  const label = document.createElement("div");
  label.className = "jar-label";
  const stamp = document.createElement("span");
  stamp.textContent = theme.stamp;
  const title = document.createElement("strong");
  label.append(stamp, title);
  const lid = document.createElement("div");
  lid.className = "jar-lid";
  glass.append(pieces, label);
  container.append(glass, lid);
  function fill(count, drop = false) {
    const old = pieces.childElementCount;
    while (pieces.childElementCount > count) pieces.lastElementChild.remove();
    for (let index = pieces.childElementCount; index < count; index++) {
      const heart = heartArt(theme.colors[index % theme.colors.length]);
      const row = Math.floor(index / 5);
      const slot = index % 5;
      heart.style.setProperty("--heart-x", `${slot * 16.6 + 4 + (row % 2) * 4 + ((index * 19) % 5)}%`);
      heart.style.setProperty("--heart-y", `${4 + row * 16 + (index * 11) % 8}%`);
      heart.style.setProperty("--heart-turn", `${(index * 43) % 63 - 33}deg`);
      if (drop && index >= old) heart.classList.add("jar-drop");
      pieces.append(heart);
    }
  }
  return { fill, title: (value) => { title.textContent = value || theme.title; } };
}
