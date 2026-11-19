import { SPECIES } from "./artwork.js";

const NS = "http://www.w3.org/2000/svg";
let serial = 0;

function element(parent, name, attributes = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}

function path(parent, d, fill, options = {}) {
  return element(parent, "path", { d, fill, ...options });
}

function gradient(defs, id, colors, type = "linearGradient") {
  const node = element(defs, type, type === "radialGradient"
    ? { id, cx: ".35", cy: ".35", r: ".72" }
    : { id, x1: ".15", y1: "0", x2: ".75", y2: "1" });
  colors.forEach((color, index) =>
    element(node, "stop", { offset: index / (colors.length - 1), "stop-color": color }),
  );
  return `url(#${id})`;
}

function leaf(parent, x, y, angle, scale, green, blade = false) {
  const node = element(parent, "g", { transform: `translate(${x} ${y}) rotate(${angle}) scale(${scale})` });
  if (blade) {
    path(node, "M0 0 C-22 -23 -26 -54 -3 -102 C1 -80 23 -55 15 -30 C10 -15 5 -6 0 0Z", green);
    path(node, "M0 -2 Q-7 -44 -3 -94 M-4 -26 Q5 -48 8 -60", "none", { stroke: "#d3d4a1", "stroke-width": 1.2, opacity: .62 });
    return;
  }
  path(node, "M0 0 C-22 -13 -36 -39 -28 -55 Q-30 -59 -27 -63 Q-29 -69 -22 -73 Q-23 -77 -16 -81 L-12 -91 L-6 -88 L0 -101 L7 -89 L12 -91 L16 -81 Q23 -77 22 -73 Q30 -68 27 -61 Q31 -55 28 -50 C30 -30 17 -10 0 0Z", green);
  path(node, "M0 -1 Q-6 -35 0 -94 M-1 -23 Q-13 -36 -22 -43 M-2 -36 Q13 -49 23 -52 M-2 -47 Q-14 -61 -22 -65 M-1 -61 Q10 -73 16 -77", "none", { stroke: "#d3d4a1", "stroke-width": 1.35, opacity: .55 });
}

function foliage(svg, product, defs, base) {
  const green = gradient(defs, `${base}-green`, ["#a5ad72", "#637d4b", "#395b44"]);
  const bouquet = product.kind === "bouquet";
  const greens = element(svg, "g");
  for (const { x, y, species } of product.heads) {
    const bottom = bouquet ? 349 : 371;
    const tip = species === "tulip" ? y + 19 : y;
    const end = bouquet ? 180 + (x - 180) * .1 : 172;
    const line = `M${end} ${bottom} Q${x - 23} ${(tip + bottom) / 2} ${x} ${tip}`;
    path(greens, line, "none", { stroke: "#4e6944", "stroke-width": bouquet ? 3.3 : 5.2, "stroke-linecap": "round" });
    path(greens, line, "none", { stroke: "#a2ad70", "stroke-width": bouquet ? .7 : 1.5, opacity: .85 });
  }
  if (bouquet) {
    for (const [x, y, angle, scale] of [[136, 228, -62, .87], [115, 190, -56, .75], [109, 164, -56, .64], [231, 221, 68, .8], [252, 196, 62, .68], [246, 161, 51, .58], [151, 211, -26, .71], [207, 212, 27, .6]])
      leaf(greens, x, y, angle, scale, green);
    const paper = gradient(defs, `${base}-wrap`, ["#f9e8d2", product.wrap, "#a28b76"]);
    path(svg, "M79 174 Q116 193 151 181 L182 319 Q159 288 131 261 L97 246Z", paper);
    path(svg, "M278 174 Q258 193 217 184 L174 319 Q205 284 244 263 L261 240Z", paper);
    path(svg, "M80 189 Q133 204 176 230 Q215 203 279 191 Q247 264 185 322 Q150 292 117 264Z", paper, { stroke: "#9b8268", "stroke-opacity": .28 });
    path(svg, "M176 232 Q190 264 185 313", "none", { stroke: "#fff0db", "stroke-width": 1.3, opacity: .65 });
    path(svg, "M170 306 Q137 291 139 311 Q145 326 175 315 Q207 341 224 322 Q222 302 187 307", "none", { stroke: "#f5e4c9", "stroke-width": 5, "stroke-linecap": "round" });
    path(svg, "M174 316 Q157 336 151 348 M185 315 Q208 331 207 351", "none", { stroke: "#f5e4c9", "stroke-width": 4, "stroke-linecap": "round" });
    element(svg, "ellipse", { cx: 180, cy: 313, rx: 10, ry: 5, fill: "#e6cfae" });
  } else {
    const blade = ["tulip", "lily", "orchid"].includes(product.heads[0].species);
    leaf(greens, 166, 291, blade ? -37 : -51, blade ? 1.1 : .8, green, blade);
    leaf(greens, 169, 326, blade ? 49 : 63, blade ? 1.03 : .87, green, blade);
    leaf(greens, 172, 234, 53, blade ? .71 : .57, green, blade);
    if (!blade) leaf(greens, 119, 252, -21, .48, green);
  }
}

