// red dot editions: page transitions, masked text reveals, drawn rules, header + parallax.
(() => {
  if (window.__rdeMotion) return; window.__rdeMotion = true;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const EASE = "cubic-bezier(.76,0,.24,1)";

  // page transition
  const curtain = (from, to, dur, done) => {
    const c = document.createElement("div");
    c.setAttribute("aria-hidden", "true");
    c.setAttribute("data-rde-curtain", "");
    c.style.cssText = `position:fixed;inset:0;z-index:2147483600;background:#d6001a;display:flex;align-items:center;justify-content:center;transform:translateY(${from});transition:transform ${dur}ms ${EASE}`;

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
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) { const l = [...document.querySelectorAll("section[id]")].pop(); if (l) active = l.id; }
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

  // fit [data-fit] text to its container width
  const fit = () => document.querySelectorAll("[data-fit]").forEach(el => {
    const w = el.parentElement.clientWidth; if (!w) return;
    el.style.fontSize = "100px";
    const n = el.scrollWidth; if (n) el.style.fontSize = (100 * w / n).toFixed(2) + "px";
  });
  addEventListener("resize", fit);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fit);
  new MutationObserver(() => { clearTimeout(fit.t); fit.t = setTimeout(fit, 80); }).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(fit, 300);



  // mobile menu: fixed inverted bar + full-screen red overlay (below 1000px; side nav hidden)
  const buildMobileMenu = () => {
    const src = document.querySelector("nav[data-sidenav]");
    if (!src || document.querySelector("[data-mnav]")) return;
    const st = document.createElement("style");
    st.textContent = "@media (max-width:999px){[data-sidenav]{display:none!important}}@media (min-width:1000px){[data-mnav]{display:none!important}}[data-mnav-sheet] a:focus-visible,[data-mnav] button:focus-visible{outline:1px solid currentColor;outline-offset:4px}";
    document.head.appendChild(st);
    const pad = "clamp(1.25rem,3vw,2.4rem)";
    const font = "font-family:'Karasuma Gothic',system-ui,sans-serif;font-size:.9375rem;line-height:1.55";
    const links = [...src.querySelectorAll("a")];
    const home = links[0];
    const bar = (layer) => {
      const b = document.createElement("div");
      b.setAttribute("data-mnav", "");
      if (layer === "base") b.setAttribute("aria-hidden", "true");
      b.style.cssText = `position:fixed;top:0;left:0;right:0;z-index:40;display:flex;justify-content:space-between;align-items:center;min-height:2.75rem;padding:.45rem ${pad};${font};line-height:1.4;background:#ffffff;color:#d6001a;border-bottom:1px solid #d6001a`;
      const l = document.createElement(layer === "base" ? "span" : "a");
      l.textContent = "red dot editions"; l.style.cssText = "font-weight:700;white-space:nowrap";
      if (layer !== "base") l.href = home.getAttribute("href");
      const m = document.createElement(layer === "base" ? "span" : "button");
      m.textContent = "menu"; m.style.cssText = "font:inherit;font-weight:500;color:inherit;background:none;border:0;padding:.5rem 0 .5rem 1rem;margin:-.5rem 0;cursor:pointer";
      if (layer !== "base") { m.type = "button"; m.setAttribute("aria-expanded", "false"); m.setAttribute("aria-controls", "rde-mnav-sheet"); m.addEventListener("click", () => open(true)); }
      b.append(l, m); return b;
    };
    const top = bar("top");
    const sheet = document.createElement("div");
    sheet.id = "rde-mnav-sheet"; sheet.setAttribute("data-mnav", ""); sheet.setAttribute("data-mnav-sheet", "");
    sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", "Menu");
    sheet.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:-120px;z-index:2147483500;background:#d6001a;color:#ffffff;display:flex;flex-direction:column;padding:0 ${pad} calc(${pad} + 120px);${font};transform:translateY(-100%);visibility:hidden;transition:transform .6s cubic-bezier(.76,0,.24,1),visibility 0s linear .6s`;
    const head = document.createElement("div");
    head.style.cssText = "display:flex;justify-content:space-between;align-items:center;min-height:2.75rem;padding:.45rem 0;line-height:1.4";
    const hl = document.createElement("a"); hl.textContent = "red dot editions"; hl.href = home.getAttribute("href"); hl.style.cssText = "font-weight:700;white-space:nowrap;color:inherit";
    const close = document.createElement("button"); close.type = "button"; close.textContent = "fechar";
    close.style.cssText = "font:inherit;font-weight:500;color:inherit;background:none;border:0;padding:.5rem 0 .5rem 1rem;margin:-.5rem 0;cursor:pointer";
    close.addEventListener("click", () => open(false));
    head.append(hl, close);
    const list = document.createElement("nav"); list.setAttribute("aria-label", "Principal");
    list.style.cssText = "margin-top:auto;display:flex;flex-direction:column;gap:.35rem;padding-bottom:1rem";
    links.slice(1).forEach(a => {
      const x = document.createElement("a");
      x.href = a.getAttribute("href"); x.textContent = a.textContent.trim();
      const k = a.getAttribute("data-nav-key"); if (k) x.setAttribute("data-mnav-key", k);
      x.style.cssText = "font-family:Lastik,Georgia,serif;font-weight:400;font-size:clamp(2.6rem,10.5vw,4rem);line-height:1.1;letter-spacing:-.02em;color:inherit;text-decoration-thickness:1px;text-underline-offset:.12em;align-self:flex-start";
      x.addEventListener("click", () => open(false));
      list.appendChild(x);
    });
    sheet.append(head, list);
    let isOpen = false;
    const open = (v) => {
      isOpen = v;
      sheet.style.transition = v ? "transform .6s cubic-bezier(.76,0,.24,1),visibility 0s" : "transform .6s cubic-bezier(.76,0,.24,1),visibility 0s linear .6s";
      sheet.style.visibility = v ? "visible" : "hidden";
      sheet.style.transform = v ? "translateY(0)" : "translateY(-100%)";
      root.style.overflow = v ? "hidden" : "";
      const btn = top.querySelector("button"); btn.setAttribute("aria-expanded", String(v));
      if (v) {
        const act = document.querySelector("nav[data-sidenav] [aria-current]");
        const key = act && act.getAttribute("data-nav-key");
        list.querySelectorAll("a").forEach(a => a.style.textDecorationLine = a.getAttribute("data-mnav-key") === key ? "underline" : "none");
        setTimeout(() => close.focus(), 50);
      } else if (document.activeElement && sheet.contains(document.activeElement)) btn.focus();
    };
    addEventListener("keydown", e => { if (isOpen && e.key === "Escape") open(false); });
    addEventListener("resize", () => { if (isOpen && innerWidth >= 1000) open(false); });
    document.body.append(top, sheet);
  };
  document.body ? buildMobileMenu() : addEventListener("DOMContentLoaded", buildMobileMenu);
  setTimeout(buildMobileMenu, 800);

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
