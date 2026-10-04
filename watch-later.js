const WL_MENU = /watch\s*later|regarder\s+plus\s+tard/i;
const WL_ATTR = "data-aoy-wl";
const WL_ICON =
  "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z";

function makeWlButton(card) {
  return makeThumbButton({
    className: "aoy-wl-btn",
    title: "Regarder plus tard",
    pathD: WL_ICON,
    onClick: () => runMenuAction(card, WL_MENU),
  });
}

function attachWl(card) {
  if (card.hasAttribute(WL_ATTR)) return;
  const container = ensureThumbContainer(card);
  if (!container) return;

  card.setAttribute(WL_ATTR, "1");
  if (!container.querySelector(".aoy-wl-btn")) {
    container.appendChild(makeWlButton(card));
  }
}

function injectWl(root) {
  root.querySelectorAll(CARD_SEL).forEach(attachWl);
}
