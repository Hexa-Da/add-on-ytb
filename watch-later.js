const CARD_SEL = [
  "ytd-rich-item-renderer",
  "ytd-compact-video-renderer",
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "yt-lockup-view-model",
].join(", ");
const MORE_MENU = /more actions|plus d['’]actions|autres actions/i;
const WL_MENU = /watch\s*later|regarder\s+plus\s+tard/i;
const WL_ATTR = "data-aoy-wl";
const MENU_TIMEOUT_MS = 1500;

let wlBusy = false;

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

function buttonLabel(btn) {
  return [btn.getAttribute("aria-label"), btn.getAttribute("title"), btn.textContent]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMenuButton(card) {
  for (const btn of card.querySelectorAll("button[aria-label], button[title]")) {
    if (MORE_MENU.test(buttonLabel(btn))) return btn;
  }
  return null;
}

function waitForMenuItem(pattern, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const id = setInterval(() => {
      for (const el of document.querySelectorAll(
        "ytd-menu-service-item-renderer, tp-yt-paper-item, yt-list-item-view-model"
      )) {
        if (pattern.test(el.textContent || "")) {
          clearInterval(id);
          resolve(el);
          return;
        }
      }
      if (Date.now() > deadline) {
        clearInterval(id);
        resolve(null);
      }
    }, 50);
  });
}

async function addToWatchLater(card) {
  if (wlBusy) return;
  const menuBtn = findMenuButton(card);
  if (!menuBtn) return;

  wlBusy = true;
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
    wlBusy = false;
  };

  try {
    menuBtn.click();
    const item = await waitForMenuItem(WL_MENU, MENU_TIMEOUT_MS);
    if (item) item.click();
  } finally {
    restore();
  }
}

function makeWlButton(card) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "aoy-wl-btn";
  btn.title = "Regarder plus tard";
  btn.setAttribute("aria-label", "Regarder plus tard");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute(
    "d",
    "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"
  );
  svg.appendChild(path);
  btn.appendChild(svg);

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToWatchLater(card);
  });
  return btn;
}

function attachWl(card) {
  if (card.hasAttribute(WL_ATTR)) return;
  const anchor = findThumbAnchor(card);
  const href = anchor?.getAttribute("href") || "";
  if (!extractVideoId(href) || href.includes("/shorts/")) return;
  const container = findThumbContainer(card);
  if (!container) return;

  card.setAttribute(WL_ATTR, "1");
  container.classList.add("aoy-thumb");
  if (!container.querySelector(".aoy-wl-btn")) {
    container.appendChild(makeWlButton(card));
  }
}

export function injectWl(root) {
  root.querySelectorAll(CARD_SEL).forEach(attachWl);
}
