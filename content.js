(() => {
  const SUB_PATH = "/feed/subscriptions";
  // Confirmé terrain (FR) : yt-formatted-string.title
  const GUIDE_HIDE = /^(accueil|shorts|vos vidéos|plus)$/i;
  // Confirmé terrain (FR) : span#title dans ytd-rich-shelf-renderer
  const SHELF_HIDE = /^(shorts|les plus pertinentes)$/i;

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

  function cleanFeed(root) {
    root.querySelectorAll("ytd-rich-shelf-renderer").forEach((shelf) => {
      const title = normalizeText(shelf.querySelector("span#title"));
      if (SHELF_HIDE.test(title)) hide(shelf);
    });
  }

  function clean() {
    const root = document.body;
    if (!root) return;
    cleanGuide(root);
    if ( location.pathname === SUB_PATH ) {
      cleanFeed(root);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      clean();
    });
  }

  function boot() {
    clean();
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
