// red dot editions: page transitions, masked text reveals, drawn rules, header + parallax.
(() => {
  if (window.__rdeMotion) return; window.__rdeMotion = true;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const EASE = "cubic-bezier(.76,0,.24,1)";

  // page transition
  const LOGO = new URL("assets/rde-logo.png", (document.currentScript && document.currentScript.src) || location.href).href;
  const curtain = (from, to, dur, done) => {
    const c = document.createElement("div");
    c.setAttribute("aria-hidden", "true");
    c.setAttribute("data-rde-curtain", "");
    c.style.cssText = `position:fixed;inset:0;z-index:2147483600;background:#ffffff;display:flex;align-items:flex-end;padding:clamp(1.25rem,3vw,2.4rem);transform:translateY(${from});transition:transform ${dur}ms ${EASE}`;
    const l = document.createElement("img");
    l.src = LOGO; l.alt = "";
    l.style.cssText = "display:block;width:100%;height:auto";
    c.appendChild(l);
    document.body.appendChild(c);
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transform = `translateY(${to})`; }));
    setTimeout(() => done && done(c), dur);
    return c;
  };
  if (!still && sessionStorage.getItem("rde-pt")) {
    sessionStorage.removeItem("rde-pt");
    root.classList.add("rde-pt-in");
    const go = () => { root.classList.remove("rde-pt-in"); curtain("0", "-100%", 900, c => c.remove()); };
    document.body ? setTimeout(go, 120) : addEventListener("DOMContentLoaded", () => setTimeout(go, 120));
  }
  document.addEventListener("click", e => {
    if (still || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (!/^https?:/.test(u.protocol)) return;
    e.preventDefault();
    sessionStorage.setItem("rde-pt", "1");
    curtain("100%", "0", 700, () => { location.href = u.href; });
  });
  addEventListener("pageshow", e => { if (e.persisted) document.querySelectorAll("[data-rde-curtain]").forEach(n => n.remove()); });

  // side nav (two blended layers = always inverted): fixed on wide screens, active link underlined
  const navTick = () => {
    const navs = document.querySelectorAll("[data-sidenav]");
    if (!navs.length) return;
    const wide = innerWidth >= 1000;
    let active = null;
    document.querySelectorAll("section[id]").forEach(sec => {
      const r = sec.getBoundingClientRect();
      if (r.top <= innerHeight * .4 && r.bottom > innerHeight * .4) active = sec.id === "ficha" ? "edicao" : sec.id;
    });
    navs.forEach(nav => {
      nav.style.position = wide ? "fixed" : "absolute";
      nav.querySelectorAll("[data-nav-key]").forEach(a => {
        const on = a.getAttribute("data-nav-key") === active;
        a.style.textDecorationLine = on ? "underline" : "none";
        if (a.tagName === "A") on ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current");
      });
    });
  };
  addEventListener("scroll", navTick, { passive: true }); addEventListener("resize", navTick);
  setInterval(navTick, 1000); navTick();

  if (still) return;

  // masked text + drawn rules
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -6% 0px" });
  const seen = new WeakSet();
  const scan = () => document.querySelectorAll("[data-mask],[data-rule]").forEach(n => {
    if (seen.has(n)) return; seen.add(n);
    const sib = n.parentElement ? Array.prototype.indexOf.call(n.parentElement.children, n) : 0;
    n.style.setProperty("--d", Math.min(sib, 6) * 60 + "ms");
    io.observe(n);
  });
  root.classList.add("rde-motion");
  const mo = new MutationObserver(scan);
  const start = () => { scan(); mo.observe(document.body, { childList: true, subtree: true }); };
  document.body ? start() : addEventListener("DOMContentLoaded", start);

  // book tilt toward the cursor (eased)
  let tx = 0, ty = 0, cx = 0, cy = 0, traf = 0;
  const tilt = () => {
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    document.querySelectorAll("[data-tilt]").forEach(el => { el.style.transform = `rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`; });
    traf = Math.abs(tx - cx) + Math.abs(ty - cy) > .01 ? requestAnimationFrame(tilt) : 0;
  };
  addEventListener("pointermove", e => {
    const el = document.querySelector("[data-tilt]");
    if (!el || e.pointerType !== "mouse") return;
    const sec = el.closest("section") || el.parentElement, r = sec.getBoundingClientRect();
    const inside = e.clientY >= r.top && e.clientY <= r.bottom;
    const b = el.getBoundingClientRect();
    tx = inside ? clampN(((e.clientX - (b.left + b.width / 2)) / (r.width / 2)) * 18, -18, 18) : 0;
    ty = inside ? clampN(-((e.clientY - (b.top + b.height / 2)) / (r.height / 2)) * 14, -14, 14) : 0;
    if (!traf) traf = requestAnimationFrame(tilt);
  }, { passive: true });
  function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }

  // header hide on scroll down, hero book parallax
  let lastY = scrollY, ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, h = document.querySelector("header");
      const hero = h && h.hasAttribute("data-after-hero") ? document.querySelector('[data-screen-label="Abertura"]') : null;
      const overHero = hero && hero.getBoundingClientRect().bottom > 64;
      if (h) h.style.transform = overHero || (y > 240 && y > lastY) ? "translateY(-100%)" : "translateY(0)";
      lastY = y;
      const b = document.querySelector("[data-parallax]");
      if (b && y < innerHeight * 1.2) b.style.transform = `translateY(${y * -0.08}px)`;
    });
  }, { passive: true });
})();
