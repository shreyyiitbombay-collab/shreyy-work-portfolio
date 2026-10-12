/* ==========================================================================
   Cat game — text-made cats float in the empty gaps below the bio and below the Achievements cards.
   Click / tap a cat to pop it (+10 points). Pop 3 (= 30 points) to win.

   • a new cat every 2.2 – 4.8 s (random), only while one of the gaps is on screen, max 4 at once
   • most cats cross the gap (randomly left → right or right → left) at a changing pace: they speed up, slow down, hesitate and
     sometimes slip back a little, while drifting up and down; the rest roam around quickly. All of them bob and tilt.
     A crossing cat fades out when it reaches the far side; a roaming cat floats away after ~7 – 10 s
   • "Pop me to win" hint under the 1st cat and then every 3rd cat (1, 4, 7 …)
   • "+10 points" floats up and fades slowly; the 5th pop triggers a "yay, you won!" celebration
   Tweak the numbers in SETTINGS.
   ========================================================================== */
(() => {
  'use strict';
  const root = document.documentElement;
  const layer = document.getElementById('catLayer');
  if (!layer) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── SETTINGS ─────────────────────────────────────────────────────────────────────────────────── */
  const WIN_AT = 3;                 // pops needed to win (3 × 10 = 30 points)  (was 5)
  const POINTS = 10;                // points per pop
  const GAP = [2200, 4800];         // random time between cats (ms)  (was 3000 – 6500)
  const LIFE = [7500, 10500];       // how long a ROAMING cat floats if nobody pops it (ms)
  const CROSS_SHARE = 0.7;          // share of cats that cross the gap (half each way); the rest roam
  const CROSS_TIME = [6500, 10000]; // how long a crossing cat takes to get across at its average pace (ms)
  const DART = [700, 1500];         // how often a crossing cat changes pace (ms)
  const SLIP_BACK = 0.12;           // chance that a pace change is a small step backwards
  const FIRST_DELAY = 900;          // wait after a gap first scrolls into view (ms)
  const MAX_CATS = 4;               // cats on screen at once (the oldest floats away to make room)
  const HINT_EVERY = 3;             // "Pop me to win" on cat 1, then every 3rd
  const HINT_MS = 1900;             // how long the hint stays

  /* ── helpers ──────────────────────────────────────────────────────────────────────────────────── */
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const scale = () => (parseFloat(getComputedStyle(root).fontSize) || 16) / 16;   // 1 design px in css px
  const pageRect = el => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; };
  const state = { spawned: 0, popped: 0, score: 0, won: false };
  const cats = [];

  /* ── the empty gaps (measured from the page, so they follow the layout on any screen) ───────────── */
  let zoneCache = { t: -1e9, list: [] };
  function zones() {
    const t = performance.now(); if (t - zoneCache.t < 250) return zoneCache.list; zoneCache.t = t;
    const q = s => document.querySelector(s), K = scale(), list = [];
    const bio = q('.away__body'), achTitle = q('.ach__title'), c1 = q('.ach__card--hci'), c2 = q('.ach__card--ip'), playTitle = q('.play__title');
    if (bio && achTitle) list.push({ top: pageRect(bio).bottom + 14 * K, bottom: pageRect(achTitle).top - 6 * K });           // below the bio, above Achievements
    if (c1 && c2 && playTitle) list.push({ top: Math.max(pageRect(c1).bottom, pageRect(c2).bottom) + 14 * K, bottom: pageRect(playTitle).top - 6 * K }); // below the cards, above My playground
    zoneCache.list = list; return list;
  }
  const xRange = () => { const w = root.clientWidth, K = scale(); return [Math.max(60 * K, w * 0.06), w - Math.max(60 * K, w * 0.06)]; };

  /* a gap that is (partly) on screen, plus the part of it that is on screen */
  function pickZone(any) {
    const K = scale(), vt = scrollY + innerHeight * 0.1, vb = scrollY + innerHeight * 0.9, cand = [];
    zones().forEach((z, i) => {
      const top = any ? z.top : Math.max(z.top, vt), bottom = any ? z.bottom : Math.min(z.bottom, vb);
      if (bottom - top >= 70 * K) cand.push({ i, top, bottom });
    });
    return cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
  }

  /* ── building a cat (pure text: ears / face / tail) ───────────────────────────────────────────── */
  const FACE_A = '(•\u2002•)', FACE_A_HAPPY = '(^\u2002^)';
  function makeCat(variant) {
    const el = document.createElement('div');
    el.className = 'cat cat--' + variant;
    el.innerHTML = variant === 'a'
      ? '<span class="cat__sprite"><span class="cat__body"><span class="cat__ears">^^</span><span class="cat__face">' + FACE_A + '</span></span><span class="cat__tail">ʃ</span></span>'
      : '<span class="cat__sprite"><span class="cat__face"><span class="cat__par">(</span><b class="cat__eye">^</b><span class="cat__dot">.</span><span class="cat__dot" style="margin-left:.42em">.</span><b class="cat__eye">^</b><span class="cat__par">)</span></span><span class="cat__tail">ʃ</span></span>';
    return el;
  }

  let lastVariant = '', variantRun = 0;                         // vary the two designs (never 3 of the same in a row)
  function nextVariant() {
    let v = Math.random() < 0.5 ? 'a' : 'b';
    if (v === lastVariant && variantRun >= 2) v = v === 'a' ? 'b' : 'a';
    variantRun = v === lastVariant ? variantRun + 1 : 1; lastVariant = v; return v;
  }

  function spawn(force) {
    if (state.won) return false;
    const pick = pickZone(force); if (!pick) return false;
    const K = scale(), [xl, xr] = xRange();
    const variant = nextVariant();
    const el = makeCat(variant); layer.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight, t = performance.now();
    const dir = Math.random() < CROSS_SHARE ? (Math.random() < 0.5 ? 1 : -1) : 0;   // 1 = left → right, -1 = right → left, 0 = roams
    const c = {
      el, variant, w, h, zi: pick.i, popped: false, leaving: false, born: t, dir,
      life: dir && !reduce ? 24000 : rand(...LIFE),                                   // a crosser leaves at the far side instead
      speed: (xr - xl - w) / (rand(...CROSS_TIME) / 1000), mult: 1, multT: 1, nextDart: t + rand(...DART),
      x: dir > 0 ? xl + w / 2 : dir < 0 ? xr - w / 2 : rand(xl + w / 2, xr - w / 2), y: rand(pick.top + h / 2 + 6 * K, Math.max(pick.top + h / 2 + 7 * K, pick.bottom - h / 2 - 34 * K)),
      vx: 0, vy: 0, tx: 0, ty: 0, retarget: 0, phase: rand(0, 6.283), bobAmp: rand(6, 11), bobHz: rand(0.45, 0.7), tilt: rand(2, 4), tf: ''
    };
    c.tx = c.x; c.ty = c.y; c.retarget = t + rand(900, 1800);
    cats.push(c);
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); pop(c); });
    state.spawned++;
    if ((state.spawned - 1) % HINT_EVERY === 0) hint(c);                       // 1st cat, then every 3rd
    place(c, t);
    return true;
  }

  function hint(c) {
    const m = document.createElement('div'); m.className = 'catmsg catmsg--hint'; m.textContent = 'Pop me to win';
    layer.appendChild(m); c.hint = m; setTimeout(() => { m.remove(); if (c.hint === m) c.hint = null; }, HINT_MS + 80);
  }

  /* ── motion: a soft spring toward a wandering target, plus a gentle bob and tilt ───────────────── */
  function place(c, t) {
    const K = scale();
    const bob = reduce ? 0 : Math.sin(t / 1000 * c.bobHz * 6.283 + c.phase) * c.bobAmp * K;
    const rot = reduce ? 0 : Math.sin(t / 1000 * c.bobHz * 3.1 + c.phase) * c.tilt;
    c.cy = c.y + bob;
    c.tf = 'translate3d(' + (c.x - c.w / 2).toFixed(1) + 'px,' + (c.cy - c.h / 2).toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
    c.el.style.transform = c.tf;
    if (c.hint) { c.hint.style.left = c.x.toFixed(1) + 'px'; c.hint.style.top = (c.cy + c.h / 2 - 8 * K).toFixed(1) + 'px'; }   // level pill under the cat
  }
  function step(c, t, dt) {
    if (c.popped) return;
    if (!reduce) {
      const K = scale(), z = zones()[c.zi], [xl, xr] = xRange();
      const yMin = z ? z.top + c.h / 2 + 6 * K : 0, yMax = z ? Math.max(yMin + K, z.bottom - c.h / 2 - 34 * K) : 0;
      if (c.dir) {
        /* crossing: glide to the other side at a changing pace (bursts, slow-downs, hesitations, small slips back) */
        if (t >= c.nextDart) {
          const r = Math.random();
          c.multT = r < SLIP_BACK ? rand(-0.9, -0.4) : r < 0.4 ? rand(0.1, 0.4) : r < 0.75 ? rand(0.9, 1.3) : rand(1.7, 2.4);
          c.nextDart = t + rand(...DART);
        }
        c.mult += (c.multT - c.mult) * Math.min(1, dt * 4);
        c.x = clamp(c.x + c.dir * c.speed * c.mult * dt, xl + c.w / 2, xr - c.w / 2);
        if (t >= c.retarget && z) { c.ty = clamp(c.y + rand(-1, 1) * 120 * K, yMin, yMax); c.retarget = t + rand(700, 1500); }
        c.vy += ((c.ty - c.y) * 3.4 - c.vy * 3.4) * dt; c.y += c.vy * dt;
        if (!c.leaving && (c.dir > 0 ? c.x >= xr - c.w / 2 - 1 : c.x <= xl + c.w / 2 + 1)) leave(c);   // reached the far side
      } else {
        /* roaming: quicker, wider moves than before */
        if (t >= c.retarget && z) {
          c.tx = clamp(c.x + rand(-1, 1) * 320 * K, xl + c.w / 2, xr - c.w / 2);
          c.ty = clamp(c.y + rand(-1, 1) * 120 * K, yMin, yMax);
          c.retarget = t + rand(1000, 2200);
        }
        c.vx += ((c.tx - c.x) * 3.4 - c.vx * 3.4) * dt; c.vy += ((c.ty - c.y) * 3.4 - c.vy * 3.4) * dt;
        c.x += c.vx * dt; c.y += c.vy * dt;
      }
    }
    place(c, t);
    if (!c.leaving && t > c.born + c.life) leave(c);
  }
  function leave(c) {
    if (c.leaving || c.popped) return; c.leaving = true; c.el.classList.add('is-leaving'); if (c.hint) c.hint.style.opacity = 0;
    setTimeout(() => { c.el.remove(); const i = cats.indexOf(c); if (i > -1) cats.splice(i, 1); }, 600);
  }

  /* ── popping, points, winning ─────────────────────────────────────────────────────────────────── */
  function at(el, x, y) { el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px'; layer.appendChild(el); return el; }
  function pop(c) {
    if (c.popped || c.leaving || state.won) return;
    c.popped = true; c.el.classList.add('is-popped');
    const face = c.el.querySelector('.cat__face'); if (c.variant === 'a' && face) face.textContent = FACE_A_HAPPY;
    const K = scale(), x = c.x, y = c.cy;
    if (c.hint) { c.hint.remove(); c.hint = null; }
    c.el.animate([{ transform: c.tf + ' scale(1)', opacity: 1 }, { transform: c.tf + ' scale(1.7)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    setTimeout(() => { c.el.remove(); const i = cats.indexOf(c); if (i > -1) cats.splice(i, 1); }, 400);
    burst(x, y, K);
    const m = document.createElement('div'); m.className = 'catmsg catmsg--score'; m.textContent = '+' + POINTS + ' points';
    at(m, x, y - 44 * K); setTimeout(() => m.remove(), 2000);
    state.popped++; state.score += POINTS;
    if (state.popped >= WIN_AT) setTimeout(() => win(x, y), 420);
  }

  function burst(x, y, K) {                                    // a little pop of dots and carets
    const chars = ['•', '•', '^', '·', '•', '^', '·', '•'];
    chars.forEach((ch, i) => {
      const b = document.createElement('span'); b.className = 'catbit'; b.textContent = ch; b.style.fontSize = (12 + (i % 3) * 3) * K + 'px';
      at(b, x, y);
      const a = i / chars.length * 6.283 + rand(-0.3, 0.3), d = rand(28, 54) * K;
      b.animate([{ transform: 'translate(-50%,-50%) translate(0,0) rotate(0deg)', opacity: 1 },
                 { transform: 'translate(-50%,-50%) translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) rotate(' + rand(-120, 120) + 'deg)', opacity: 0 }],
                { duration: rand(420, 620), easing: 'cubic-bezier(.15,.8,.3,1)', fill: 'forwards' }).onfinish = () => b.remove();
    });
  }

  function win(x, y) {
    state.won = true; zoneCache.t = -1e9;
    cats.slice().forEach(leave);
    const K = scale(), w = root.clientWidth;
    const m = document.createElement('div'); m.className = 'catmsg catmsg--win';
    m.innerHTML = 'yay, you won! <b>' + state.score + ' points</b>';
    layer.appendChild(m);
    const half = m.offsetWidth / 2 + 14 * K;                                       // keep the whole pill on screen
    const px = clamp(x, half, w - half), py = clamp(y, scrollY + innerHeight * 0.3, scrollY + innerHeight * 0.7);
    at(m, px, py); setTimeout(() => m.remove(), 4200);
    confetti(px, py, K);
  }

  function confetti(x, y, K) {                                 // white / blue confetti: squares, dots and carets
    const colors = ['#f8f8ff', '#2aa1e0', '#7dc3e4', '#6870ff', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const b = document.createElement('span'); b.className = 'catbit';
      const kind = i % 3, col = colors[i % colors.length];
      if (kind === 0) { b.style.cssText = 'width:' + 8 * K + 'px;height:' + 8 * K + 'px;border-radius:2px;background:' + col; }
      else if (kind === 1) { b.style.cssText = 'width:' + 7 * K + 'px;height:' + 7 * K + 'px;border-radius:50%;background:' + col; }
      else { b.textContent = '^'; b.style.cssText = 'font-size:' + 18 * K + 'px;line-height:1;color:' + col; }
      at(b, x, y);
      const ang = rand(-2.75, -0.4), v = rand(260, 560) * K, g = 900 * K, T = rand(1.5, 2.3), spin = rand(-540, 540);
      const kf = [];
      for (let s = 0; s <= 8; s++) {
        const f = s / 8, tt = T * f;
        kf.push({ transform: 'translate(-50%,-50%) translate(' + (Math.cos(ang) * v * tt).toFixed(1) + 'px,' + (Math.sin(ang) * v * tt + 0.5 * g * tt * tt).toFixed(1) + 'px) rotate(' + (spin * f).toFixed(0) + 'deg)',
                 opacity: f < 0.65 ? 1 : 1 - (f - 0.65) / 0.35 });
      }
      b.animate(kf, { duration: T * 1000, easing: 'linear', fill: 'forwards' }).onfinish = () => b.remove();
    }
  }

  /* ── the loop: moves the cats and decides when the next one appears ───────────────────────────── */
  let last = performance.now(), nextSpawn = Infinity;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    cats.slice().forEach(c => step(c, t, dt));
    if (!state.won) {
      if (nextSpawn === Infinity) { if (pickZone()) nextSpawn = t + FIRST_DELAY; }            // a gap just came into view
      else if (t >= nextSpawn) {
        if (!pickZone()) nextSpawn = Infinity;                                                // scrolled away: wait for the next time
        else {
          const live = cats.filter(c => !c.leaving && !c.popped);
          if (live.length >= MAX_CATS) leave(live[0]);                                         // keep the rhythm: oldest cat floats away
          if (spawn()) nextSpawn = t + rand(...GAP);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.catGame = { spawn: force => spawn(!!force), state, cats };     // handy for testing in the console
})();
