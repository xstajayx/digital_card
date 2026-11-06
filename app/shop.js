import { loadThemes, cardContent } from "../engine/card-data.js";
import { ILLUSTRATIONS, illustrationUrl } from "../engine/illustrations.js";
import { createCardController } from "../engine/preview.js";
import {
  FEATURED_COLLECTIONS,
  artPack,
  designDefaults,
  designMetadata,
  matchesDesign,
} from "../engine/catalogue.js";
import { defaultPhysical } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
const $ = (id) => document.getElementById(id);
const make = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const fontNames = {
  fredoka: "Fredoka",
  pacifico: "Pacifico",
  quicksand: "Quicksand",
  poppins: "Poppins",
  nunito: "Nunito",
  playfair: "Playfair Display",
};
$("menuToggle").onclick = () => {
  const open = $("menuToggle").getAttribute("aria-expanded") !== "true";
  $("menuToggle").setAttribute("aria-expanded", String(open));
  $("shopLinks").classList.toggle("is-open", open);
};
const filterIds = [
  "search",
  "occasion",
  "collection",
  "opening",
  "style",
  "relationship",
  "interest",
  "tone",
];
let previewPromise,
  previewVersion = 0,
  activePreview;
function selectStage(stage) {
  activePreview?.physicalStage(stage);
  $("previewStages")
    .querySelectorAll("button")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.stage === stage)),
    );
}
$("previewStages").onclick = (event) => {
  const b = event.target.closest("[data-stage]");
  if (b) selectStage(b.dataset.stage);
};
$("closePreview").onclick = () => $("designPreview").close();
$("designPreview").addEventListener("close", () => {
  previewVersion++;
  activePreview = null;
});
async function openPreview(theme, href) {
  const request = ++previewVersion;
  $("designPreview").showModal();
  $("previewName").textContent = theme.name;
  $("previewCustomise").href = href;
  $("previewStatus").textContent = "Preparing your card…";
  try {
    previewPromise ??= createCardController($("shopPreview")).catch((error) => {
      previewPromise = null;
      throw error;
    });
    const preview = await previewPromise;
    if (request !== previewVersion) return;
    const recommended = designDefaults(theme);
    preview.update(
      cardContent({
        theme,
        ...theme.defaults,
        to: "",
        from: "",
        textSize: 18,
        watermark: true,
        fontId: theme.defaultFontId,
        stickerId: ILLUSTRATIONS[theme.id][0].id,
        physicalConfig: {
          ...defaultPhysical(),
          coverName: "",
          handwriting: theme.defaultFontId,
          signature: theme.defaultFontId,
        },
        openingConfig: { ...defaultOpening(), tone: "theme" },
        ...recommended,
      }),
    );
    const valid = await preview.checkFit();
    if (request !== previewVersion) return;
    activePreview = preview;
    selectStage("cover");
    $("previewStatus").textContent = valid
      ? "A matching envelope, an illustrated cover, and room for your words."
      : "Open in the creator to adjust the message size.";
  } catch {
    if (request === previewVersion)
      $("previewStatus").textContent =
        "Preview unavailable. You can still open this design in the creator.";
  }
}
async function init() {
  try {
    const themes = await loadThemes();
    const nodes = [];
    function options(id, entries) {
      for (const [value, label] of entries) {
        const option = make("option", null, label);
        option.value = value;
        $(id).append(option);
      }
    }
    options("occasion", [
      ...new Map(themes.map((t) => [t.occasionId, t.occasion])).entries(),
    ]);
    options(
      "opening",
      [...new Set(themes.map((t) => t.features.opening))].map((x) => [x, x]),
    );
    options(
      "style",
      [
        ...new Map(
          themes.map((t) => {
            const m = designMetadata(t);
            return [m.styleFamily, m.styleLabel];
          }),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    );
    for (const id of ["relationship", "interest", "tone"]) {
      const key = {
        relationship: "relationships",
        interest: "interests",
        tone: "tones",
      }[id];
      options(
        id,
        [...new Set(themes.flatMap((t) => designMetadata(t)[key]))]
          .sort()
          .map((x) => [x, x.replaceAll("-", " ")]),
      );
    }
    options(
      "collection",
      FEATURED_COLLECTIONS.map((c) => [c.id, c.name]),
    );
    for (const c of FEATURED_COLLECTIONS) {
      const b = make("button", "collection-tile");
      b.type = "button";
      b.dataset.collection = c.id;
      b.setAttribute("aria-pressed", "false");
      b.append(make("strong", null, c.name), make("span", null, c.description));
      b.onclick = () => {
        $("collection").value = $("collection").value === c.id ? "" : c.id;
        filter();
        $("catalogueResults").scrollIntoView({
          block: "start",
          behavior: "instant",
        });
      };
      $("featuredCollections").append(b);
    }
    const selected = new URLSearchParams(location.search).get("occasion");
    if ([...$("occasion").options].some((o) => o.value === selected))
      $("occasion").value = selected;
    const fragment = document.createDocumentFragment();
    const spotlight = [
      "birthday-garden",
      "birthday-fishing",
      "christmas-robin",
      "birthday-gilded",
      "birthday-gaming",
      "home-keys",
      "sympathy-dove",
      "birthday-books",
    ];
    const ordered = [...themes].sort((a, b) => {
      const rank = (t) =>
        spotlight.includes(t.id)
          ? spotlight.indexOf(t.id)
          : t.catalogue
            ? 20
            : 30;
      return rank(a) - rank(b);
    });
    for (const theme of ordered) {
      const meta = designMetadata(theme),
        pack = artPack(theme);
      const article = make("article", "shop-card");
      article.dataset.id = theme.id;
      const thumbnail = make("div", "shop-thumbnail");
      thumbnail.dataset.style = meta.styleFamily;
      thumbnail.style.backgroundColor = theme.palette.paper;
      thumbnail.style.color = theme.palette.ink;
      thumbnail.style.setProperty(
        "--thumbnail-font",
        `"${fontNames[theme.defaultFontId]}"`,
      );
      thumbnail.append(
        make("span", "thumbnail-occasion", theme.occasion),
        make("strong", null, theme.greeting),
      );
      const item = pack?.artwork[0] || ILLUSTRATIONS[theme.id][0];
      const image = make("img");
      image.src = illustrationUrl(item);
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.width = 200;
      image.height = 180;
      thumbnail.append(image);
      const name = make("h3", null, theme.name),
        description = make(
          "p",
          "card-description",
          meta.subtitle || `${theme.occasion} · ${meta.styleLabel}`,
        );
      const customize = make("a", "button primary", "Make it yours →");
      customize.href = `./studio.html?design=${encodeURIComponent(theme.id)}`;
      const button = make("button", "text-button", "Quick preview");
      button.type = "button";
      button.setAttribute("aria-label", `Preview ${theme.name}`);
      button.onclick = () => openPreview(theme, customize.href);
      article.append(thumbnail, name, description, customize, button);
      fragment.append(article);
      nodes.push({ theme, article });
    }
    $("cardGrid").append(fragment);
    $("catalogueCount").textContent =
      `${themes.length} designs · ${new Set(themes.map((t) => t.occasionId)).size} occasions`;
    function filter() {
      const filters = Object.fromEntries(
        filterIds.map((id) => [id, $(id).value]),
      );
      let count = 0;
      for (const { theme, article } of nodes) {
        article.hidden = !matchesDesign(theme, filters);
        if (!article.hidden) count++;
      }
      $("catalogueStatus").textContent = count
        ? `${count} designs, ready for your words.`
        : "No matching cards. Clear a filter and try again.";
      $("featuredCollections")
        .querySelectorAll("button")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.collection === filters.collection),
          ),
        );
    }
    // The list is built once. Filtering changes visibility, preserving focus and loaded assets.
    let timer;
    $("filters").oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(filter, 70);
    };
    $("filters").onchange = () => {
      clearTimeout(timer);
      filter();
    };
    $("filters").onreset = () => setTimeout(filter, 0);
    filter();
  } catch (error) {
    $("catalogueStatus").textContent =
      "The collection could not load. Refresh to try again.";
  }
}
init();
