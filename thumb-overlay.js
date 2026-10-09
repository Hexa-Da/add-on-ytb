const CARD_SEL = [
  "ytd-rich-item-renderer",
  "ytd-compact-video-renderer",
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "yt-lockup-view-model",
].join(", ");
const MORE_MENU = /more actions|action menu|plus d['’]actions|autres actions/i;
const MENU_TIMEOUT_MS = 1500;

let menuBusy = false;

function extractVideoId(href) {
  if (!href) return null;
  try {
    const url = new URL(href, "https://www.youtube.com");
    const v = url.searchParams.get("v");
    if (v) return v;
    const shorts = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    return shorts ? shorts[1] : null;
  } catch {
    return null;
  }
}

function findThumbAnchor(card) {
  const legacy = card.querySelector("a#thumbnail, a.ytd-thumbnail");
  if (legacy) return legacy;
  const thumbModel = card.querySelector("yt-thumbnail-view-model");
  if (thumbModel) {
    const ancestor = thumbModel.closest("a[href]");
    if (ancestor) return ancestor;
  }
  return card.querySelector("a[href*='watch?v='], a[href*='/shorts/']");
}

function findThumbContainer(card) {
  return (
    card.querySelector("yt-thumbnail-view-model") ||
    card.querySelector("a#thumbnail, a.ytd-thumbnail")
  );
}

/** Conteneur vignette prêt pour overlay, ou null (pas de vidéo / Shorts). */
function ensureThumbContainer(card) {
  const anchor = findThumbAnchor(card);
  const href = anchor?.getAttribute("href") || "";
  if (!extractVideoId(href) || href.includes("/shorts/")) return null;
  const container = findThumbContainer(card);
  if (!container) return null;
  container.classList.add("aoy-thumb");
  return container;
}

function buttonLabel(btn) {
  return [btn.getAttribute("aria-label"), btn.getAttribute("title"), btn.textContent]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMenuButton(card) {
  for (const btn of card.querySelectorAll(
    "button[aria-label], button[title], yt-icon-button[aria-label], yt-icon-button[title]"
  )) {
    if (MORE_MENU.test(buttonLabel(btn))) return btn;
  }
  // Playlist / shells récents : ⋮ dans ytd-menu-renderer sans libellé FR/EN stable
  const menu = card.querySelector("ytd-menu-renderer");
  if (!menu) return null;
  return (
    menu.querySelector("button#button") ||
    menu.querySelector("button") ||
    menu.querySelector("yt-icon-button#button") ||
    menu.querySelector("yt-icon-button") ||
    menu.querySelector("[role='button']")
  );
}

function menuItemMatches(el, pattern) {
  if (typeof pattern === "function") return pattern(el);
  return pattern.test(el.textContent || "");
}

function waitForMenuItem(pattern, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const id = setInterval(() => {
      // Ne jamais chercher dans tout le document : le guide a aussi « Regarder plus tard »
      // (lien playlist) et serait cliqué à la place de l’item du menu ⋮.
      const popups = document.querySelectorAll(
        "ytd-menu-popup-renderer, tp-yt-iron-dropdown:not([aria-hidden='true'])"
      );
      for (const popup of popups) {
        for (const el of popup.querySelectorAll(
          "ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer, tp-yt-paper-item, yt-list-item-view-model, [role='menuitem']"
        )) {
          if (menuItemMatches(el, pattern)) {
            clearInterval(id);
            resolve(el);
            return;
          }
        }
      }
      if (Date.now() > deadline) {
        clearInterval(id);
        resolve(null);
      }
    }, 50);
  });
}

async function runMenuAction(card, pattern, timeoutMs = MENU_TIMEOUT_MS) {
  if (menuBusy) return;
  const menuBtn = findMenuButton(card);
  if (!menuBtn) return;

  menuBusy = true;
  let popup = null;
  const observer = new MutationObserver(() => {
    const el = document.querySelector(
      "ytd-menu-popup-renderer, tp-yt-iron-dropdown[aria-hidden='false'], tp-yt-iron-dropdown:not([aria-hidden])"
    );
    if (el && !popup) {
      popup = el;
      popup.style.opacity = "0";
      popup.style.pointerEvents = "none";
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-hidden"],
  });

  const restore = () => {
    observer.disconnect();
    if (popup) {
      popup.style.opacity = "";
      popup.style.pointerEvents = "";
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    menuBusy = false;
  };

  try {
    menuBtn.click();
    const item = await waitForMenuItem(pattern, timeoutMs);
    if (item) item.click();
  } finally {
    restore();
  }
}

function makeThumbButton({ className, title, pathD, onClick, bare }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = bare ? className : `aoy-thumb-btn ${className}`;
  btn.title = title;
  btn.setAttribute("aria-label", title);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  btn.appendChild(svg);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    onClick();
  });
  return btn;
}
