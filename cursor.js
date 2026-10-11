// Red-dot cursor: red over white, white over red (same blend trick as the hero title).
(() => {
  if (window.__rdeCursor || !matchMedia("(pointer: fine)").matches) return;
  window.__rdeCursor = true;
  const mk = (color, blend, z) => {
    const d = document.createElement("div");
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = `position:fixed;left:0;top:0;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;background:${color};mix-blend-mode:${blend};pointer-events:none;z-index:${z};opacity:0;transition:width .25s cubic-bezier(.2,.7,.2,1),height .25s cubic-bezier(.2,.7,.2,1),margin .25s cubic-bezier(.2,.7,.2,1),opacity .2s;will-change:transform`;
    return d;
  };
  const blendOK = window.CSS && CSS.supports("mix-blend-mode", "plus-lighter");
  const a = mk("#ffffff", "difference", 2147483646), b = mk("#d6001a", blendOK ? "plus-lighter" : "normal", 2147483647);
  if (!blendOK) a.style.display = "none";
  const st = document.createElement("style");
  st.textContent = "html.rde-dot,html.rde-dot *{cursor:none!important}";
  const init = () => {
    document.head.appendChild(st);
    document.body.append(a, b);
    document.documentElement.classList.add("rde-dot");
  };
  document.body ? init() : addEventListener("DOMContentLoaded", init);
  let big = false;
  const size = on => {
    if (on === big) return; big = on;
    const s = on ? 60 : 36;
    for (const d of [a, b]) { d.style.width = d.style.height = s + "px"; d.style.margin = `-${s / 2}px 0 0 -${s / 2}px`; }
  };
  addEventListener("pointermove", e => {
    const t = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
    a.style.transform = b.style.transform = t;
    a.style.opacity = b.style.opacity = "1";
    size(!!(e.target.closest && e.target.closest("a,button,[role=button],label,summary,iframe")));
    const solid = !!(e.target.closest && e.target.closest("[data-cursor-solid]"));
    a.style.visibility = solid ? "hidden" : "visible";
    b.style.mixBlendMode = solid || !blendOK ? "normal" : "plus-lighter";
  }, { passive: true });
  document.addEventListener("pointerleave", () => { a.style.opacity = b.style.opacity = "0"; });
})();
