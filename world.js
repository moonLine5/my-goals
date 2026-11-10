/* My Goals — 3D sahneler: dünya küresi ve ada */
const World = (function () {
  'use strict';
  const { V, M, Geo, P, Engine, hex, shade } = E3;
  const D = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => V.lerp(a, b, t);
  function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = p => { const x = Math.sin(p[0] * 127.1 + p[1] * 311.7 + p[2] * 74.7) * 43758.5453; return x - Math.floor(x); };

  let eng, cv, labelsEl, mode = 'island', forceNight = false, closeup = false, running = true, last = 0, T = 0;
  const sc = { sky: [0, 0, 0], L: [0, 1, 0], LC: [1, 1, 1], amb: [.5, .5, .5], fogC: [0, 0, 0], fog: [30, 90] };
  const cam = { eye: [0, 0, 5], target: [0, 0, 0], up: [0, 1, 0], fov: 48 * D, near: 0.1, far: 400 };
  const gb = { yaw: 0, pitch: 0.1, dist: 3.4, nodes: [], labels: [], armed: true };
  const il = { yaw: 0.7, pitch: 0.5, dist: 27, nodes: [], ci: -1, th: null, dayF: 1 };
  const cb = { pick: null, descend: null };
  let stars, dbgPh = null;

  /* ================= DÜNYA KÜRESİ ================= */
  const CC = [[5, 0, .24], [42, 58, .36], [30, -62, .34], [-28, 112, .36], [-34, -112, .36], [72, 180, .30], [-68, 15, .32]].map(a => {
    const la = a[0] * D, lo = a[1] * D; return { d: [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)], s: a[2] };
  });
  const GP = [['#ead9a8', '#6ab04c', '#4e9a3a'], ['#3c8f47', '#2f7d3b', '#1f5f2c'], ['#6f7f73', '#8a8f98', '#ffffff'], ['#e6d3a3', '#b8b06a', '#d8c9a0'],
  ['#edc98a', '#e0b56b', '#c98f4a'], ['#cfe3ee', '#eef5f9', '#ffffff'], ['#f1e9ff', '#b9a7e0', '#ff9ecb']].map(a => a.map(hex));
  const nz = p => Math.sin(p[0] * 9 + p[1] * 4) * Math.sin(p[1] * 8 + p[2] * 5) + Math.sin(p[2] * 11 + p[0] * 3) * 0.6;
  function landAt(p) {
    let best = -9, bi = 0; const n = 0.055 * nz(p);
    for (let i = 0; i < 7; i++) { const v = CC[i].s - Math.acos(clamp(V.dot(p, CC[i].d), -1, 1)) + n; if (v > best) { best = v; bi = i; } }
    return [best, bi];
  }
  function buildGlobe() {
    const s = G.s;
    gb.nodes.forEach(n => { if (n !== stars) eng.free(n.mesh); }); gb.nodes = [];
    const ocean = hex('#2b7fc4');
    const geo = P.sphere(1, 4, ce => {
      const r = landAt(ce), h = hash(ce);
      if (r[0] <= 0) return shade(ocean, 0.86 + 0.2 * h + (r[0] > -0.05 ? 0.18 : 0));
      const pal = GP[r[1]]; let c = shade(r[0] < 0.035 ? pal[0] : r[0] < 0.2 ? pal[1] : pal[2], 0.9 + 0.18 * h);
      if (!s.unlocked[r[1]]) { const g = c[0] * .3 + c[1] * .59 + c[2] * .11; c = mix(c, [g * .7 + .16, g * .7 + .17, g * .7 + .2], 0.9); }
      return c;
    }, p => { const v = landAt(p)[0]; return v > 0 ? 1.012 + Math.min(v, 0.3) * 0.3 : 1; });
    gb.nodes.push(eng.node(geo));
    // kilitli kıtaların üstünde sis bulutları
    const cg = new Geo(), rd = rng(77), blob = P.sphere(1, 1, [0.93, 0.95, 0.98]);
    CC.forEach((c, i) => {
      if (s.unlocked[i]) return;
      const t1 = V.norm(V.cross(c.d, Math.abs(c.d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), t2 = V.cross(c.d, t1);
      for (let k = 0; k < 12; k++) {
        const a = rd() * TAU, r = rd() * c.s * 0.95;
        const p = V.mul(V.norm(V.add(c.d, V.add(V.mul(t1, Math.cos(a) * r), V.mul(t2, Math.sin(a) * r)))), 1.13 + rd() * 0.03);
        const sz = 0.03 + rd() * 0.035; cg.put(blob, p[0], p[1], p[2], rd() * 6, [sz * 1.6, sz * 0.8, sz * 1.4]);
      }
    });
    gb.clouds = eng.node(cg, { emis: 0.55 }); gb.nodes.push(gb.clouds);
    gb.nodes.push(stars);
    refreshLabels();
  }
  function refreshLabels() {
    const s = G.s;
    gb.labels.forEach((el, i) => {
      el.className = 'clabel' + (s.unlocked[i] ? '' : ' locked') + (s.cur === i ? ' cur' : '');
      el.innerHTML = '<span>' + G.CONT[i].icon + '</span>' + (s.unlocked[i] ? '' : '<i>🔒</i>');
    });
  }
  function faceContinent(i) { const d = CC[i].d; gb.yaw = Math.atan2(d[0], d[2]); gb.pitch = clamp(Math.asin(d[1]), -1.2, 1.2); }
  const eyeDir = () => [Math.cos(gb.pitch) * Math.sin(gb.yaw), Math.sin(gb.pitch), Math.cos(gb.pitch) * Math.cos(gb.yaw)];
  function nearest(p, slack) {
    let bi = -1, ba = 9;
    CC.forEach((c, i) => { const a = Math.acos(clamp(V.dot(p, c.d), -1, 1)) - c.s; if (a < ba) { ba = a; bi = i; } });
    return ba < slack ? bi : -1;
  }
  function globeTap(x, y) {
    const d = eng.ray(x, y), o = cam.eye, R = 1.06;
    const b = V.dot(o, d), c = V.dot(o, o) - R * R, disc = b * b - c;
    if (disc < 0) return;
    const p = V.norm(V.add(o, V.mul(d, -b - Math.sqrt(disc)))), i = nearest(p, 0.1);
    if (i >= 0 && cb.pick) cb.pick(i);
  }
  function checkDescend() {
    if (gb.dist > 1.85) { gb.armed = true; return; }
    if (!gb.armed) return;
    const i = nearest(eyeDir(), 0.08);
    if (i >= 0 && G.s.unlocked[i] && cb.descend) { gb.armed = false; cb.descend(i); }
  }
  function frameGlobe() {
    const e = eyeDir();
    cam.eye = V.mul(e, gb.dist); cam.target = [0, 0, 0]; cam.fov = 42 * D; cam.near = 0.05;
    eng.setCam(cam);
    sc.sky = [0.02, 0.03, 0.08]; sc.fogC = sc.sky; sc.fog = [200, 300];
    sc.L = V.norm(V.add(V.mul(e, 0.75), V.add(V.mul(eng.rt, -0.45), V.mul(eng.upv, 0.5))));
    sc.LC = [0.85, 0.83, 0.78]; sc.amb = [0.42, 0.45, 0.52];
    stars.tint = [0.8, 0.8, 0.9]; stars.visible = true; stars.rot = [0.3, T * 0.004, 0];
    const p = 1 + Math.sin(T * 0.8) * 0.004; gb.clouds.scale = [p, p, p]; gb.clouds.rot = [0, Math.sin(T * 0.1) * 0.03, 0];
    eng.render(gb.nodes, sc);
    gb.labels.forEach((el, i) => {
      const d = CC[i].d, vis = V.dot(d, e) > 0.3, q = vis && eng.project(V.mul(d, 1.2));
      if (q) { el.style.display = 'flex'; el.style.transform = 'translate(' + (q[0] - 22) + 'px,' + (q[1] - 22) + 'px)'; } else el.style.display = 'none';
    });
  }

  /* ================= ADA ================= */
  const TH = [
    { g: '#6ab04c', g2: '#7cc45a', sand: '#ead9a8', dirt: '#c8b07a', water: '#2e86c1', rock: '#8d99a6', amp: 1.0, trees: ['palm', 'palm', 'round'], n: 16, rocks: 7, leaf: '#3fa34d', sky: [0.50, 0.78, 0.93] },
    { g: '#2f7d3b', g2: '#3a8c46', sand: '#d9cfa0', dirt: '#8a7a55', water: '#2a7ab0', rock: '#707a80', amp: 1.3, trees: ['pine'], n: 30, rocks: 6, leaf: '#1f6b33', sky: [0.50, 0.74, 0.86] },
    { g: '#6f7f73', g2: '#7d8a80', sand: '#b9b3a3', dirt: '#8e8a80', water: '#35749e', rock: '#8a8f98', amp: 3.4, snow: 2.3, trees: ['pine'], n: 10, rocks: 16, leaf: '#2d5f3a', sky: [0.58, 0.76, 0.92] },
    { g: '#b8b06a', g2: '#a9a35c', sand: '#e6d3a3', dirt: '#cdbb8c', water: '#2f9bb5', rock: '#d8d2c0', amp: 0.9, trees: ['round', 'column', 'column'], n: 16, rocks: 6, leaf: '#7a8f4a', sky: [0.55, 0.80, 0.94] },
    { g: '#e0b56b', g2: '#d9a95c', sand: '#edc98a', dirt: '#d6aa62', water: '#3aa0a8', rock: '#c07f4a', amp: 1.6, trees: ['cactus'], n: 10, rocks: 10, leaf: '#5a9a4a', sky: [0.62, 0.80, 0.90] },
    { g: '#eef5f9', g2: '#dfeaf2', sand: '#cfe3ee', dirt: '#e3edf3', water: '#5b8fb0', rock: '#b9d3e3', amp: 1.8, trees: ['ice', 'snowpine'], n: 14, rocks: 8, leaf: '#3d6f58', sky: [0.66, 0.80, 0.92] },
    { g: '#b9a7e0', g2: '#a892d8', sand: '#f1e9ff', dirt: '#cbbdea', water: '#f4f7fb', rock: '#d9c8ff', amp: 1.0, trees: ['pastel'], n: 14, rocks: 6, leaf: '#ff9ecb', sky: [0.62, 0.72, 0.98] }
  ];
  const WOOD = hex('#8a5a33'), WOOD2 = hex('#6e4526'), STONE = hex('#9aa3ab'), DARK = hex('#3a2c20'), WIN = hex('#ffe9a8');
  const SHORE = 0.5, CAMP_Y = 0.5;
  let HS = 0, HA = 1;
  function H(x, z) {
    const r = Math.hypot(x, z);
    const base = r < 11.5 ? 0.5 : r < 13.2 ? 0.5 - (r - 11.5) / 1.7 * 0.48 : 0.02 - (r - 13.2) * 0.5;
    const n = (Math.sin(x * 0.7 + HS) * Math.cos(z * 0.6 + HS * 1.3) + Math.sin(x * 0.31 + z * 0.47 + HS * 2.1)) * 0.25 + 0.5;
    return base + Math.max(0, n) * HA * smooth(5.6, 8.2, r) * (1 - smooth(9.6, 11.5, r));
  }
  function treeGeo(type, r, th) {
    const g = new Geo(), leaf = hex(th.leaf), s = 0.8 + r() * 0.5;
    if (type === 'palm') {
      const lean = (r() - 0.5) * 0.3;
      g.put(P.cyl(0.16, 0.11, 2.6, 5, WOOD), 0, 0, 0, 0, 1, lean, 0);
      const top = [0, 2.55 * Math.cos(lean), 2.55 * Math.sin(lean)];
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + r(); g.add(P.box(1.7, 0.07, 0.5, shade(leaf, 0.85 + r() * 0.3)), M.mul(M.trs(top, [0, a, -0.45], [1, 1, 1]), M.trs([0.8, 0, 0], [0, 0, 0], [1, 1, 1]))); }
    } else if (type === 'pine' || type === 'snowpine') {
      g.put(P.cyl(0.14, 0.1, 0.9, 5, WOOD2), 0, 0, 0);
      for (let i = 0; i < 3; i++) g.put(P.cone(1.0 - i * 0.25, 1.3, 6, shade(type === 'snowpine' && i === 2 ? [1, 1, 1] : leaf, 0.85 + i * 0.12), r()), 0, 0.7 + i * 0.75, 0);
    } else if (type === 'round' || type === 'pastel') {
      g.put(P.cyl(0.15, 0.1, 1.2, 5, WOOD), 0, 0, 0);
      const c = type === 'pastel' ? hex(['#ff9ecb', '#9be7ff', '#ffe08a'][r() * 3 | 0]) : leaf;
      g.put(P.sphere(0.95, 1, ce => shade(c, 0.85 + hash(ce) * 0.3)), 0, 1.8, 0, r() * 6, [1, 0.85, 1]);
    } else if (type === 'cactus') {
      g.put(P.cyl(0.25, 0.22, 1.9, 6, leaf), 0, 0, 0);
      g.put(P.box(0.6, 0.18, 0.18, leaf), 0.4, 0.9, 0); g.put(P.box(0.18, 0.6, 0.18, leaf), 0.62, 0.9, 0);
      g.put(P.box(0.5, 0.18, 0.18, leaf), -0.36, 1.2, 0); g.put(P.box(0.18, 0.45, 0.18, leaf), -0.54, 1.2, 0);
    } else if (type === 'ice') {
      for (let i = 0; i < 3; i++) g.put(P.cone(0.3 + r() * 0.2, 1 + r() * 1.4, 5, shade(hex('#bfe6fa'), 0.9 + r() * 0.2)), (r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9, r() * 6, 1, (r() - 0.5) * 0.3);
    } else if (type === 'column') {
      const h = 1 + r() * 1.6, c = hex('#ece6d6');
      g.put(P.box(0.7, 0.2, 0.7, c), 0, 0, 0); g.put(P.cyl(0.24, 0.22, h, 8, c), 0, 0.2, 0);
      if (h > 1.8) g.put(P.box(0.66, 0.18, 0.66, c), 0, 0.2 + h, 0);
    }
    const o = new Geo(); o.put(g, 0, 0, 0, r() * 6, s); return o;
  }
  function rockGeo(r, col) {
    const sd = r() * 100;
    return P.sphere(1, 1, ce => shade(col, 0.8 + hash(ce) * 0.35), p => 0.7 + 0.45 * hash([p[0] + sd, p[1], p[2]]));
  }
  function buildIsland(ci) {
    il.nodes.forEach(n => { if (n !== stars) eng.free(n.mesh); }); il.nodes = [];
    il.ci = ci; const th = il.th = TH[ci]; HS = ci * 1.7 + 0.4; HA = th.amp;
    const r = rng(1000 + ci * 31), g = new Geo();
    const cg = hex(th.g), cg2 = hex(th.g2), sand = hex(th.sand), dirt = hex(th.dirt);
    // arazi (kutupsal ızgara)
    const rings = [0, 2, 3.8, 5.4, 6.8, 8.2, 9.6, 10.8, 11.8, 12.6, 13.4, 14.2, 15.4], S = 30, pts = [];
    rings.forEach((rr, i) => { const row = []; for (let j = 0; j < S; j++) { const a = (j + (i % 2) * 0.5) / S * TAU, q = rr > 0 && rr < 15 ? rr + (r() - 0.5) * 0.5 : rr; const x = Math.cos(a) * q, z = Math.sin(a) * q; row.push([x, H(x, z), z]); } pts.push(row); });
    const col = (a, b, c) => {
      const x = (a[0] + b[0] + c[0]) / 3, y = (a[1] + b[1] + c[1]) / 3, z = (a[2] + b[2] + c[2]) / 3, rr = Math.hypot(x, z), h = hash([x, y, z]);
      if (rr > 11.7) return shade(sand, 0.92 + h * 0.14);
      if (rr < 4.9) return shade(dirt, 0.94 + h * 0.1);
      if (th.snow && y > th.snow) return shade([1, 1, 1], 0.92 + h * 0.08);
      return shade(h > 0.5 ? cg : cg2, 0.9 + h * 0.18);
    };
    const tr = (a, b, c) => g.tri(a, b, c, col(a, b, c), [(a[0] + b[0] + c[0]) / 3, -50, (a[2] + b[2] + c[2]) / 3]);
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < S; j++) {
      const j1 = (j + 1) % S, a = pts[i][j], b = pts[i][j1], c = pts[i + 1][j], d = pts[i + 1][j1];
      if (i % 2 === 0) { tr(a, b, c); tr(b, d, c); } else { const c0 = pts[i + 1][(j + S) % S]; tr(a, b, d); tr(a, d, c0); }
    }
    // ağaç & kayalar
    const taken = [[-3.4, -2.4, 2.6], [3.6, 3.2, 2.4], [4.9, -3.3, 1.4]];
    const spot = (r0, r1) => { for (let k = 0; k < 30; k++) { const a = r() * TAU, q = r0 + r() * (r1 - r0), x = Math.cos(a) * q, z = Math.sin(a) * q; if (q < 10.2 && Math.abs(((a - 0.87 + Math.PI) % TAU + TAU) % TAU - Math.PI) < 0.5) continue;
      if (taken.every(t => Math.hypot(x - t[0], z - t[1]) > t[2])) { taken.push([x, z, 0.9]); return [x, z]; } } return null; };
    il.treeSpots = [];
    for (let i = 0; i < th.n; i++) { const p = spot(7, 10.9); if (!p) continue; g.put(treeGeo(th.trees[r() * th.trees.length | 0], r, th), p[0], H(p[0], p[1]) - 0.05, p[1]); il.treeSpots.push(p); }
    il.rockSpots = [];
    for (let i = 0; i < th.rocks; i++) { const p = spot(6.8, 12.4); if (!p) continue; const s = 0.35 + r() * 0.6; g.put(rockGeo(r, hex(th.rock)), p[0], H(p[0], p[1]) + s * 0.25, p[1], r() * 6, [s, s * 0.7, s]); il.rockSpots.push(p); }
    // kurdun kayası
    const wr = [Math.cos(4.0) * 10.6, Math.sin(4.0) * 10.6];
    g.put(rockGeo(r, hex(th.rock)), wr[0], H(wr[0], wr[1]) + 0.2, wr[1], 0, [1.3, 0.7, 1.3]);
    il.wolfRock = [wr[0], H(wr[0], wr[1]) + 0.72, wr[1]];
    // kamp ateşi
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.put(rockGeo(r, hex('#7d8790')), Math.cos(a) * 0.62, CAMP_Y + 0.08, Math.sin(a) * 0.62, 0, 0.16); }
    for (let i = 0; i < 3; i++) g.put(P.box(0.14, 0.14, 0.95, WOOD2), 0, CAMP_Y + 0.05, 0, i * 1.05, 1, 0.25);
    il.nodes.push(eng.node(g));
    // deniz
    const wg = new Geo(), wc = hex(th.water), N = 18, W = 150, wp = [];
    for (let i = 0; i <= N; i++) { wp.push([]); for (let j = 0; j <= N; j++) wp[i].push([(i / N - 0.5) * W + (r() - 0.5) * 3, (r() - 0.5) * 0.12, (j / N - 0.5) * W + (r() - 0.5) * 3]); }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const a = wp[i][j], b = wp[i + 1][j], c = wp[i + 1][j + 1], d = wp[i][j + 1];
      wg.tri(a, b, c, shade(wc, 0.9 + r() * 0.2), [a[0], -50, a[2]]); wg.tri(a, c, d, shade(wc, 0.9 + r() * 0.2), [a[0], -50, a[2]]);
    }
    il.water = eng.node(wg); il.nodes.push(il.water);
    // alev, parıltı, güneş, ay
    const fg = new Geo(); fg.put(P.cone(0.34, 0.95, 5, hex('#ff8a1e')), 0, 0, 0); fg.put(P.cone(0.2, 0.62, 5, hex('#ffd94a')), 0, 0, 0, 0.6);
    il.flame = eng.node(fg, { pos: [0, CAMP_Y + 0.1, 0], emis: 1 }); il.nodes.push(il.flame);
    il.glow = eng.node(P.sphere(1, 1, [0.5, 0.25, 0.06]), { pos: [0, CAMP_Y + 0.4, 0], add: true, emis: 1, scale: [1.6, 1.1, 1.6] }); il.nodes.push(il.glow);
    il.sun = eng.node(P.sphere(4.5, 1, hex('#ffe27a')), { emis: 1, nofog: true }); il.nodes.push(il.sun);
    il.moon = eng.node(P.sphere(3.4, 1, ce => shade(hex('#e8ecf5'), 0.85 + hash(ce) * 0.2)), { emis: 1, nofog: true }); il.nodes.push(il.moon);
    il.nodes.push(stars);
    il.camp = eng.node(null); il.raft = eng.node(null); il.ship = eng.node(null); il.player = eng.node(null); il.wolf = eng.node(null); il.cast = [];
    for (let i = 0; i < 6; i++) il.cast.push(eng.node(null, { visible: false }));
    il.nodes.push(il.camp, il.raft, il.ship, il.player, il.wolf, ...il.cast);
    il.pl = { x: 1.4, z: 1.2, tx: 1.4, tz: 1.2, wait: 1, ry: 0 };
    il.wf = null;
    refresh();
  }

  /* ---- yapılar ---- */
  function shelter(lv) {
    const g = new Geo();
    if (lv === 1) {
      const c = hex('#d9c9a3'), c2 = hex('#bfae86'), w = 1.2, h = 1.7, d = 1.3, ref = [0, 0.5, 0];
      g.quad([-w, 0, -d], [0, h, -d], [0, h, d], [-w, 0, d], c, ref); g.quad([w, 0, -d], [0, h, -d], [0, h, d], [w, 0, d], c2, ref);
      g.tri([-w, 0, -d], [w, 0, -d], [0, h, -d], c2, ref); g.tri([-w, 0, d], [w, 0, d], [0, h, d], c, ref);
      g.tri([-0.4, 0, d + 0.02], [0.4, 0, d + 0.02], [0, 1.0, d + 0.02], DARK, ref);
    } else if (lv === 2) {
      g.put(P.box(2.6, 1.5, 2.2, WOOD), 0, 0, 0); g.put(P.box(3.1, 0.16, 2.7, WOOD2), 0, 1.5, 0, 0, 1, 0, 0.13);
      g.put(P.box(0.6, 1.0, 0.06, DARK), 0, 0, 1.1);
    } else if (lv === 3) {
      g.put(P.box(3, 1.7, 2.6, hex('#d2b48c')), 0, 0, 0); g.put(P.cone(2.45, 1.3, 4, hex('#b04a3a'), Math.PI / 4), 0, 1.7, 0, 0, [1, 1, 0.9]);
      g.put(P.box(0.6, 1.1, 0.06, DARK), 0, 0, 1.3); g.put(P.box(0.5, 0.5, 0.06, WIN), -0.95, 0.75, 1.3); g.put(P.box(0.5, 0.5, 0.06, WIN), 0.95, 0.75, 1.3);
    } else if (lv === 4) {
      g.put(P.box(3.4, 2, 3, STONE), 0, 0, 0); g.put(P.cone(2.85, 1.4, 4, hex('#4f5d6b'), Math.PI / 4), 0, 2, 0, 0, [1, 1, 0.92]);
      g.put(P.box(0.5, 1.5, 0.5, shade(STONE, 0.8)), 1, 2.1, -0.6); g.put(P.box(0.7, 1.2, 0.06, DARK), 0, 0, 1.5);
      g.put(P.box(0.55, 0.55, 0.06, WIN), -1.05, 0.9, 1.5); g.put(P.box(0.55, 0.55, 0.06, WIN), 1.05, 0.9, 1.5);
    } else if (lv >= 5) {
      const w = hex('#c9b79c'), rf = hex('#7a2f2f');
      g.put(P.box(4.2, 2, 3.2, w), 0, 0, 0); g.put(P.box(3, 1.6, 2.6, shade(w, 1.06)), 0, 2, 0);
      g.put(P.cone(2.5, 1.4, 4, rf, Math.PI / 4), 0, 3.6, 0, 0, [1, 1, 0.9]); g.put(P.box(4.5, 0.14, 0.9, rf), 0, 2, 1.7);
      g.put(P.cyl(0.8, 0.8, 4.2, 6, shade(w, 0.92)), -2.5, 0, -0.6); g.put(P.cone(1.0, 1.3, 6, rf), -2.5, 4.2, -0.6);
      g.put(P.box(0.8, 1.3, 0.06, DARK), 0, 0, 1.6);
      [-1.4, 1.4].forEach(x => { g.put(P.box(0.55, 0.6, 0.06, WIN), x, 0.9, 1.6); g.put(P.box(0.5, 0.55, 0.06, WIN), x * 0.6, 2.6, 1.3); });
    }
    return g;
  }
  function special(ci) {
    const g = new Geo();
    if (ci === 1) { [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]].forEach(p => g.put(P.box(0.16, 1.5, 0.16, WOOD2), p[0], 0, p[1])); g.put(P.box(2.6, 0.14, 2.2, WOOD), 0, 1.5, 0, 0, 1, 0, 0.1); for (let i = 0; i < 4; i++) g.put(P.cyl(0.16, 0.16, 1.4, 6, WOOD), -0.6 + (i % 2) * 0.34, 0.16 + (i > 1 ? 0.3 : 0), -0.7, 0, 1, Math.PI / 2); }
    else if (ci === 2) { g.put(P.box(2.2, 1.3, 1.8, shade(STONE, 0.75)), 0, 0, 0); g.put(P.box(0.6, 2.4, 0.6, shade(STONE, 0.6)), 0.6, 0, -0.4); g.put(P.box(0.7, 0.5, 0.08, hex('#ff7a1e')), -0.3, 0.2, 0.9); g.put(P.box(0.8, 0.3, 0.4, hex('#444b52')), -1.6, 0.4, 0.5); g.put(P.box(0.3, 0.4, 0.3, WOOD2), -1.6, 0, 0.5); }
    else if (ci === 3) { const c = hex('#ece6d6'); g.put(P.box(3, 0.25, 2.4, c), 0, 0, 0); g.put(P.box(2.4, 1.5, 1.6, shade(c, 0.94)), 0, 0.25, -0.2); for (let i = 0; i < 4; i++) g.put(P.cyl(0.14, 0.13, 1.5, 6, c), -1.05 + i * 0.7, 0.25, 0.9); g.put(P.cone(1.9, 0.7, 4, hex('#c97b5a'), Math.PI / 4), 0, 1.75, 0, 0, [1, 1, 0.85]); }
    else if (ci === 4) { g.put(P.cyl(1.2, 1.2, 0.8, 8, hex('#c9a26a')), 0, 0, 0); g.put(P.cyl(1.0, 1.0, 0.05, 8, hex('#3aa0d8')), 0, 0.78, 0); g.put(P.box(0.14, 1.6, 0.14, WOOD2), -1.1, 0, 0); g.put(P.box(0.14, 1.6, 0.14, WOOD2), 1.1, 0, 0); g.put(P.box(2.4, 0.12, 0.2, WOOD2), 0, 1.6, 0); }
    else if (ci === 5) { g.put(P.box(2.4, 1.4, 2, WOOD2), 0, 0, 0); g.put(P.cone(2.0, 1.2, 4, [1, 1, 1], Math.PI / 4), 0, 1.4, 0, 0, [1, 1, 0.9]); g.put(P.box(0.5, 0.9, 0.06, DARK), 0, 0, 1.0); g.put(P.box(0.4, 0.4, 0.06, WIN), 0.75, 0.6, 1.0); g.put(P.box(0.35, 1.0, 0.35, STONE), -0.7, 1.5, -0.4); }
    else if (ci === 6) { const c = hex('#e9e4f7'); g.put(P.cyl(1.2, 1.2, 1.6, 8, c), 0, 0, 0); g.put(P.sphere(1.25, 1, hex('#8d7bd0')), 0, 1.6, 0, 0, [1, 0.75, 1]); g.put(P.cyl(0.16, 0.22, 1.5, 6, hex('#444b52')), 0.3, 2.0, 0.3, 0.6, 1, 0.9); }
    return g;
  }
  function raftGeo() {
    const g = new Geo();
    for (let i = 0; i < 5; i++) g.put(P.box(0.36, 0.3, 2.6, i % 2 ? WOOD : WOOD2), -0.8 + i * 0.4, 0, 0);
    g.put(P.box(1.9, 0.1, 0.16, DARK), 0, 0.3, -0.8); g.put(P.box(1.9, 0.1, 0.16, DARK), 0, 0.3, 0.8);
    g.put(P.box(0.09, 2.0, 0.09, WOOD2), 0, 0.3, 0);
    const c = hex('#f1ead8'); g.tri([0.06, 0.7, 0], [0.06, 2.2, 0], [1.2, 0.8, 0.2], c); g.tri([0.06, 0.7, 0], [1.2, 0.8, 0.2], [0.06, 2.2, 0], c);
    return g;
  }
  function shipGeo() {
    const g = new Geo(), hull = hex('#7a4a28'), c = hex('#f4efe2');
    g.put(P.box(1.7, 1.0, 4.2, hull, hex('#b98a55')), 0, -0.3, 0);
    g.put(P.cone(0.9, 1.5, 4, hull, Math.PI / 4), 0, 0.2, 2.1, 0, 1, Math.PI / 2);
    g.put(P.box(1.9, 0.14, 4.4, shade(hull, 0.7)), 0, 0.62, 0);
    g.put(P.box(1.2, 0.7, 1.2, hex('#b98a55')), 0, 0.7, -1.3);
    g.put(P.box(0.12, 3.6, 0.12, WOOD2), 0, 0.7, 0.3);
    const sail = (y0, y1, w) => { const a = [-w, y0, 0.45], b = [w, y0, 0.45], d = [w * 0.85, y1, 0.42], e = [-w * 0.85, y1, 0.42]; g.quad(a, b, d, e, c, [0, 2, -5]); g.quad(a, b, d, e, shade(c, 0.9), [0, 2, 5]); };
    sail(1.4, 2.9, 1.3); sail(3.1, 4.1, 0.9);
    g.put(P.box(0.5, 0.3, 0.04, hex('#d94f3d')), 0.25, 4.3, 0.3);
    return g;
  }
  function planeGeo() {
    const g = new Geo(), w = [0.96, 0.96, 0.97], red = hex('#d0312d');
    g.put(P.cyl(0.45, 0.45, 3.6, 6, w), 0, 0, -1.8, 0, 1, Math.PI / 2);
    g.put(P.cone(0.45, 0.8, 6, red), 0, 0, 1.8, 0, 1, Math.PI / 2); g.put(P.cone(0.45, 1.1, 6, w), 0, 0, -1.8, 0, 1, -Math.PI / 2);
    g.put(P.box(5.4, 0.1, 1.0, w, shade(w, 0.95)), 0, -0.1, 0.3); g.put(P.box(0.5, 0.11, 1.02, red), 2.45, -0.1, 0.3); g.put(P.box(0.5, 0.11, 1.02, red), -2.45, -0.1, 0.3);
    g.put(P.box(1.9, 0.08, 0.55, w), 0, 0.05, -2.5); g.put(P.box(0.09, 0.9, 0.7, red), 0, 0.1, -2.5);
    g.put(P.box(1.5, 0.12, 0.06, DARK), 0, -0.06, 2.62); g.put(P.box(0.5, 0.3, 0.9, hex('#6fb7e6')), 0, 0.32, 0.7);
    [-0.6, 0.6].forEach(x => { g.put(P.box(0.08, 0.5, 0.08, DARK), x, -0.6, 0.5); g.put(P.box(0.14, 0.3, 0.3, DARK), x, -0.75, 0.5); });
    const o = new Geo(); o.put(g, 0, 0.75, 0); return o;
  }
  const SKIN = ['#f2c9a0', '#d9a273', '#a8703f'], HAIR = ['#2b2118', '#6b4423', '#c9a04a', '#b8b8b8'], SHIRT = ['#d94f3d', '#3d7fd9', '#3fa66a', '#e0b030', '#8d5fd3'];
  function human(c, o) {
    o = o || {}; const g = new Geo(), pants = hex(o.pants || '#3b4a5a'), sk = hex(c.skin), sh = hex(c.shirt), hr = hex(c.hair);
    g.put(P.box(0.2, 0.55, 0.22, pants), -0.13, 0, 0); g.put(P.box(0.2, 0.55, 0.22, pants), 0.13, 0, 0);
    g.put(P.box(0.56, 0.62, 0.32, sh), 0, 0.55, 0);
    [-0.36, 0.36].forEach(x => { g.put(P.box(0.15, 0.45, 0.18, sh), x, 0.7, 0); g.put(P.box(0.14, 0.14, 0.16, sk), x, 0.56, 0); });
    g.put(P.box(0.4, 0.4, 0.4, sk), 0, 1.19, 0);
    g.put(P.box(0.44, 0.14, 0.44, hr), 0, 1.55, 0); g.put(P.box(0.44, 0.3, 0.1, hr), 0, 1.27, -0.2);
    g.put(P.box(0.06, 0.07, 0.02, [0.1, 0.1, 0.12]), -0.1, 1.38, 0.2); g.put(P.box(0.06, 0.07, 0.02, [0.1, 0.1, 0.12]), 0.1, 1.38, 0.2);
    if (o.vest) g.put(P.box(0.6, 0.45, 0.36, hex('#7a5230')), 0, 0.7, 0);
    if (o.hat) { g.put(P.cyl(0.42, 0.4, 0.04, 8, hex('#d9c27a')), 0, 1.68, 0); g.put(P.cone(0.26, 0.2, 8, hex('#c9b068')), 0, 1.72, 0); }
    if (o.pack) g.put(P.box(0.36, 0.42, 0.16, hex('#5a6b3a')), 0, 0.68, -0.25);
    const w = o.weapon || 0;
    if (w === 1) { g.put(P.box(0.05, 1.9, 0.05, WOOD), 0.5, 0.1, 0.12); g.put(P.cone(0.09, 0.3, 4, STONE), 0.5, 2.0, 0.12); }
    else if (w === 2) { [[0.25, 0.3], [0.62, 0], [0.99, -0.3]].forEach(a => g.put(P.box(0.05, 0.42, 0.05, WOOD), 0.52 + Math.abs(a[1]) * -0.2, a[0], 0.14, 0, 1, a[1])); g.put(P.box(0.015, 1.0, 0.015, [0.9, 0.9, 0.85]), 0.5, 0.33, 0.06); }
    else if (w === 3) { g.put(P.box(0.08, 0.08, 0.7, WOOD2), 0.5, 0.75, 0.05); g.put(P.box(0.7, 0.05, 0.06, hex('#555c63')), 0.5, 0.78, 0.6); }
    else if (w >= 4) { g.put(P.box(0.06, 0.95, 0.07, hex('#2f3338')), 0.12, 0.55, -0.36, 0, 1, 0, 0.5); g.put(P.box(0.09, 0.4, 0.11, WOOD2), -0.12, 0.42, -0.36, 0, 1, 0, 0.5); }
    if (o.tool === 'odun') { g.put(P.box(0.05, 0.8, 0.05, WOOD), -0.48, 0.5, 0.1); g.put(P.box(0.06, 0.2, 0.26, STONE), -0.48, 1.2, 0.18); }
    if (o.tool === 'tas') { g.put(P.box(0.05, 0.8, 0.05, WOOD), -0.48, 0.5, 0.1); g.put(P.box(0.5, 0.08, 0.08, STONE), -0.48, 1.28, 0.1); }
    if (o.tool === 'balik') { g.put(P.box(0.03, 0.03, 1.9, WOOD2), -0.44, 0.8, 0.9, 0, 1, -0.5); }
    if (o.tool === 'nobet') { g.put(P.box(0.05, 1.9, 0.05, WOOD), -0.5, 0.1, 0.12); g.put(P.cone(0.09, 0.3, 4, STONE), -0.5, 2.0, 0.12); }
    return g;
  }
  function wolfGeo(lv) {
    const g = new Geo(), c = hex('#8a8f98'), dk = hex('#5d626b'), lt = hex('#d5d8de');
    g.put(P.box(0.36, 0.36, 0.95, c, dk), 0, 0.34, -0.1); g.put(P.box(0.42, 0.42, 0.42, c, dk), 0, 0.36, 0.3);
    g.put(P.box(0.32, 0.3, 0.32, c, dk), 0, 0.68, 0.52); g.put(P.box(0.16, 0.14, 0.24, lt), 0, 0.7, 0.8); g.put(P.box(0.07, 0.06, 0.05, [0.08, 0.08, 0.1]), 0, 0.78, 0.92);
    g.put(P.cone(0.07, 0.17, 4, dk), -0.1, 0.97, 0.5); g.put(P.cone(0.07, 0.17, 4, dk), 0.1, 0.97, 0.5);
    g.put(P.box(0.04, 0.04, 0.02, hex('#ffd34a')), -0.09, 0.86, 0.69); g.put(P.box(0.04, 0.04, 0.02, hex('#ffd34a')), 0.09, 0.86, 0.69);
    [[-0.13, 0.36], [0.13, 0.36], [-0.13, -0.42], [0.13, -0.42]].forEach(p => g.put(P.box(0.1, 0.36, 0.1, dk), p[0], 0, p[1]));
    g.put(P.box(0.11, 0.11, 0.5, dk), 0, 0.52, -0.62, 0, 1, 0.5);
    if (lv >= 3) g.put(P.box(0.36, 0.09, 0.36, hex('#d0312d')), 0, 0.62, 0.42);
    return g;
  }
  function setMesh(n, geo) { eng.free(n.mesh); n.mesh = eng.mesh(geo); }
  const ring = (a, R) => { const x = Math.cos(a) * R, z = Math.sin(a) * R; return [x, H(x, z), z]; };
  function refresh() {
    if (il.ci < 0) return;
    const s = G.s, lv = s.lv, g = new Geo();
    if (lv.barinak > 0) g.put(shelter(lv.barinak), -3.4, CAMP_Y, -2.4, Math.atan2(3.4, 2.4));
    if (lv.savunma >= 1) [1.3, 2.9, 4.6, 5.9].forEach(a => { const p = ring(a, 6.9); for (let k = 0; k < 4; k++) g.put(P.cone(0.09, 0.55, 4, WOOD2), p[0] + (k % 2) * 0.3 - 0.15, p[1], p[2] + (k > 1 ? 0.3 : 0) - 0.15, 0, 1, (k - 1.5) * 0.2); });
    if (lv.savunma >= 2) for (let i = 0; i < 30; i++) {
      const a = i / 30 * TAU, am = a + TAU / 60, gate = Math.abs(((am - SHORE + Math.PI) % TAU + TAU) % TAU - Math.PI) < 0.22;
      const p = ring(a, 6.2), m = ring(am, 6.2);
      if (lv.savunma >= 4) { if (!gate) { g.put(P.box(1.34, 1.15, 0.45, shade(STONE, 0.85 + (i % 3) * 0.07)), m[0], m[1] - 0.1, m[2], -am - Math.PI / 2); g.put(P.box(0.4, 0.3, 0.45, STONE), m[0], m[1] + 1.05, m[2], -am - Math.PI / 2); } }
      else { g.put(P.box(0.15, 1.0, 0.15, WOOD2), p[0], p[1] - 0.1, p[2]); if (!gate) { g.put(P.box(1.3, 0.09, 0.06, WOOD), m[0], m[1] + 0.3, m[2], -am - Math.PI / 2); g.put(P.box(1.3, 0.09, 0.06, WOOD), m[0], m[1] + 0.65, m[2], -am - Math.PI / 2); } }
    }
    if (lv.savunma >= 3) {
      const x = 4.9, z = -3.3, y = H(x, z);
      [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(p => g.put(P.box(0.16, 3.2, 0.16, WOOD2), x + p[0], y, z + p[1]));
      g.put(P.box(1.7, 0.14, 1.7, WOOD), x, y + 3.2, z); g.put(P.box(1.7, 0.5, 0.08, WOOD2), x, y + 3.3, z + 0.82); g.put(P.box(1.7, 0.5, 0.08, WOOD2), x, y + 3.3, z - 0.82);
      g.put(P.cone(1.5, 0.9, 4, hex('#7a4a28'), Math.PI / 4), x, y + 4.5, z);
      [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]].forEach(p => g.put(P.box(0.1, 1.2, 0.1, WOOD2), x + p[0], y + 3.3, z + p[1]));
    }
    if (s.special[il.ci] && il.ci > 0) g.put(special(il.ci), 3.6, CAMP_Y, 3.2, Math.atan2(-3.6, -3.2));
    if (lv.deniz >= 3) { const p = ring(2.3, 12.2); g.put(planeGeo(), p[0], p[1] + 0.1, p[2], 2.3 + 2.2); }
    setMesh(il.camp, g);
    setMesh(il.raft, lv.deniz >= 1 ? raftGeo() : new Geo());
    setMesh(il.ship, lv.deniz >= 2 ? shipGeo() : new Geo());
    const L = s.look;
    setMesh(il.player, human({ skin: SKIN[L.skin], hair: HAIR[L.hair], shirt: SHIRT[L.shirt] }, { weapon: lv.silah, vest: lv.silah >= 2, hat: lv.barinak >= 3, pack: lv.deniz >= 1 }));
    il.cast.forEach((n, i) => {
      const c = s.cast[i]; n.visible = !!c; if (!c) return;
      setMesh(n, human({ skin: SKIN[(i + 1) % 3], hair: HAIR[(i * 3 + 1) % 4], shirt: SHIRT[(i + L.shirt + 1) % 5] }, { pants: '#5a4a3a', tool: c.job }));
      let p, ry = 0;
      if (c.job === 'odun' && il.treeSpots.length) { const t = il.treeSpots[i % il.treeSpots.length]; p = [t[0] * 0.9, 0, t[1] * 0.9]; ry = Math.atan2(t[0], t[1]); }
      else if (c.job === 'tas' && il.rockSpots.length) { const t = il.rockSpots[i % il.rockSpots.length]; p = [t[0] * 0.9, 0, t[1] * 0.9]; ry = Math.atan2(t[0], t[1]); }
      else if (c.job === 'balik') { const a = 1.4 + i * 0.5; p = [Math.cos(a) * 12.9, 0, Math.sin(a) * 12.9]; ry = Math.atan2(p[0], p[2]); }
      else { const a = SHORE + (i % 2 ? 0.5 : -0.5) + i * 0.9; p = [Math.cos(a) * 5.4, 0, Math.sin(a) * 5.4]; ry = Math.atan2(p[0], p[2]); }
      p[1] = H(p[0], p[2]); n.pos = p; n.rot = [0, ry, 0]; n.job = c.job;
    });
    setMesh(il.wolf, wolfGeo(G.wolfLv()));
  }

  function frameIsland(dt) {
    const s = G.s, th = il.th;
    // gece/gündüz (5 dakikalık döngü)
    const ph = dbgPh != null ? dbgPh : (Date.now() / 1000 % 300) / 300 * TAU, sh = Math.sin(ph);
    let day = smooth(-0.18, 0.28, sh); if (forceNight) day = 0; if (closeup) day = 1;
    il.dayF = day;
    const dusk = forceNight || closeup ? 0 : clamp(1 - Math.abs(sh) / 0.3, 0, 1) * 0.55;
    let sky = mix([0.03, 0.05, 0.13], th.sky, day); sky = mix(sky, [0.96, 0.56, 0.36], dusk * (0.4 + 0.6 * day));
    sc.sky = sky; sc.fogC = sky; sc.fog = [34, 96];
    const sp = [Math.cos(ph) * 70, sh * 60, -38], mp = [-sp[0], -sp[1], 38];
    il.sun.pos = sp; il.moon.pos = forceNight ? [-30, 46, -50] : mp;
    sc.L = V.norm(day > 0.15 ? sp : il.moon.pos);
    sc.LC = mix([0.2, 0.25, 0.42], [1.0, 0.95, 0.84], day); sc.amb = mix([0.2, 0.23, 0.36], [0.56, 0.58, 0.62], day);
    stars.visible = day < 0.6; const st = (1 - day / 0.6) * 0.9; stars.tint = [st, st, st]; stars.rot = [0, T * 0.003, 0];
    il.water.pos = [0, Math.sin(T * 0.9) * 0.06 - 0.02, 0];
    const fl = 1 + Math.sin(T * 13) * 0.12 + Math.sin(T * 7.3) * 0.1; il.flame.scale = [fl, 1 + Math.sin(T * 9) * 0.22, fl]; il.flame.rot = [0, T * 2, 0];
    const gw = (1 - day) * (0.55 + Math.sin(T * 11) * 0.08); il.glow.tint = [gw, gw, gw]; il.glow.visible = gw > 0.02;
    // tekneler
    const rp = [Math.cos(SHORE) * 15.6, 0.02 + Math.sin(T * 1.3) * 0.07, Math.sin(SHORE) * 15.6]; il.raft.pos = rp; il.raft.rot = [Math.sin(T * 1.1) * 0.04, SHORE + 1, Math.sin(T * 0.9) * 0.05];
    il.ship.pos = [Math.cos(1.0) * 21, 0.1 + Math.sin(T * 0.8) * 0.1, Math.sin(1.0) * 21]; il.ship.rot = [Math.sin(T * 0.7) * 0.03, 2.4, Math.sin(T * 0.6) * 0.04];
    // oyuncu
    const p = il.pl, weak = s.today.junk > 0 || s.bars.tokluk < 15, night = day < 0.3;
    const dx = p.tx - p.x, dz = p.tz - p.z, dd = Math.hypot(dx, dz); let moving = false;
    if (closeup) { p.ry += (0.5 - p.ry) * 0.1; }
    else if (dd > 0.08) { const sp2 = (weak ? 0.6 : 1.3) * dt; p.x += dx / dd * Math.min(sp2, dd); p.z += dz / dd * Math.min(sp2, dd); p.ry = Math.atan2(dx, dz); moving = true; }
    else if ((p.wait -= dt) < 0) {
      p.wait = 3 + Math.random() * 5;
      if (night) { p.tx = 1.3; p.tz = 0.9; } else { const a = Math.random() * TAU, q = 1.6 + Math.random() * 2.8; p.tx = Math.cos(a) * q; p.tz = Math.sin(a) * q; if (Math.hypot(p.tx + 3.4, p.tz + 2.4) < 2.6) { p.tx = 1.5; p.tz = 1.5; } }
    } else if (night) p.ry = Math.atan2(-p.x, -p.z);
    il.player.pos = [p.x, CAMP_Y + (moving ? Math.abs(Math.sin(T * 9)) * 0.09 : 0), p.z];
    il.player.rot = [weak ? 0.14 : 0, p.ry, 0]; il.player.scale = [1, 1 + Math.sin(T * 2) * 0.012, 1]; il.player.gray = weak ? 0.45 : 0;
    il.cast.forEach((n, i) => { if (!n.visible) return; const w = n.job === 'nobet' ? 0 : n.job === 'balik' ? Math.sin(T * 1.2 + i) * 0.05 : Math.max(0, Math.sin(T * 5 + i * 2)) * 0.35; n.rot[0] = w; });
    // kurt
    const wl = G.wolfLv(); let tg, sit = false;
    if (wl === 0) { tg = il.wolfRock; sit = true; } else if (wl === 1) { const q = ring(4.0, 8.2); tg = q; } else if (wl === 2) { tg = [-1.9, CAMP_Y, 1.6]; }
    else tg = [p.x - Math.sin(p.ry + 0.9) * 1.0, CAMP_Y, p.z - Math.cos(p.ry + 0.9) * 1.0];
    if (!il.wf) il.wf = { x: tg[0], y: tg[1], z: tg[2], ry: 0, howl: 0, next: 20 + Math.random() * 30 };
    const w = il.wf, wx = tg[0] - w.x, wz = tg[2] - w.z, wd = Math.hypot(wx, wz); let wm = false;
    if (wd > 0.25) { const v = Math.min(wd, (wd > 3 ? 3 : 1.5) * dt); w.x += wx / wd * v; w.z += wz / wd * v; w.ry = Math.atan2(wx, wz); wm = true; w.y = sit && wd < 1.2 ? tg[1] : H(w.x, w.z); }
    else { w.y = tg[1]; if (wl < 3) w.ry = Math.atan2(-w.x, -w.z); else w.ry += (p.ry - w.ry) * 0.05; }
    if (w.howl > 0) w.howl -= dt; else if (night && (w.next -= dt) < 0) { w.next = 45 + Math.random() * 50; w.howl = 2.6; if (!forceNight) Snd.howl(0.05); }
    il.wolf.pos = [w.x, w.y + (wm ? Math.abs(Math.sin(T * 11)) * 0.07 : 0), w.z];
    il.wolf.rot = [w.howl > 0 ? -0.55 * Math.min(1, w.howl, 2.6 - w.howl + 0.2) * 1.2 : (sit && !wm ? -0.12 : 0), w.ry, 0];
    // kamera
    if (closeup) { cam.target = [p.x, CAMP_Y - 0.2, p.z]; cam.eye = [p.x + 3.4, CAMP_Y + 1.6, p.z + 6.5]; cam.fov = 40 * D; }
    else { cam.target = [0, 1.2, 0]; cam.eye = [Math.cos(il.pitch) * Math.sin(il.yaw) * il.dist, 1.2 + Math.sin(il.pitch) * il.dist, Math.cos(il.pitch) * Math.cos(il.yaw) * il.dist]; cam.fov = 48 * D; }
    cam.near = 0.3; eng.setCam(cam); eng.render(il.nodes, sc);
  }

  /* ================= döngü & kontroller ================= */
  function loop(now) {
    requestAnimationFrame(loop);
    if (!running || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; T += dt;
    eng.resize();
    if (mode === 'globe') frameGlobe(); else frameIsland(dt);
  }
  function controls() {
    const pts = new Map(); let tap = null, p0 = 0, d0 = 0;
    const pd = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    cv.addEventListener('pointerdown', e => {
      try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) tap = { x: e.clientX, y: e.clientY, t: performance.now(), mv: 0 };
      else if (pts.size === 2) { tap = null; p0 = pd(); d0 = mode === 'globe' ? gb.dist : il.dist; }
    });
    cv.addEventListener('pointermove', e => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) {
        if (tap) tap.mv += Math.abs(dx) + Math.abs(dy);
        if (mode === 'globe') { const k = 0.0009 * (gb.dist - 0.85); gb.yaw -= dx * k; gb.pitch = clamp(gb.pitch + dy * k, -1.35, 1.35); }
        else if (!closeup) { il.yaw -= dx * 0.008; il.pitch = clamp(il.pitch + dy * 0.005, 0.18, 1.1); }
      } else if (pts.size === 2 && p0 > 0) {
        const r = p0 / Math.max(10, pd());
        if (mode === 'globe') { gb.dist = clamp(d0 * r, 1.7, 10); checkDescend(); } else il.dist = clamp(d0 * r, 12, 40);
      }
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (tap && pts.size === 0 && tap.mv < 10 && performance.now() - tap.t < 450 && mode === 'globe') globeTap(e.clientX, e.clientY);
      if (pts.size === 0) tap = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => {
      e.preventDefault(); const k = Math.exp(e.deltaY * 0.0012);
      if (mode === 'globe') { gb.dist = clamp(gb.dist * k, 1.7, 10); checkDescend(); } else il.dist = clamp(il.dist * k, 12, 40);
    }, { passive: false });
  }

  return {
    init(canvas, labels) {
      cv = canvas; labelsEl = labels; eng = new Engine(cv); eng.resize();
      const sg = new Geo(), r = rng(5);
      for (let i = 0; i < 260; i++) {
        const d = V.norm([r() - 0.5, r() - 0.5, r() - 0.5]), t1 = V.norm(V.cross(d, [0.3, 1, 0.2])), t2 = V.cross(d, t1), c = V.mul(d, 180), z = 0.25 + r() * 0.45, b = 0.5 + r() * 0.5;
        sg.tri(V.add(c, V.mul(t1, z)), V.add(c, V.add(V.mul(t1, -z * 0.5), V.mul(t2, z * 0.87))), V.add(c, V.add(V.mul(t1, -z * 0.5), V.mul(t2, -z * 0.87))), [b, b, b * (0.85 + r() * 0.3)]);
      }
      stars = eng.node(sg, { add: true, emis: 1, nofog: true });
      for (let i = 0; i < 7; i++) { const el = document.createElement('div'); el.dataset.act = 'cont'; el.dataset.v = i; labelsEl.appendChild(el); gb.labels.push(el); }
      controls();
      buildGlobe(); buildIsland(G.s.cur);
      requestAnimationFrame(loop);
    },
    on(k, f) { cb[k] = f; },
    setMode(m) {
      mode = m; labelsEl.style.display = m === 'globe' ? 'block' : 'none';
      if (m === 'globe') { buildGlobe(); faceContinent(G.s.cur); eng.resize(); gb.dist = clamp(1.45 / (Math.tan(21 * D) * Math.min(1, eng.w / eng.h)), 3.2, 9); gb.armed = true; }
      else if (il.ci !== G.s.cur) buildIsland(G.s.cur); else refresh();
    },
    mode: () => mode,
    refresh() { if (mode === 'globe') buildGlobe(); else if (il.ci !== G.s.cur) buildIsland(G.s.cur); else refresh(); },
    isNight: () => mode === 'island' && il.dayF < 0.3,
    forceNight(v) { forceNight = v; },
    closeup(v) { closeup = v; },
    debug(v) { dbgPh = v; },
    look: { SKIN, HAIR, SHIRT }
  };
})();
