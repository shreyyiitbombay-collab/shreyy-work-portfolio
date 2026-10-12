/* ==========================================================================
   Shrestha — portfolio · interactions
   1  scale          html font-size = viewport / 90   (1rem = 16 design-px @1440)
   2  grid glow      dotted grid lights up around the cursor
   3  word roller    Products → Stories → Experiences → Ideas → Reality
   4  nav            smooth anchors + Socials dropdown
   5  text reveal    letters light up as you scroll
   6  playground     3D "loop ring" carousel (auto-advances; holds on hover; click + drag to spin it)
   ========================================================================== */
(() => {
  'use strict';
  const root = document.documentElement;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);   // ?roll=2&ring=1&lit=1  (handy for screenshots/QA)

  /* ── 1 · scale ─────────────────────────────────────────────────────────── */
  function setScale() {
    const w = root.clientWidth || innerWidth;
    const mobile = w <= 820;
    const fs = mobile ? w / 24.375 : Math.min(w / 90, 21.3333);
    root.style.fontSize = fs + 'px';
    root.classList.toggle('is-mobile', mobile);
    // keep the glass refraction strength proportional to the page scale (1 design px = fs/16 screen px)
    if (typeof syncNav === 'function') syncNav();
    document.querySelectorAll('feDisplacementMap').forEach(m => m.setAttribute('scale', (parseFloat(m.dataset.base) * fs / 16).toFixed(2)));
  }
  // SVG-filter backdrops only work in Chromium engines (Chrome, Edge, Brave, Opera); others keep the blurred glass
  if (/(Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent)) root.classList.add('has-refract');
  setScale();
  addEventListener('resize', () => { setScale(); onScroll(); });

  /* ── top panel: line the glass / tint / avatar layers up with the (auto-width) label layer ───────── */
  function syncNav() {
    const ink = document.querySelector('.navfx--ink'), slot = document.querySelector('.nav__dp--slot');
    if (!ink || !slot) return;
    const prev = root.style.getPropertyValue('--navw');
    const w = ink.getBoundingClientRect().width + 2, s = slot.getBoundingClientRect();   // +2 = the pill's 1px border each side
    root.style.setProperty('--navw', w + 'px');
    root.style.setProperty('--dpx', s.left + 'px');
    root.style.setProperty('--dpy', s.top + 'px');
    if (prev !== w + 'px') requestAnimationFrame(syncNav);          // width changed -> ink re-centred, measure once more
  }
  addEventListener('load', syncNav);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncNav);

  /* ── text roll on hover ──────────────────────────────────────────────────────────────────────────────
     Splits every label (nav links, buttons, dropdown items) into letters and plays the roll from the reference video:
     each letter slides up and out while its twin rolls in from below, left → right. A soft, unhurried roll that plays
     ONCE, on hover-in only (nothing happens when the pointer leaves). Only the text moves.
     ROLL_MS = time per letter, ROLL_STEP = delay between letters, ROLL_EASE = easing (gentle in-out).              */
  const ROLL_MS = 520, ROLL_STEP = 26, ROLL_EASE = 'cubic-bezier(.45,.05,.25,1)';
  function buildRoll() {
    $$('.nav__link, .btn, .dd a').forEach(host => {
      if (host._rt) return;
      const nodes = [], walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const ins = [];
      nodes.forEach(node => {
        const raw = node.nodeValue; if (!raw.trim()) return;
        const start = raw.search(/\S/), end = raw.length - raw.match(/\s*$/)[0].length;
        const fs = parseFloat(getComputedStyle(node.parentElement).fontSize) || 16;
        // advance of every glyph (kerning included) measured from the untouched text, so the layout cannot shift
        const range = document.createRange(), lefts = [];
        for (let k = start; k <= end; k++) {
          if (k < end) { range.setStart(node, k); range.setEnd(node, k + 1); const r = range.getBoundingClientRect(); lefts.push(r.left); if (k === end - 1) lefts.push(r.right); }
        }
        const text = raw.slice(start, end);
        const wrap = document.createElement('span'); wrap.className = 'rt';
        const sr = document.createElement('span'); sr.className = 'rt__sr'; sr.textContent = text;
        const vis = document.createElement('span'); vis.className = 'rt__vis'; vis.setAttribute('aria-hidden', 'true');
        [...text].forEach((ch, i) => {
          const w = ((lefts[i + 1] - lefts[i]) / fs).toFixed(4);
          if (ch === ' ') { const sp = document.createElement('span'); sp.className = 'rt__sp'; sp.style.setProperty('--w', w); vis.appendChild(sp); return; }
          const c = document.createElement('span'); c.className = 'rt__c'; c.style.setProperty('--w', w);
          const inn = document.createElement('span'); inn.className = 'rt__in';
          for (let n = 0; n < 2; n++) { const t = document.createElement('span'); t.textContent = ch; inn.appendChild(t); }
          c.appendChild(inn); vis.appendChild(c); ins.push(inn);
        });
        wrap.append(sr, vis);
        node.replaceWith(wrap);
        // keep any whitespace the browser rendered around the text (none of our hosts need it: they are flex containers)
      });
      host._rt = ins;
      const go = e => { if (e && e.pointerType === 'touch') return; roll(host); };
      host.addEventListener('pointerenter', go);                        // hover-in only: no second roll when the pointer leaves
      host.addEventListener('focus', () => { if (host.matches(':focus-visible')) roll(host); });
    });
    if (typeof syncNav === 'function') syncNav();
  }
  function roll(host) {
    const ins = host._rt; if (reduceMotion || !ins || !ins.length) return;
    if (host._busy) return;                                           // already rolling: never queue a second roll
    host._busy = true;
    const step = Math.min(ROLL_STEP, 340 / Math.max(ins.length - 1, 1));
    const done = ins.map((el, i) => el.animate(
      [{ transform: 'translateY(0)' }, { transform: el._rd ? `translateY(-${el._rd}px)` : 'translateY(-50%)' }],   // _rd: SVG letters slide one letter window (26 units)
      { duration: ROLL_MS, delay: i * step, easing: ROLL_EASE }
    ).finished.catch(() => {}));
    Promise.all(done).then(() => { host._busy = false; });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildRoll); else addEventListener('load', buildRoll);

  /* The glass SVG buttons (Resume / LinkedIn / See more projects): their label is drawn as outlines, one <g class="sb-in"> per
     letter holding two stacked copies (see tools/build_svg_buttons.py), so they use the very same roll(): same timing,
     stagger, easing, hover-in only, played once, keyboard focus too. Only the letters move; the arrow stays.            */
  function buildSvgRoll() {
    $$('.svgbtn').forEach(host => {
      if (host._rt) return;
      host._rt = $$('.sb-in', host); host._rt.forEach(el => { el._rd = 26; });
      host.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') roll(host); });
      host.addEventListener('focus', () => { if (host.matches(':focus-visible')) roll(host); });
    });
  }
  buildSvgRoll();

  /* ── edge glow on the Work cards ──────────────────────────────────────────────────────────────────────
     For each card: find the point on its border nearest the pointer and how close the pointer is to that border (inside or
     outside the card). The glow (CSS) follows --gx/--gy and fades with --gi; positions are eased so it flows.            */
  const gCards = $$('.work__grid .card').map(el => {
    const haze = document.createElement('span'); haze.className = 'card__haze'; haze.setAttribute('aria-hidden', 'true'); el.appendChild(haze);
    return { el, x: 0, y: 0, i: 0, init: false };
  });
  let gPtr = null, gRaf = 0;
  function glowTick() {
    gRaf = 0; let busy = false;
    const k = (parseFloat(getComputedStyle(root).fontSize) || 16) / 16, reach = 120 * k;     // how far from the border the glow reaches
    gCards.forEach(c => {
      const r = c.el.getBoundingClientRect(); let tx = r.width / 2, ty = r.height / 2, ti = 0;
      if (gPtr) {
        const px = gPtr.x, py = gPtr.y;
        const inside = px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
        let bx, by, d;
        if (inside) {
          const dl = px - r.left, dr = r.right - px, dt = py - r.top, db = r.bottom - py; d = Math.min(dl, dr, dt, db);
          bx = px; by = py;
          if (d === dl) bx = r.left; else if (d === dr) bx = r.right; else if (d === dt) by = r.top; else by = r.bottom;
        } else {
          bx = Math.min(Math.max(px, r.left), r.right); by = Math.min(Math.max(py, r.top), r.bottom);
          d = Math.hypot(px - bx, py - by);
        }
        ti = Math.max(0, 1 - d / reach); ti = ti * ti * (3 - 2 * ti);                          // smoothstep falloff
        tx = bx - r.left; ty = by - r.top;
      }
      if (!c.init || (c.i < 0.01 && ti > 0)) { c.x = tx; c.y = ty; c.init = true; }            // appear where the pointer is, don't slide in
      c.x += (tx - c.x) * 0.22; c.y += (ty - c.y) * 0.22; c.i += (ti - c.i) * 0.14;
      if (Math.abs(ti - c.i) < 0.004) c.i = ti;
      const on = c.i > 0.003;
      c.el.classList.toggle('gl-on', on);
      if (on) { c.el.style.setProperty('--gx', c.x.toFixed(1) + 'px'); c.el.style.setProperty('--gy', c.y.toFixed(1) + 'px'); c.el.style.setProperty('--gi', c.i.toFixed(3)); busy = true; }
      else if (c.el.style.getPropertyValue('--gi') !== '0') c.el.style.setProperty('--gi', '0');
      if (Math.abs(tx - c.x) > 0.3 || Math.abs(ty - c.y) > 0.3) busy = busy || on;
    });
    if (busy) gRaf = requestAnimationFrame(glowTick);
  }
  const glowKick = () => { if (!gRaf) gRaf = requestAnimationFrame(glowTick); };
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; gPtr = { x: e.clientX, y: e.clientY }; glowKick(); }, { passive: true });
  addEventListener('scroll', () => { if (gPtr) glowKick(); }, { passive: true });
  document.addEventListener('mouseleave', () => { gPtr = null; glowKick(); });

  /* ── 2 · grid glow ─────────────────────────────────────────────────────── */
  // The glow is part of the page (position:absolute) so it scrolls with the grid.
  // We only update its anchor (in PAGE coordinates) when the mouse actually moves.
  const glow = $('.glow');
  let gx = 0, gy = 0, glowQueued = false;
  function paintGlow() {
    glowQueued = false;
    glow.style.setProperty('--mx', gx + 'px');
    glow.style.setProperty('--my', gy + 'px');
  }
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    // browsers fire a synthetic zero-movement event after scrolling – ignore it so the glow stays on the grid
    if (glow.classList.contains('is-on') && e.movementX === 0 && e.movementY === 0) return;
    gx = e.pageX; gy = e.pageY; glow.classList.add('is-on');
    if (!glowQueued) { glowQueued = true; requestAnimationFrame(paintGlow); }
  }, { passive: true });
  document.addEventListener('mouseleave', () => glow.classList.remove('is-on'));

  /* ── cat gif: walk through data-fallbacks if an image fails to load ─────────────────────── */
  $$('img[data-fallbacks]').forEach(img => {
    const list = img.dataset.fallbacks.split('|'); let n = 0;
    const next = () => { if (n < list.length) img.src = list[n++]; };
    img.addEventListener('error', next);
    if (img.complete && img.naturalWidth === 0) next();      // it may already have failed before this ran
  });

  /* ── 3 · word roller ───────────────────────────────────────────────────── */
  const words = $$('#roll .roll__w');
  const N = words.length;
  let cur = clamp(parseInt(params.get('roll') || '0', 10) || 0, 0, N - 1);
  const prevPos = new Array(N).fill(null);
  function layoutRoll() {
    words.forEach((w, i) => {
      const pos = ((i - cur + 2 + N * 10) % N) - 2;          // -2 … 2
      const wrapped = prevPos[i] !== null && Math.abs(pos - prevPos[i]) > 2;
      if (wrapped) w.classList.add('no-anim');
      w.style.setProperty('--p', pos);
      w.classList.toggle('is-main', pos === 0);
      w.classList.toggle('is-hidden', Math.abs(pos) > 1);
      w.classList.toggle('is-above', pos < 0);
      if (wrapped) { void w.offsetWidth; w.classList.remove('no-anim'); }
      prevPos[i] = pos;
    });
  }
  layoutRoll();
  if (!params.has('roll') && !reduceMotion) {
    setInterval(() => { cur = (cur + 1) % N; layoutRoll(); }, 1200);
  }

  /* ── 4 · nav ───────────────────────────────────────────────────────────── */
  const nav = $('.nav');
  const socialBtn = $('#socialBtn');
  let menuY = 0;                                   // scroll position when the dropdown was opened
  let pinned = false, closeTimer = null;           // pinned = opened/kept open by a click (hover alone closes it again)
  const setMenu = open => {
    clearTimeout(closeTimer);
    if (open) menuY = scrollY; else pinned = false;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    socialBtn.setAttribute('aria-expanded', open);
  };
  // any real scroll (more than a few px) closes the dropdown, every time it is reopened
  addEventListener('scroll', () => {
    if (nav.classList.contains('is-open') && Math.abs(scrollY - menuY) > 6) setMenu(false);
  }, { passive: true });
  // hover (mouse / pen) over "Socials" opens the dropdown; it closes shortly after the pointer leaves both the button and the menu
  const dd = $('#socialMenu'), hoverOK = e => e.pointerType === 'mouse' || e.pointerType === 'pen';
  const hoverOpen = e => { if (!hoverOK(e)) return; clearTimeout(closeTimer); if (!nav.classList.contains('is-open')) setMenu(true); };
  const hoverLeave = e => { if (!hoverOK(e) || pinned) return; clearTimeout(closeTimer); closeTimer = setTimeout(() => setMenu(false), 220); };
  socialBtn.addEventListener('pointerenter', hoverOpen); socialBtn.addEventListener('pointerleave', hoverLeave);
  dd.addEventListener('pointerenter', e => { if (hoverOK(e)) clearTimeout(closeTimer); }); dd.addEventListener('pointerleave', hoverLeave);
  // click: closed -> open and keep open; open by hover -> keep it open (pin); pinned -> close
  socialBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!nav.classList.contains('is-open')) { setMenu(true); pinned = true; }
    else if (!pinned) pinned = true;
    else setMenu(false);
  });
  document.addEventListener('click', e => { if (!e.target.closest('.navfx')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  $$('.dd a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  const smooth = reduceMotion ? 'auto' : 'smooth';
  $$('[data-target]').forEach(a => a.addEventListener('click', e => {
    const id = a.dataset.target;
    e.preventDefault();
    setMenu(false);
    if (id === 'top') return scrollTo({ top: 0, behavior: smooth });
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: smooth, block: 'start' });
  }));
  $('#toTop').addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: smooth }); });

  /* ── 5 · scroll-linked letter reveal ───────────────────────────────────── */
  const groups = $$('[data-reveal]').map(el => {
    const chars = [];
    const walk = node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
          const w = document.createElement('span'); w.className = 'w';
          [...tok].forEach(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s); chars.push(s); });
          frag.appendChild(w);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1) { [...node.childNodes].forEach(walk); }
    };
    [...el.childNodes].forEach(walk);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    return { el, chars, on: 0 };
  });
  const forceLit = params.has('lit') || reduceMotion;

  function updateReveal() {
    const vh = innerHeight;
    groups.forEach(g => {
      const r = g.el.getBoundingClientRect();
      const p = forceLit ? 1 : clamp((vh * 0.86 - r.top) / (r.height + vh * 0.26), 0, 1);
      const n = Math.round(p * g.chars.length);
      if (n === g.on) return;
      if (n > g.on) for (let i = g.on; i < n; i++) g.chars[i].classList.add('on');
      else for (let i = n; i < g.on; i++) g.chars[i].classList.remove('on');
      g.on = n;
    });
  }

  // nav + resume are released as the outro (contact section) approaches
  const rail = $('.rail'), contactSec = $('#contact');
  function updateRail() {
    const off = contactSec.getBoundingClientRect().top < innerHeight * 0.4;
    rail.classList.toggle('is-off', off);
    document.body.classList.toggle('nav-off', off);
    if (off) setMenu(false);
  }

  let scrollQueued = false;
  function onScroll() {
    if (scrollQueued) return; scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; updateReveal(); updateRail(); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  updateReveal(); updateRail();

  /* ── 6 · playground ring ───────────────────────────────────────────────── */
  const ring = $('#ring'), stage = $('#ringStage');
  const cards = $$('.ring__card', stage);
  const M = cards.length;
  // The ring is laid out for 5 slots (-2 … +2). With fewer projects every card gets a look-alike "twin" one full turn
  // (M slots) further round, so the far slots are never empty (e.g. 4 projects: C D [A] B C). Twins are not focusable.
  const twins = M < 5 ? cards.map(c => {
    const g = c.cloneNode(true);
    g.setAttribute('aria-hidden', 'true'); g.tabIndex = -1; g.classList.add('ring__twin');
    stage.appendChild(g); return g;
  }) : [];
  const info = $('#playInfo'), nameEl = $('#playName'), metaEl = $('#playMeta'), descEl = $('#playDesc');

  // slot geometry, solved from the reference frame (design px @1440):
  //   t = 0 flat centre · t = ±1 / ±2 fan out, grow, and turn a little toward the centre.
  //   ang = how far the side cards turn (was 20.8°), sx = extra sideways stretch (was 0.097): both lowered so the
  //   side images stay close to their true shape. Raise them for the stronger, more 3D look.
  const G = { x1: 358.5, x2: 718, z1: 130, z2: 281, ang: 7, sx: 0.015 };
  const smooth01 = v => v * v * (3 - 2 * v);
  function slot(t) {
    const s = Math.sign(t) || 1, u = Math.abs(t);
    const x = u <= 1 ? lerp(0, G.x1, u) : G.x1 + (u - 1) * (G.x2 - G.x1);
    const z = u <= 1 ? lerp(0, G.z1, u) : G.z1 + (u - 1) * (G.z2 - G.z1);
    const k = smooth01(Math.min(u, 1));
    return { x: s * x, z, a: -s * G.ang * k, sx: 1 + G.sx * k, o: clamp((2.55 - u) / 0.3, 0, 1) };
  }

  let progress = clamp(parseInt(params.get('ring') || '0', 10) || 0, 0, M - 1);
  let shown = -1;
  const wrap = v => ((v + 2.5) % M + M) % M - 2.5;     // → [-2.5, 2.5)

  function renderRing() {
    const kScale = parseFloat(getComputedStyle(ring).getPropertyValue('--ringk')) || 1;
    const place = (c, t) => {
      const p = slot(t);
      c.style.transform = `translate3d(${p.x * kScale}px,0,${p.z * kScale}px) rotateY(${p.a}deg) scale(${p.sx},1)`;
      c.style.opacity = p.o;
      c.style.zIndex = Math.round(100 - Math.abs(t) * 10);
      c.style.pointerEvents = p.o < 0.5 ? 'none' : 'auto';
      c.dataset.t = t.toFixed(2);
    };
    cards.forEach((c, i) => {
      const t = wrap(i - progress);
      place(c, t);
      if (twins.length) place(twins[i], t + M);                // the twin sits one full turn further round
    });
  }

  function setInfo(i) {
    if (i === shown) return; shown = i;
    const d = cards[i].dataset;
    nameEl.textContent = d.title; metaEl.textContent = d.meta; descEl.textContent = d.desc;
  }

  /* ── autoplay + navigation ───────────────────────────────────────────────
     • every 2.5s the ring moves forward one project  (1.0s slide + 1.5s rest)
     • HOVER a card (any card, centre or side)  → the ring holds still until the cursor leaves
     • CLICK + DRAG anywhere on the ring        → it follows the pointer; on release it glides on with momentum
                                                  (a hard flick carries several cards) and rests with a card centred
     • TRACKPAD / shift+wheel side-scroll works too
     • click ANY card (centre or side) → opens that project's link directly
     • click the project title        → opens the link of the project in the centre
     • ← / → keys also work                                                                */
  const SLIDE_MS = 1000, REST_MS = 1500;
  let anim = null, timer = null, inView = false, dragging = false;
  let target = progress;                                   // integer (unwrapped) index we are heading to
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const mod = v => ((v % M) + M) % M;
  const allCards = cards.concat(twins);
  // feed each card's own artwork to its hover glow (absolute URL: a relative one inside a CSS variable would resolve against css/)
  allCards.forEach(c => { const im = c.querySelector('img'); if (im) c.style.setProperty('--glow-img', `url("${im.src}")`); });
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;   // touch screens have no hover (and "sticky" :hover)

  // the ring holds still while the cursor is on a card, or while it is being dragged
  const held = () => dragging || (canHover && allCards.some(c => c.matches(':hover')));

  function animateTo(to, dur, ease = easeInOut) {
    clearTimeout(timer);
    if (anim) cancelAnimationFrame(anim);                  // re-target smoothly from wherever we are now
    const from = progress, idx = mod(to), start = performance.now();
    target = to;
    const swap = idx !== shown;
    info.classList.toggle('is-out', swap);
    let swapped = !swap;
    anim = requestAnimationFrame(function tick(now) {
      const k = clamp((now - start) / dur, 0, 1);
      progress = lerp(from, to, ease(k));
      renderRing();
      if (!swapped && k > 0.42) { swapped = true; setInfo(idx); info.classList.remove('is-out'); }
      if (k < 1) anim = requestAnimationFrame(tick);
      else {
        anim = null; progress = mod(to); target = progress; renderRing();
        setInfo(idx); info.classList.remove('is-out'); schedule();
      }
    });
  }

  function goBy(delta) {
    if (!delta) return;
    const to = Math.round(target) + delta;
    animateTo(to, reduceMotion ? 1 : SLIDE_MS + 200 * (Math.abs(to - progress) - 1));
  }

  function schedule(delay = REST_MS) {
    clearTimeout(timer);
    if (params.has('ring') || reduceMotion || document.hidden) return;
    timer = setTimeout(function fire() {
      if (held()) { timer = setTimeout(fire, 400); return; }   // cursor is on a card / dragging → stay put, look again shortly
      goBy(1);
    }, delay);
  }

  renderRing(); setInfo(Math.round(progress) % M);

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.25 }).observe(ring);   // only used to scope the arrow keys
  schedule(REST_MS + SLIDE_MS);                           // autoplay runs from page load, so it is already mid-cycle when you arrive
  document.addEventListener('visibilitychange', () => document.hidden ? clearTimeout(timer) : (!anim && !dragging && schedule()));

  // cursor leaves a card → the ring picks up its normal rhythm again after a rest (moving card → card just re-holds it)
  allCards.forEach(c => c.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && !anim && !dragging) schedule(); }));

  // every card is a direct link to its own project (centre or side) – no click-to-centre.
  // The only click we swallow is the one that ends a drag.
  let swiped = false;                                      // true right after a drag, so letting go never counts as a click
  allCards.forEach(c => c.addEventListener('click', e => { if (swiped) e.preventDefault(); }));
  // title acts as the link for the centre project
  nameEl.style.cursor = 'pointer';
  nameEl.addEventListener('click', () => { const c = cards[mod(Math.round(target))]; if (c && c.href) window.open(c.href, '_blank', 'noopener'); });

  /* ── click + drag the ring ───────────────────────────────────────────────
     The ring follows the pointer 1:1 while you hold it; let go and it glides to the nearest slot, carrying a little
     of your flick speed, so whichever card you want in the middle is the one that stays there.                    */
  const DRAG_START_PX = 6;
  let dragId = null, dragX0 = 0, dragP0 = 0, pxSlot = 400, samples = [], infoT = null;

  // while dragging, the text under the ring follows whichever card is nearest the centre (fades out → in)
  function followInfo() {
    const idx = mod(Math.round(progress));
    if (idx === shown) { if (!infoT) info.classList.remove('is-out'); return; }
    if (infoT) return;                                     // a swap is already queued; it reads the latest card when it fires
    info.classList.add('is-out');
    infoT = setTimeout(() => { infoT = null; setInfo(mod(Math.round(progress))); info.classList.remove('is-out'); }, 150);
  }

  const slotPx = () => G.x1 * (parseFloat(getComputedStyle(ring).getPropertyValue('--ringk')) || 1) * 1.12;   // ≈ screen px between two slots

  // trackpad / shift+wheel side-scroll: moves the ring like a drag, then settles on a card once the gesture (and its momentum) ends
  let wheelT = null;
  ring.addEventListener('wheel', e => {
    const dx = (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 16 : 1);
    if (!dx || (!e.shiftKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY))) return;   // plain vertical scrolling still scrolls the page
    e.preventDefault();
    if (dragging) return;
    clearTimeout(timer);
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    progress += dx / slotPx(); target = Math.round(progress);
    renderRing(); followInfo();
    clearTimeout(wheelT);
    wheelT = setTimeout(() => animateTo(Math.round(progress), reduceMotion ? 1 : 420, easeOut), 150);
  }, { passive: false });

  ring.addEventListener('dragstart', e => e.preventDefault());           // Firefox would otherwise start dragging the <a>
  ring.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragId = e.pointerId; dragX0 = e.clientX; samples = [{ t: e.timeStamp, x: e.clientX }];
  });
  ring.addEventListener('pointermove', e => {
    if (e.pointerId !== dragId) return;
    if (!dragging) {
      if (Math.abs(e.clientX - dragX0) < DRAG_START_PX) return;           // still just a click
      dragging = true; swiped = true;
      clearTimeout(timer);
      if (anim) { cancelAnimationFrame(anim); anim = null; }              // grab the ring wherever it is, even mid-slide
      dragX0 = e.clientX; dragP0 = progress;
      pxSlot = slotPx();
      ring.classList.add('is-dragging');
      try { ring.setPointerCapture(e.pointerId); } catch (_) {}
    }
    progress = dragP0 - (e.clientX - dragX0) / pxSlot;                    // drag right → the cards on the left come in
    target = Math.round(progress);
    renderRing(); followInfo();
    samples.push({ t: e.timeStamp, x: e.clientX });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 120) samples.shift();
  });
  function endDrag(e) {
    if (e.pointerId !== dragId) return;
    dragId = null;
    if (!dragging) return;
    dragging = false; ring.classList.remove('is-dragging');
    try { ring.releasePointerCapture(e.pointerId); } catch (_) {}
    setTimeout(() => { swiped = false; }, 60);
    const last = samples[samples.length - 1], first = samples[0];
    const dt = Math.max(1, last.t - first.t);
    const v = (e.timeStamp - last.t > 80) ? 0 : -(last.x - first.x) / dt / pxSlot;   // slots per ms (0 if you paused before letting go)
    const to = Math.round(progress + clamp(v * 480, -4, 4));                       // momentum: a flick can carry up to 4 cards
    animateTo(to, reduceMotion ? 1 : clamp(450 + 190 * Math.abs(to - progress), 450, 1200), easeOut);
  }
  ring.addEventListener('pointerup', endDrag);
  ring.addEventListener('pointercancel', endDrag);

  addEventListener('keydown', e => {
    if (!inView) return;
    if (e.key === 'ArrowRight') goBy(1); if (e.key === 'ArrowLeft') goBy(-1);
  });
})();
