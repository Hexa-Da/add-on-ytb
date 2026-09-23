(() => {
  const SUB_PATH = "/feed/subscriptions";
  const SHORTS_TITLE = /\bshorts?\b/i;
  const SUGGESTION_TITLE =
    /\b(recommended|for you|suggestions?|pour vous|recommandés?|sugerencias?)\b/i;

  const ITEM_SELECTOR = [
    "ytd-rich-item-renderer",
    "ytd-grid-video-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-rich-grid-media",
    "yt-lockup-view-model",
  ].join(", ");

  const SECTION_SELECTOR = [
    "ytd-rich-section-renderer",
    "ytd-item-section-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer",
    "ytd-shelf-renderer",
  ].join(", ");

  let scheduled = false;

  function onSubscriptions() {
    return location.pathname === SUB_PATH || location.pathname.startsWith(`${SUB_PATH}/`);
  }

  function hide(el) {
    if (!el || el.classList.contains("aytb-hide")) return;
    el.classList.add("aytb-hide");
  }

  function titleText(section) {
    const el =
      section.querySelector("#title") ||
      section.querySelector("#title-text") ||
      section.querySelector("#shelf-title-text") ||
      section.querySelector("h2") ||
      section.querySelector("[id='title']");
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function hideShortsItems(root) {
    root.querySelectorAll('a[href*="/shorts/"]').forEach((a) => {
      const item = a.closest(ITEM_SELECTOR);
      if (item) hide(item);
    });
  }

  function hideShelvesAndSuggestions(root) {
    root.querySelectorAll(SECTION_SELECTOR).forEach((section) => {
      const tag = section.tagName.toLowerCase();
      if (tag === "ytd-reel-shelf-renderer") {
        hide(section);
        const parent = section.closest(
          "ytd-rich-section-renderer, ytd-item-section-renderer"
        );
        if (parent) hide(parent);
        return;
      }

      const title = titleText(section);
      if (!title) return;

      if (SHORTS_TITLE.test(title) || SUGGESTION_TITLE.test(title)) {
        hide(section);
      }
    });
  }

  function clean() {
    if (!onSubscriptions()) return;
    const root = document.body;
    if (!root) return;
    hideShelvesAndSuggestions(root);
    hideShortsItems(root);
  }

  function scheduleClean() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      clean();
    });
  }

  function boot() {
    clean();

    const observer = new MutationObserver(scheduleClean);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("yt-navigate-finish", scheduleClean);
    window.addEventListener("yt-navigate-finish", scheduleClean);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
