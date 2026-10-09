// FR terrain : « Supprimer de « À regarder plus tard » » (pas seulement « Regarder plus tard »)
const WL_RM_MENU =
  /(?:remove|supprimer|retirer).*(?:watch later|à\s*regarder plus tard|regarder plus tard|playlist|liste de lecture)/i;
const WL_RM_ATTR = "data-aoy-wl-rm";
const WL_RM_CARD_SEL = "ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer";
const WL_RM_TIMEOUT_MS = 2500;
// Icône native du menu ⋮ « Supprimer de … » / « Remove from Watch later » (terrain)
const WL_RM_ICON =
  "M19 3h-4V2a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H5a2 2 0 00-2 2h18a2 2 0 00-2-2ZM6 19V7H4v12a4 4 0 004 4h8a4 4 0 004-4V7h-2v12a2 2 0 01-2 2H8a2 2 0 01-2-2Zm4-11a1 1 0 00-1 1v8a1 1 0 102 0V9a1 1 0 00-1-1Zm4 0a1 1 0 00-1 1v8a1 1 0 002 0V9a1 1 0 00-1-1Z";

function isWlPlaylist() {
  if (location.pathname !== "/playlist") return false;
  try {
    return new URLSearchParams(location.search).get("list") === "WL";
  } catch {
    return false;
  }
}

function isWlRemoveItem(el) {
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (WL_RM_MENU.test(text)) return true;
  const d = el.querySelector("path")?.getAttribute("d") || "";
  return d === WL_RM_ICON || d.startsWith("M19 3h-4V2");
}

/** Masquer le ⋮ sans display:none — sinon Polymer n’ouvre pas le menu au .click(). */
function hideNativeMenu(el) {
  if (!el) return;
  el.classList.add("aoy-wl-rm-native-hidden");
}

function showNativeMenu(el) {
  if (!el) return;
  el.classList.remove("aoy-wl-rm-native-hidden");
}

/** Couleur = computedStyle de l’icône ⋮ native (fiable dark/light). */
function syncRemoveButtonColor(btn, menuRenderer) {
  const native = menuRenderer?.querySelector("yt-icon");
  if (!native) return;
  const color = getComputedStyle(native).color;
  if (color) btn.style.color = color;
}

async function runWlRemove(card) {
  const menuRenderer = card.querySelector("ytd-menu-renderer");
  // Remontrer brièvement le ⋮ : le masquage 1px casse encore l’ouverture du dropdown.
  showNativeMenu(menuRenderer);
  try {
    await runMenuAction(card, isWlRemoveItem, WL_RM_TIMEOUT_MS);
  } finally {
    hideNativeMenu(menuRenderer);
  }
}

function makeWlRemoveButton(card) {
  return makeThumbButton({
    className: "aoy-wl-rm-btn",
    title: "Supprimer de À regarder plus tard",
    pathD: WL_RM_ICON,
    onClick: () => runWlRemove(card),
    bare: true,
  });
}

function attachWlRemove(card) {
  const menuRenderer = card.querySelector("ytd-menu-renderer");
  const menuBtn = findMenuButton(card);
  if (!menuBtn && !menuRenderer) return;

  const anchor = menuRenderer || menuBtn;
  let btn = card.querySelector(".aoy-wl-rm-btn");
  if (!btn) {
    btn = makeWlRemoveButton(card);
    const parent = anchor.parentElement;
    if (parent) parent.insertBefore(btn, anchor);
    else card.appendChild(btn);
  }

  syncRemoveButtonColor(btn, menuRenderer);
  hideNativeMenu(menuRenderer || menuBtn);
  card.setAttribute(WL_RM_ATTR, "1");
}

function injectWlRemove(root) {
  if (!isWlPlaylist()) return;
  root.querySelectorAll(WL_RM_CARD_SEL).forEach(attachWlRemove);
}
