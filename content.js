(() => {
  const SUB_PATH = "/feed/subscriptions";
  const GUIDE_HIDE =
    /^(accueil|home|shorts|vos vidéos|your videos|plus|show more|more|moins|show less|less)$/i;
  const PERTINENT = /les plus pertinentes|most relevant/i;

  let scheduled = false;

  function hide(el) {
    if (!el) return;
    el.classList.add("aytb-hide");
    // YouTube réécrit souvent classList ; le style inline tient mieux.
    el.style.setProperty("display", "none", "important");
  }

  function text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function guideTitle(entry) {
    return (
      text(entry.querySelector(".title")) ||
      text(entry.querySelector("yt-formatted-string")) ||
      entry.querySelector("a")?.getAttribute("title") ||
      ""
    );
  }

  function cleanGuide(root) {
    root
      .querySelectorAll("#expander-item, #collapser-item, #collapse-item")
      .forEach(hide);

    root
      .querySelectorAll("ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer")
      .forEach((entry) => {
        const title = guideTitle(entry);
        const href = entry.querySelector("a")?.getAttribute("href") || "";
        if (
          GUIDE_HIDE.test(title) ||
          href === "/" ||
          /^\/\?/.test(href) ||
          href === "/shorts" ||
          href.startsWith("/shorts?")
        ) {
          hide(entry);
        }
      });
  }

  function cleanFeed(root) {
    // Shorts : rails + items
    root.querySelectorAll("ytd-reel-shelf-renderer").forEach(hide);
    root
      .querySelectorAll(
        "ytd-rich-shelf-renderer, ytd-rich-section-renderer, ytd-item-section-renderer, ytd-shelf-renderer"
      )
      .forEach((section) => {
        const title = text(
          section.querySelector("#title, #title-text, #shelf-title-text, h2")
        );
        if (!title) return;
        if (/\bshorts?\b/i.test(title) || PERTINENT.test(title)) hide(section);
      });
    root.querySelectorAll('a[href*="/shorts/"]').forEach((a) => {
      hide(
        a.closest(
          "ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model"
        )
      );
    });

    // Option / chip de tri du même nom (si présent)
    root
      .querySelectorAll(
        "yt-chip-cloud-chip-renderer, [role='option'], [role='menuitem'], tp-yt-paper-item, yt-formatted-string, span"
      )
      .forEach((el) => {
        const t = text(el);
        if (!t || t.length > 60 || !PERTINENT.test(t)) return;
        hide(
          el.closest(
            "yt-chip-cloud-chip-renderer, tp-yt-paper-item, ytd-dropdown-item-renderer, ytd-menu-service-item-renderer, ytd-rich-section-renderer"
          ) || el
        );
      });
  }

  function clean() {
    const root = document.body;
    if (!root) return;
    cleanGuide(root);
    if (
      location.pathname === SUB_PATH ||
      location.pathname.startsWith(`${SUB_PATH}/`)
    ) {
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
    document.addEventListener("yt-navigate-finish", schedule);
    window.addEventListener("yt-navigate-finish", schedule);
    // Section souvent injectée après le 1er paint au refresh
    let n = 0;
    const bootPoll = setInterval(() => {
      clean();
      if (++n >= 20) clearInterval(bootPoll);
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
