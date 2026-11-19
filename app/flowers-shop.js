import { FLOWERS } from "../engine/flowers/catalogue.js";
import { renderFlowers } from "../engine/flowers/render.js";

const grid = document.querySelector("#flowerGrid");
const filters = document.querySelector("#flowerFilters");
const cards = FLOWERS.map((product) => {
  const item = document.createElement("article");
  item.className = "flower-card";
  const link = document.createElement("a");
  link.href = `./flower-studio.html?flower=${product.id}`;
  link.className = "flower-product";
  const art = document.createElement("div");
  art.className = "flower-tile-art";
  art.setAttribute("aria-hidden", "true");
  const detail = document.createElement("div");
  detail.className = "flower-tile-detail";
  const name = document.createElement("h2");
  name.textContent = product.name;
  const description = document.createElement("p");
  description.textContent = product.description;
  const action = document.createElement("span");
  action.className = "flower-tile-action";
  action.textContent = "Choose flower →";
  if (product.kind === "bouquet") action.textContent = "Choose bouquet →";
  detail.append(name, description, action);
  link.append(art, detail);
  item.append(link);
  grid.append(item);
  renderFlowers(art, product);
  return { product, item };
});

filters.addEventListener("click", (event) => {
  const control = event.target.closest("button[data-filter]");
  if (!control) return;
  for (const button of filters.querySelectorAll("button"))
    button.setAttribute("aria-pressed", String(button === control));
  const id = control.dataset.filter;
  let shown = 0;
  for (const { product, item } of cards) {
    item.hidden = id !== "all" && id !== product.kind && !product.occasions.includes(id);
    if (!item.hidden) shown++;
  }
  document.querySelector("#flowerCount").textContent = `${shown} gifts`;
});