function center(parent, type, defs, key) {
  if (!type || type === "rose") return null;
  const node = element(parent, "g");
  if (type === "lily") {
    const stamens = element(node, "g", { transform: "rotate(-13)" });
    for (const [x, y] of [[-29, -31], [-18, -42], [2, -48], [22, -40], [34, -25]]) {
      path(stamens, `M0 9 Q${x * .6} -13 ${x} ${y}`, "none", { stroke: "#79734d", "stroke-width": 2 });
      element(stamens, "ellipse", { cx: x, cy: y, rx: 4, ry: 2.5, fill: "#a25a32", transform: `rotate(-24 ${x} ${y})` });
    }
  } else if (type === "orchid") {
    path(node, "M-4 -16 C-24 -12 -25 13 -15 26 C-7 39 -1 30 1 35 C16 42 23 24 19 13 C18 4 9 -10 6 -16Z", gradient(defs, `${key}-lip`, ["#fcf1cd", "#c870ba", "#76275f"]));
    path(node, "M-6 2 Q-7 -12 0 -17 Q11 -15 8 3 Q5 9 -6 2", "#fff3ca");
  } else {
    const seed = type === "seed";
    const radius = seed ? 37 : 21;
    const disc = gradient(defs, `${key}-disc`, seed ? ["#936743", "#543325", "#38271e"] : ["#ffe583", "#e4a735", "#a86824"], "radialGradient");
    element(node, "circle", { r: radius, fill: disc });
    for (let index = 0; index < (seed ? 112 : 60); index++) {
      const angle = index * 2.39996;
      const distance = Math.sqrt(index / (seed ? 112 : 60)) * (radius - 2);
      element(node, "ellipse", { cx: Math.cos(angle) * distance, cy: Math.sin(angle) * distance, rx: seed ? 1.72 : 1.28, ry: seed ? 1.05 : .9, fill: index % 3 ? "#fff0a8" : "#412818", opacity: index % 3 ? .35 : .54 });
    }
  }
  return node;
}

function flower(svg, defs, head, order, count, base) {
  const species = SPECIES[head.species];
  const key = `${base}-${order}`;
  const position = element(svg, "g", {
    transform: `translate(${head.x} ${head.y}) rotate(${head.angle}) scale(${head.scale})`,
    "data-species": head.species,
  });
  if (species.sepal)
    path(position, "M0 18 Q-18 3 -20 -18 Q-7 -15 0 -7 Q7 -16 21 -21 Q17 4 0 18Z", "#78874e");
  const fills = [
    gradient(defs, `${key}-pale`, [head.colors[0], head.colors[1], head.colors[2]]),
    gradient(defs, `${key}-mid`, [head.colors[0], head.colors[1], head.colors[2]], "radialGradient"),
    gradient(defs, `${key}-deep`, [head.colors[1], head.colors[0], head.colors[2]]),
  ];
  const petals = species.petals.map((petal, index) => {
    const node = element(position, "g");
    path(node, petal.path, fills[petal.palette], { stroke: head.colors[2], "stroke-width": .55, "stroke-opacity": .48 });
    const fold = head.species === "rose" ? "M-36 -52 Q-28 -73 -9 -74 M12 -73 Q30 -74 37 -56" : "M0 -6 Q-4 -36 0 -68";
    path(node, fold, "none", { stroke: head.colors[0], "stroke-width": .8, opacity: index % 3 ? .24 : .42, "stroke-linecap": "round" });
    const cup = ["tulip", "orchid"].includes(head.species);
    const bend = cup ? -Math.sign(petal.angle) * .7 : (index % 2 ? 1 : -1) * (.53 + index % 3 * .15);
    return { ...petal, node, bend };
  });
  const core = center(position, species.core, defs, key);
  const stagger = count === 1 ? 0 : order * 310 + order % 2 * 90;
  return { ...species, petals, core, stagger };
}

const clamp = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => value * value * (3 - 2 * value);
const mix = (a, b, t) => a + (b - a) * t;

export function renderFlowers(container, product, opened = true) {
  container.replaceChildren();
  const base = `flowers-${++serial}`;
  const svg = element(container, "svg", { viewBox: "0 0 360 410", role: "img", "aria-label": product.description });
  const defs = element(svg, "defs");
  foliage(svg, product, defs, base);
  const heads = product.heads.map((head, order) => flower(svg, defs, head, order, product.heads.length, base));
  const duration = Math.max(...heads.map(({ stagger, duration }) => stagger + duration));
  function draw(time) {
    for (const head of heads) {
      for (const petal of head.petals) {
        const progress = clamp((time - head.stagger - petal.delay) / (head.duration - petal.delay));
        if (petal.progress === progress) continue;
        petal.progress = progress;
        const first = progress < .57;
        const t = ease(first ? progress / .57 : (progress - .57) / .43);
        const [start, end] = first ? [head.closed, head.middle] : [head.middle, [1, 1]];
        const sx = mix(start[0], end[0], t) * petal.size;
        const sy = mix(start[1], end[1], t) * petal.size;
        const angle = petal.angle + (1 - ease(progress)) * head.twist * petal.bend;
        petal.node.setAttribute("transform", `rotate(${angle.toFixed(2)}) translate(0 ${(-petal.spread * ease(progress)).toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);
      }
      if (head.core) {
        const core = ease(clamp((time - head.stagger) / (head.duration * .75)));
        head.core.setAttribute("transform", `scale(${.36 + core * .64})`);
        head.core.setAttribute("opacity", .2 + core * .8);
      }
    }
    container.dataset.bloom = time === duration ? "open" : time === 0 ? "bud" : "opening";
  }
  draw(opened ? duration : 0);
  return { draw, duration };
}
