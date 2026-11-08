// Translates everything that is rendered on screen — every page, dialog and
// pop-up — without each component having to call t(). It watches the DOM
// (MutationObserver) and swaps known English text for the selected language.
// The original English is remembered, so switching back restores it exactly.
import { translateWith } from "./translator.js";

const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);

const textState = new WeakMap(); // Text node  -> { orig, out }
const attrState = new WeakMap(); // Element    -> { [attr]: { orig, out } }

let dict = null;
let observer = null;
let nativeDialogs = null;

const noTranslate = (el) => !el || (el.closest && el.closest("[translate='no']"));
const skipped = (el) => !el || SKIP_TAGS.has(el.tagName) || (el.closest && el.closest("[translate='no']"));

function doText(node) {
  const parent = node.parentElement;
  if (skipped(parent)) return;
  const rec = textState.get(node);
  if (rec && node.data === rec.out) return;          // already translated, nothing new
  const out = translateWith(dict, node.data);
  if (out != null && out !== node.data) {
    textState.set(node, { orig: node.data, out });
    node.data = out;
  } else if (rec) {
    textState.delete(node);                          // React wrote new text we don't know
  }
}

function doAttrs(el) {
  if (!el || el.tagName === "SCRIPT" || el.tagName === "STYLE" || noTranslate(el)) return; // textarea placeholders are fine
  const names = [...ATTRS];
  if (el.tagName === "INPUT" && /^(submit|button|reset)$/i.test(el.type)) names.push("value");
  let recs = attrState.get(el);
  for (const a of names) {
    const cur = el.getAttribute(a);
    if (cur == null) continue;
    const rec = recs?.[a];
    if (rec && cur === rec.out) continue;
    const out = translateWith(dict, cur);
    if (out != null && out !== cur) {
      if (!recs) { recs = {}; attrState.set(el, recs); }
      recs[a] = { orig: cur, out };
      el.setAttribute(a, out);
    } else if (rec) delete recs[a];
  }
}

function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1) return;
  doAttrs(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = tw.nextNode())) (n.nodeType === 3 ? doText(n) : doAttrs(n));
}

function restore() {
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = tw.nextNode())) {
    if (n.nodeType === 3) {
      const rec = textState.get(n);
      if (rec && n.data === rec.out) n.data = rec.orig;
      textState.delete(n);
    } else {
      const recs = attrState.get(n);
      if (recs) for (const [a, r] of Object.entries(recs)) if (n.getAttribute(a) === r.out) n.setAttribute(a, r.orig);
      attrState.delete(n);
    }
  }
}

function patchDialogs() {
  if (nativeDialogs) return;
  nativeDialogs = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
  const tr = (m) => (typeof m === "string" ? translateWith(dict, m) ?? m : m);
  window.alert = (m) => nativeDialogs.alert.call(window, tr(m));
  window.confirm = (m) => nativeDialogs.confirm.call(window, tr(m));
  window.prompt = (m, d) => nativeDialogs.prompt.call(window, tr(m), d);
}
function unpatchDialogs() {
  if (!nativeDialogs) return;
  Object.assign(window, nativeDialogs);
  nativeDialogs = null;
}

function onMutations(records) {
  for (const r of records) {
    if (r.type === "childList") r.addedNodes.forEach(walk);
    else if (r.type === "characterData") doText(r.target);
    else if (r.type === "attributes") doAttrs(r.target);
  }
}

/** Turn translation on for `dictionary`, or off (restoring English) when it is null. */
export function setAutoTranslation(dictionary) {
  if (typeof document === "undefined" || !document.body) return;
  if (observer) { observer.disconnect(); observer = null; }
  if (dict) restore();
  dict = dictionary || null;
  if (!dict) { unpatchDialogs(); return; }
  walk(document.body);
  patchDialogs();
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: [...ATTRS, "value"],
  });
}
