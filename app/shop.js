import { loadThemes, cardContent } from "../engine/card-data.js";
import { ILLUSTRATIONS, illustrationUrl } from "../engine/illustrations.js";
import { createCardController } from "../engine/preview.js";
const $ = (id) => document.getElementById(id);
$("menuToggle").onclick = () => {
  const open = $("menuToggle").getAttribute("aria-expanded") !== "true";
  $("menuToggle").setAttribute("aria-expanded", String(open));
  $("shopLinks").classList.toggle("is-open", open);
};
let previewPromise,
  previewVersion = 0;
async function init() {
  try {
    const themes = await loadThemes();
    for (const [id, entries] of [
      [
        "occasion",
        [...new Map(themes.map((t) => [t.occasionId, t.occasion])).entries()],
      ],
      [
        "opening",
        [...new Set(themes.map((t) => t.features.opening))].map((x) => [x, x]),
      ],
    ])
      for (const [value, label] of entries) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        $(id).append(option);
      }
    $("occasion").value =
      new URLSearchParams(location.search).get("occasion") || "";
    const grid = $("cardGrid");
    for (const theme of themes) {
      const article = document.createElement("article");
      article.className = "shop-card";
      article.dataset.id = theme.id;
      const thumbnail = document.createElement("div");
      thumbnail.className = "shop-thumbnail";
      thumbnail.style.backgroundColor = theme.palette.paper;
      thumbnail.style.color = theme.palette.ink;
      const title = document.createElement("strong");
      title.textContent = theme.greeting;
      const image = document.createElement("img");
      image.src = illustrationUrl(ILLUSTRATIONS[theme.id][0]);
      image.alt = "";
      image.loading = "lazy";
      thumbnail.append(title, image);
      const name = document.createElement("h3");
      name.textContent = theme.name;
      const metadata = document.createElement("p");
      metadata.textContent = `${theme.occasion} · ${theme.style} · ${theme.features.opening}`;
      const customise = document.createElement("a");
      customise.className = "button primary";
      customise.href = `./studio.html?design=${encodeURIComponent(theme.id)}`;
      customise.textContent = "Customise →";
      const button = document.createElement("button");
      button.className = "text-button";
      button.textContent = "Preview design";
      button.onclick = async () => {
        const request = ++previewVersion;
        $("designPreview").showModal();
        $("previewName").textContent = theme.name;
        $("previewCustomise").href = customise.href;
        try {
          previewPromise ??= createCardController($("shopPreview"));
          const preview = await previewPromise;
          if (request !== previewVersion) return;
          preview.update(
            cardContent({
              theme,
              ...theme.defaults,
              fontId: theme.defaultFontId,
              textSize: 18,
              watermark: true,
              stickerId: ILLUSTRATIONS[theme.id][0].id,
            }),
          );
          await preview.checkFit();
        } catch {
          $("previewName").textContent =
            "Preview unavailable. You can still open this design in the studio.";
        }
      };
      article.append(thumbnail, name, metadata, customise, button);
      grid.append(article);
    }
    function filter() {
      let count = 0;
      for (const node of grid.children) {
        const theme = themes.find((t) => t.id === node.dataset.id);
        const query = $("search").value.trim().toLowerCase();
        node.hidden = !(
          JSON.stringify([theme.name, theme.occasion, theme.style])
            .toLowerCase()
            .includes(query) &&
          (!$("occasion").value || theme.occasionId === $("occasion").value) &&
          (!$("collection").value || theme.group === $("collection").value) &&
          (!$("opening").value || theme.features.opening === $("opening").value)
        );
        if (!node.hidden) count++;
      }
      $("catalogueStatus").textContent = count
        ? `${count} designs, ready for your words.`
        : "No matching cards. Clear a filter and try again.";
    }
    $("filters").oninput = filter;
    $("filters").onchange = filter;
    $("filters").onreset = () => setTimeout(filter, 0);
    filter();
  } catch {
    $("catalogueStatus").textContent =
      "The collection could not load. Refresh to try again.";
  }
}
$("closePreview").onclick = () => {
  previewVersion++;
  $("designPreview").close();
};
init();
