const SUB_PATH = "/feed/subscriptions";
// Confirmé terrain (FR) : yt-formatted-string.title
const GUIDE_HIDE = /^(accueil|shorts|vos vidéos|plus)$/i;
// Confirmé terrain (FR) : span#title dans ytd-rich-shelf-renderer
const SHELF_SHORTS = /^shorts$/i;
const SHELF_RELEVANT = /^les plus pertinentes$/i;
// Pattern ImprovedTube : couper le hover-preview à la source (sinon mute/CC apparaissent).
const PREVIEW_HOVER_ROOTS = [
  "#content.ytd-rich-item-renderer",
  "#contents.ytd-item-section-renderer",
  "#dismissible.ytd-compact-video-renderer",
  "#dismissible.ytd-video-renderer",
  "#dismissible.ytd-grid-video-renderer",
  "ytd-rich-item-renderer",
  "yt-lockup-view-model",
].join(", ");

let scheduled = false;

function hide(el) {
  if (!el) return;
  el.style.setProperty("display", "none", "important");
}

function normalizeText(el) {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

function cleanGuide(root) {
  root.querySelectorAll("ytd-guide-entry-renderer").forEach((entry) => {
    const title = normalizeText(entry.querySelector("yt-formatted-string.title"));
    if (GUIDE_HIDE.test(title)) hide(entry);
  });
}

function cleanShelves(root) {
  root.querySelectorAll("ytd-rich-shelf-renderer").forEach((shelf) => {
    const title = normalizeText(shelf.querySelector("span#title"));
    if (SHELF_SHORTS.test(title)) {
      hide(shelf);
      return;
    }
    if (location.pathname === SUB_PATH && SHELF_RELEVANT.test(title)) hide(shelf);
  });
}

function clean() {
  const root = document.body;
  if (!root) return;
  cleanGuide(root);
  cleanShelves(root);
  injectWl(root);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    clean();
  });
}

/** Empêche YouTube de démarrer l’aperçu inline (mute/CC) — pattern ImprovedTube. */
function blockHoverPreview(event) {
  if (
    event.composedPath().some((node) => typeof node.matches === "function" && node.matches(PREVIEW_HOVER_ROOTS))
  ) {
    event.stopImmediatePropagation();
  }
}

function boot() {
  clean();
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener("yt-navigate-finish", schedule);
  window.addEventListener("mouseenter", blockHoverPreview, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
