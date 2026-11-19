// Keep bookmarked catalogue URLs working when the former storefront becomes Home.
const query = new URLSearchParams(location.search);
if (location.hash === "#catalogue" || query.has("occasion")) {
  location.replace(`./cards.html${location.search}${location.hash}`);
}
