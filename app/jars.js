import { JAR_THEMES, jarTheme } from "../engine/heart-jar.js";
import { createJarArt } from "./jar-art.js";

const gallery = document.querySelector("#jarCollection");
if (gallery) {
  for (const theme of JAR_THEMES) {
    const article = document.createElement("article");
    article.className = "jar-tile";
    const image = document.createElement("div");
    const jar = createJarArt(image, theme);
    jar.title(theme.title);
    jar.fill(19);
    const body = document.createElement("div");
    body.className = "jar-tile-body";
    const title = document.createElement("h2");
    title.textContent = theme.title;
    const description = document.createElement("p");
    description.textContent = theme.description;
    const link = document.createElement("a");
    link.className = "jar-button";
    link.href = `./jar-studio.html?theme=${theme.id}`;
    link.textContent = "Choose this jar";
    link.setAttribute("aria-label", `Choose ${theme.title}`);
    body.append(title, description, link);
    article.append(image, body);
    gallery.append(article);
  }
}
const home = document.querySelector("#homeJar");
if (home) {
  const jar = createJarArt(home, jarTheme("love"));
  jar.title("Love Notes");
  jar.fill(19);
}
