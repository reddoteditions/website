// Metaballs shader background — adapted from Paper Shaders (Apache-2.0) via 21st.dev Shader Builder.
(() => {
if (customElements.get("rde-metaballs")) return;
const VERT = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
const FRAG = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 u_colors[4];
uniform vec4 u_scene;
uniform float u_intensity;
uniform float u_paramA;
uniform float u_scale;
uniform float u_grain;
uniform float u_seed;
uniform float u_soft;
uniform sampler2D u_text;
float grainHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 palette(float x){float n=max(u_scene.w-1.0,1.0);float f=clamp(x,0.0,1.0)*n;vec3 col=u_colors[0];
for(int i=0;i<3;i++){if(float(i)<n)col=mix(col,u_colors[i+1],smoothstep(0.0,1.0,clamp(f-float(i),0.0,1.0)));}return col;}
void main(){
  vec2 p=(gl_FragCoord.xy-0.5*u_scene.xy)/min(u_scene.x,u_scene.y);
  p*=u_scale;
  float t=u_scene.z;float field=0.0;
  for(int i=0;i<7;i++){float fi=float(i);
    vec2 sp=vec2(max(1.0,u_scene.x/u_scene.y),max(1.0,u_scene.y/u_scene.x))*u_scale;
    vec2 c=vec2(sin(t*(0.19+fi*0.037)+fi*2.1+u_seed),cos(t*(0.16+fi*0.043)+fi*1.4))*0.63*sp;
    field+=(0.025+u_intensity*0.065)/(dot(p-c,p-c)+0.006);}
  float th=mix(2.05,0.62,u_paramA);
  float w=max(fwidth(field),0.0001)*u_soft;
  float s=smoothstep(th-w,th+w,field);
  float gn=grainHash(gl_FragCoord.xy+vec2(u_seed*17.0,u_seed*31.0))-0.5;
  s=clamp(s+gn*u_grain,0.0,1.0);
  float ta=texture2D(u_text,vec2(gl_FragCoord.x/u_scene.x,1.0-gl_FragCoord.y/u_scene.y)).a;
  vec3 col=mix(palette(s),palette(1.0-s),ta);
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;
const hex = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

class RdeMetaballs extends HTMLElement {
  connectedCallback() {
    if (this._c) return;
    this.style.cssText = "display:block;position:absolute;inset:0;width:100%;height:100%";
    const c = this._c = document.createElement("canvas");
    c.style.cssText = "display:block;width:100%;height:100%";
    this.appendChild(c);
    const gl = c.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    this._gl = gl;
    gl.getExtension("OES_standard_derivatives");
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "a_position"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    const colors = (this.getAttribute("colors") || "#ffffff,#fbe9ea,#f6d2d5").split(",").map(s => hex(s.trim()));
    while (colors.length < 4) colors.push(colors[colors.length - 1]);
    gl.uniform3fv(U("u_colors"), new Float32Array(colors.slice(0, 4).flat()));
    gl.uniform1f(U("u_intensity"), +(this.getAttribute("intensity") || .35));
    gl.uniform1f(U("u_paramA"), .28);
    gl.uniform1f(U("u_scale"), +(this.getAttribute("scale") || 1.26));
    gl.uniform1f(U("u_grain"), +(this.getAttribute("grain") || .02));
    gl.uniform1f(U("u_seed"), 1);
    gl.uniform1f(U("u_soft"), +(this.getAttribute("soft") || .75));
    const uScene = U("u_scene"), count = Math.min(4, (this.getAttribute("colors") || "a,b,c").split(",").length);
    const speed = +(this.getAttribute("speed") || .575);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, inView = true, start = performance.now();
    const lite = matchMedia("(max-width: 768px), (pointer: coarse)").matches || (navigator.connection && navigator.connection.saveData);
    const limit = lite ? 8000 : Infinity;
    let elapsed = 0, last = null;
    const size = () => {
      const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      let w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
      const k = Math.min(1, Math.sqrt(2e6 / (w * h))); w = Math.round(w * k); h = Math.round(h * k);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; gl.viewport(0, 0, w, h); }
    };
    const frame = now => {
      raf = 0; size();
      if (last !== null) elapsed += Math.min(now - last, 100);
      last = now;
      gl.uniform4f(uScene, c.width, c.height, still ? 4 : 4 + (Math.min(elapsed, limit) / 1000) * speed, count);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && elapsed < limit && inView && document.visibilityState === "visible") raf = requestAnimationFrame(frame);
      else last = null;
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
    // hero text drawn into the shader: inverts exactly against the blobs (no CSS blend modes, works in Safari)
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(U("u_text"), 0);
    const tc = document.createElement("canvas"), tx = tc.getContext("2d");
    const glyphs = () => { const sc = this.closest("section") || this.parentElement; return sc ? [...sc.querySelectorAll("[data-glyph]")] : []; };
    const paint = () => {
      size();
      const cr = c.getBoundingClientRect(); if (!cr.width || !cr.height) return;
      tc.width = c.width; tc.height = c.height;
      const s = c.width / cr.width;
      tx.clearRect(0, 0, tc.width, tc.height); tx.fillStyle = "#fff"; tx.textBaseline = "alphabetic";
      const els = glyphs();
      els.forEach(el => {
        const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
        tx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs * s}px ${cs.fontFamily}`;
        const ls = parseFloat(cs.letterSpacing) || 0, perChar = ls !== 0 && !("letterSpacing" in tx);
        if ("letterSpacing" in tx) tx.letterSpacing = ls * s + "px";
        const asc = tx.measureText("H").fontBoundingBoxAscent;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n; (n = walker.nextNode());) {
          const str = n.data, re = perChar ? /\S/g : /\S+/g;
          for (let m; (m = re.exec(str));) {
            const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
            const r = rg.getClientRects()[0]; if (!r) continue;
            tx.fillText(m[0], (r.left - cr.left) * s, (r.top - cr.top) * s + asc);
          }
        }
      });
      if ("letterSpacing" in tx) tx.letterSpacing = "0px";
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
      els.forEach(el => { el.style.color = "transparent"; });
      last = null; if (!raf) frame(performance.now());
    };
    const repaint = () => { clearTimeout(this._pt); this._pt = setTimeout(paint, 60); };
    this._tro = new ResizeObserver(repaint);
    const watch = () => { this._tro.observe(c); glyphs().forEach(el => this._tro.observe(el)); repaint(); };
    this._tmo = new MutationObserver(repaint);
    requestAnimationFrame(() => { watch(); glyphs().forEach(el => this._tmo.observe(el, { attributes: true, attributeFilter: ["style"] })); });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(repaint);
    setTimeout(repaint, 600); setTimeout(repaint, 1500);
    this._ro = new ResizeObserver(go); this._ro.observe(c);
    this._io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) go(); }); this._io.observe(c);
    this._vis = () => document.visibilityState === "visible" && go();
    document.addEventListener("visibilitychange", this._vis);
    go();
  }
  disconnectedCallback() {
    this._ro && this._ro.disconnect(); this._io && this._io.disconnect(); this._tro && this._tro.disconnect(); this._tmo && this._tmo.disconnect();
    this._vis && document.removeEventListener("visibilitychange", this._vis);
  }
}
customElements.define("rde-metaballs", RdeMetaballs);
})();
