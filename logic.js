/* My Goals — oyun mantığı: durum, hedefler, gün kapanışı, olaylar, yükseltmeler */
const G = (function () {
  'use strict';
  const KEY = 'mygoals_save_v1';
  const DAY_H = 3; // oyun günü 03:00'te kapanır

  const GOALS = [
    { id: 'spor', name: 'Spor', icon: '🏃', unit: 'dk', min: 30, steps: [5, 10, 30], feeds: 'Güç' },
    { id: 'beslenme', name: 'Beslenme', icon: '🥗', unit: 'öğün', min: 3, steps: [1], feeds: 'Tokluk' },
    { id: 'kitap', name: 'Kitap', icon: '📖', unit: 'dk', min: 20, steps: [5, 10, 20], feeds: 'Dinlenme' },
    { id: 'ingilizce', name: 'İngilizce', icon: '🇬🇧', unit: 'dk', min: 30, steps: [5, 10, 30], feeds: 'İngilizce dalı' },
    { id: 'aof', name: 'AÖF', icon: '🎓', unit: 'dk', min: 30, steps: [5, 10, 30], feeds: 'AÖF dalı' },
    { id: 'siber', name: 'Siber güvenlik', icon: '🛡️', unit: 'dk', min: 20, steps: [5, 10, 20], feeds: 'Siber dalı' }
  ];
  const RES = {
    odun: ['Odun', '🪵'], tas: ['Taş', '🪨'], yiyecek: ['Yiyecek', '🍖'],
    sertagac: ['Sert ağaç', '🌳'], demir: ['Demir', '🔩'], mermer: ['Mermer', '🏛️'], kristal: ['Kristal', '💎'], kurk: ['Kürk', '🧶'], yildiz: ['Yıldız tozu', '✨'],
    ing: ['İngilizce', '🇬🇧'], aof: ['AÖF', '🎓'], siber: ['Siber', '🛡️'],
    guc: ['Güç', '💪'], tokluk: ['Tokluk', '❤️'], dinlenme: ['Dinlenme', '🌙']
  };
  const TRACKS = {
    barinak: { name: 'Barınak', icon: '🏠', levels: [
      { name: 'Çadır', icon: '⛺', cost: { aof: 30, guc: 10, odun: 20 } },
      { name: 'Baraka', icon: '🛖', cost: { aof: 90, guc: 20, odun: 60, tas: 30 } },
      { name: 'Ev', icon: '🏠', cost: { aof: 200, guc: 30, odun: 140, tas: 100 } },
      { name: 'Taş Ev', icon: '🏡', cost: { aof: 400, guc: 40, odun: 200, tas: 250, sertagac: 30 } },
      { name: 'Konak', icon: '🏰', cost: { aof: 700, guc: 50, odun: 400, tas: 400, mermer: 40 } }],
      desc: 'Her seviye bir kazazedeye yer açar.' },
    silah: { name: 'Silah', icon: '🏹', levels: [
      { name: 'Mızrak', icon: '🔱', cost: { siber: 20, guc: 15, odun: 10 } },
      { name: 'Yay', icon: '🏹', cost: { siber: 80, guc: 25, odun: 40 } },
      { name: 'Arbalet', icon: '🎯', cost: { siber: 180, guc: 35, odun: 80, demir: 20 } },
      { name: 'Tüfek', icon: '🔫', cost: { siber: 350, guc: 45, demir: 60, kristal: 20 } }],
      desc: 'Avlanmayı açar; her seviye av verimini artırır.' },
    savunma: { name: 'Savunma', icon: '🛡️', levels: [
      { name: 'Tuzak', icon: '🪤', cost: { siber: 30, odun: 20 } },
      { name: 'Çit', icon: '🚧', cost: { siber: 100, odun: 80 } },
      { name: 'Gözcü Kulesi', icon: '🗼', cost: { siber: 220, odun: 150, tas: 100 } },
      { name: 'Taş Sur', icon: '🧱', cost: { siber: 400, tas: 300, demir: 40 } }],
      desc: 'Saldırı ve yağma kayıplarını azaltır.' },
    deniz: { name: 'Deniz yolu', icon: '⛵', levels: [
      { name: 'Sal', icon: '🛶', cost: { ing: 100, aof: 20, odun: 80 } },
      { name: 'Gemi', icon: '⛵', cost: { ing: 400, aof: 100, odun: 300, tas: 50, sertagac: 40 } },
      { name: 'Uçak', icon: '✈️', cost: { ing: 1000, aof: 300, demir: 100, kristal: 40, kurk: 20 } }],
      desc: 'Yeni kıtalara geçmek için gerekli taşıt.' }
  };
  const VEH = ['', 'Sal', 'Gemi', 'Uçak'];
  const CONT = [
    { name: 'Başlangıç Adası', icon: '🏝️', veh: 0, ms: null },
    { name: 'Orman Kıtası', icon: '🌲', veh: 1, ms: "İngilizce B1'i bitirdim", res: 'sertagac', b: { name: 'Marangozhane', icon: '🪚', desc: 'Odun toplama +%50', cost: { sertagac: 40, odun: 100 } } },
    { name: 'Dağ Kıtası', icon: '⛰️', veh: 1, ms: 'Hedef kiloma ulaştım', weight: true, res: 'demir', b: { name: 'Demirci Ocağı', icon: '⚒️', desc: 'Av verimi +%50', cost: { demir: 40, tas: 150 } } },
    { name: 'Antik Kıta', icon: '🏛️', veh: 2, ms: "AÖF'de bir dönemi geçtim", res: 'mermer', b: { name: 'Kütüphane', icon: '📚', desc: 'Eğitim puanı +%10', cost: { mermer: 50, odun: 200 } } },
    { name: 'Çöl Kıtası', icon: '🏜️', veh: 2, ms: 'Siber güvenlikte bir sertifika/kurs bitirdim', res: 'kristal', b: { name: 'Sarnıç', icon: '⛲', desc: 'Gece tokluk kaybı yarıya iner', cost: { kristal: 40, tas: 200 } } },
    { name: 'Buzul Kıtası', icon: '❄️', veh: 2, ms: 'PTE Academic sınavına girdim', res: 'kurk', b: { name: 'Sıcak Kulübe', icon: '🛖', desc: 'Gece dinlenme kaybı yarıya iner', cost: { kurk: 40, odun: 250 } } },
    { name: 'Gökyüzü Kıtası', icon: '✈️', veh: 3, ms: 'THY kadet pilot başvurusunu yaptım', res: 'yildiz', b: { name: 'Rasathane', icon: '🔭', desc: 'Tüm kazanımlar +%10', cost: { yildiz: 50, mermer: 50 } } }
  ];
  const JOBS = { odun: ['Odun', '🪓'], tas: ['Taş', '⛏️'], balik: ['Balık', '🎣'], nobet: ['Nöbet', '👁️'] };
  const NAMES = ['Ali', 'Zeynep', 'Deniz', 'Mert', 'Elif', 'Baran', 'Ece', 'Kaan'];
  const WOLF = [
    { at: 0, name: 'Vahşi', desc: 'Uzakta, kayalıkta duruyor.' },
    { at: 10, name: 'Meraklı', desc: 'Kampa yaklaşmaya başladı.' },
    { at: 25, name: 'Yakın', desc: 'Ateşin yanına kadar geliyor.' },
    { at: 45, name: 'Dost', desc: 'Sana eşlik ediyor. Toplama +%10.' },
    { at: 70, name: 'Yoldaş', desc: 'Avda yardım ediyor. Av +%50.' }];

  const pad = n => (n < 10 ? '0' : '') + n;
  const fmtD = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dayId = ts => fmtD(new Date(ts - DAY_H * 3600e3));
  const toDate = id => { const a = id.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2], 12); };
  const nextDay = id => { const d = toDate(id); d.setDate(d.getDate() + 1); return fmtD(d); };
  const weekId = id => { const d = toDate(id); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return fmtD(d); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const newToday = () => ({ spor: 0, beslenme: 0, kitap: 0, ingilizce: 0, aof: 0, siber: 0, junk: 0, jok: {}, done: {}, perfect: false, log: [], fed: 0 });
  function fresh() {
    const d = dayId(Date.now());
    return {
      v: 1, setup: false, look: { skin: 0, hair: 0, shirt: 0 }, firstDay: d, day: d, today: newToday(),
      bars: { tokluk: 60, guc: 30, dinlenme: 60 }, edu: { ing: 0, aof: 0, siber: 0 },
      res: { odun: 10, tas: 5, yiyecek: 6, sertagac: 0, demir: 0, mermer: 0, kristal: 0, kurk: 0, yildiz: 0 },
      lv: { barinak: 0, silah: 0, savunma: 0, deniz: 0 }, maxLv: { barinak: 0, silah: 0, savunma: 0, deniz: 0 },
      special: [false, false, false, false, false, false, false],
      streak: 0, best: 0, jok: 4, jokWeek: weekId(d), wolf: 0, cast: [],
      unlocked: [true, false, false, false, false, false, false], ms: [true, false, false, false, false, false, false], cur: 0,
      weight: { target: null, log: [] }, slow: false, reports: [], unseen: false, hist: {}, set: { music: true, sfx: true }
    };
  }
  function merge(base, o) {
    for (const k in o) {
      if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], o[k]);
      else base[k] = o[k];
    }
    return base;
  }
  let s = fresh();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) s = merge(fresh(), JSON.parse(raw)); } catch (e) { s = fresh(); }
    api.s = s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }

  const have = k => k in s.edu ? s.edu[k] : k in s.bars ? s.bars[k] : (s.res[k] || 0);
  function give(d, k, v) { // d: gerçekte uygulanan fark kaydı
    v = Math.round(v); if (!v) return;
    let before;
    if (k in s.bars) { before = s.bars[k]; s.bars[k] = clamp(before + v, 0, 100); v = s.bars[k] - before; }
    else if (k in s.edu) { before = s.edu[k]; s.edu[k] = Math.max(0, before + v); v = s.edu[k] - before; }
    else { before = s.res[k] || 0; s.res[k] = Math.max(0, before + v); v = s.res[k] - before; }
    if (v) d[k] = (d[k] || 0) + v;
  }
  const wolfLv = () => { let l = 0; WOLF.forEach((w, i) => { if (s.wolf >= w.at) l = i; }); return l; };
  function mult(edu) {
    let m = (s.slow ? 0.5 : 1) * (s.bars.dinlenme >= 80 ? 1.1 : 1) * (s.special[6] ? 1.1 : 1);
    if (edu && s.special[3]) m *= 1.1;
    return m;
  }
  const gainsOf = d => Object.keys(d).map(k => ({ k, v: d[k] }));

  /* ---- günlük giriş ---- */
  function addEntry(id, amt) {
    const g = GOALS.find(x => x.id === id), t = s.today, d = {};
    const r = { reached: false, perfect: false };
    if (id === 'spor') {
      const v = Math.round(amt * mult()), room = 100 - s.bars.guc;
      give(d, 'guc', Math.min(v, room)); if (v > room) give(d, 'odun', v - room); // taşan güç oduna döner
    } else if (id === 'beslenme') { give(d, 'tokluk', 15 * amt); give(d, 'yiyecek', 2 * amt); }
    else if (id === 'kitap') give(d, 'dinlenme', 2 * amt * mult());
    else give(d, id === 'ingilizce' ? 'ing' : id, amt * mult(true));
    t[id] += amt;
    if (!t.done[id] && t[id] >= g.min) { t.done[id] = true; r.reached = true; give(d, 'odun', 5); give(d, 'tas', 5); }
    if (!t.perfect && GOALS.every(x => t.done[x.id])) { t.perfect = true; r.perfect = true; give(d, 'odun', 10); give(d, 'tas', 10); give(d, 'yiyecek', 5); }
    t.log.push({ id, amt, d, reached: r.reached, perfect: r.perfect });
    if (t.log.length > 60) t.log.shift();
    save(); r.gains = gainsOf(d); return r;
  }
  function junk() {
    const d = {}; give(d, 'tokluk', -10); give(d, 'guc', -5);
    s.today.junk++; s.today.log.push({ junk: true, d }); save();
    return { gains: gainsOf(d) };
  }
  function undo() {
    const t = s.today, e = t.log.pop(); if (!e) return false;
    const x = {}; for (const k in e.d) give(x, k, -e.d[k]);
    if (e.junk) t.junk = Math.max(0, t.junk - 1);
    else {
      t[e.id] = Math.max(0, t[e.id] - e.amt);
      if (e.reached) t.done[e.id] = false;
      if (e.perfect) t.perfect = false;
    }
    save(); return true;
  }
  function toggleJoker(id) {
    const t = s.today;
    if (t.jok[id]) { delete t.jok[id]; s.jok++; save(); return 'off'; }
    if (s.jok < 1) return 'none';
    t.jok[id] = true; s.jok--; save(); return 'on';
  }

  /* ---- maliyet / yükseltme ---- */
  function costOf(tr) {
    const L = TRACKS[tr].levels[s.lv[tr]]; if (!L) return null;
    const repair = s.lv[tr] < s.maxLv[tr], c = {};
    for (const k in L.cost) c[k] = repair ? Math.ceil(L.cost[k] / 2) : L.cost[k];
    return { cost: c, repair, def: L };
  }
  const missing = c => Object.keys(c).filter(k => have(k) < c[k]).map(k => ({ k, need: Math.ceil(c[k] - have(k)) }));
  const ratio = c => { const ks = Object.keys(c); return ks.reduce((a, k) => a + Math.min(1, have(k) / c[k]), 0) / ks.length; };
  function pay(c) { const d = {}; for (const k in c) give(d, k, -c[k]); }
  function upgrade(tr) {
    const n = costOf(tr); if (!n || missing(n.cost).length) return false;
    pay(n.cost); s.lv[tr]++; s.maxLv[tr] = Math.max(s.maxLv[tr], s.lv[tr]); save(); return true;
  }
  function buildSpecial(ci) {
    const c = CONT[ci]; if (!c.b || s.special[ci] || !s.unlocked[ci] || missing(c.b.cost).length) return false;
    pay(c.b.cost); s.special[ci] = true; save(); return true;
  }
  function nextUp() { // en yakın yükseltme
    let best = null;
    Object.keys(TRACKS).forEach(tr => {
      const n = costOf(tr); if (!n) return;
      const r = ratio(n.cost);
      if (!best || r > best.r) best = { r, name: n.def.name, icon: n.def.icon, miss: missing(n.cost), repair: n.repair, tr };
    });
    return best;
  }

  /* ---- ada işleri ---- */
  function eff() {
    const t = s.bars.tokluk, tf = t >= 40 ? 1 : t >= 15 ? 0.75 : 0.5;
    return tf * Math.max(0.5, 1 - 0.1 * s.today.junk);
  }
  function workInfo(type) {
    const e = eff(), w = wolfLv();
    if (type === 'odun') return { cost: 10, k: 'odun', y: Math.round(10 * e * (s.special[1] ? 1.5 : 1) * (w >= 3 ? 1.1 : 1)) };
    if (type === 'tas') return { cost: 10, k: 'tas', y: Math.round(8 * e * (w >= 3 ? 1.1 : 1)) };
    if (type === 'av') return { cost: 15, k: 'yiyecek', y: Math.round((6 + 4 * s.lv.silah) * e * (s.special[2] ? 1.5 : 1) * (w >= 4 ? 1.5 : 1)), lock: s.lv.silah < 1 };
    if (type === 'yerel') { const k = CONT[s.cur].res; return k ? { cost: 12, k, y: Math.round(6 * e) } : null; }
    return null;
  }
  function work(type) {
    const w = workInfo(type); if (!w || w.lock || s.bars.guc < w.cost) return null;
    const d = {}; give(d, 'guc', -w.cost); give(d, w.k, w.y); save();
    return { gains: gainsOf(d) };
  }
  function feedWolf() {
    if (s.today.fed >= 2 || s.res.yiyecek < 5) return false;
    s.res.yiyecek -= 5; s.today.fed++; s.wolf = clamp(s.wolf + 1, 0, 100); save(); return true;
  }
  const capacity = () => Math.min(6, Math.max(0, s.lv.barinak - 1) + s.unlocked.filter(Boolean).length - 1);
  function setJob(i, job) { if (s.cast[i]) { s.cast[i].job = job; save(); } }

  /* ---- kıtalar ---- */
  function weightInfo() {
    const w = s.weight, lg = w.log;
    if (w.target == null || !lg.length) return { ok: false, pct: 0 };
    const st = lg[0].kg, cur = lg[lg.length - 1].kg, tg = w.target;
    const ok = st >= tg ? cur <= tg : cur >= tg;
    const pct = st === tg ? (ok ? 1 : 0) : clamp((st - cur) / (st - tg), 0, 1);
    return { ok, pct, st, cur, tg };
  }
  function logWeight(kg) {
    const lg = s.weight.log;
    if (lg.length && lg[lg.length - 1].d === s.day) lg[lg.length - 1].kg = kg; else lg.push({ d: s.day, kg });
    if (lg.length > 400) lg.splice(1, 1); // ilk kayıt (başlangıç) korunur
    save();
  }
  function setMs(ci, v) {
    if (v && CONT[ci].weight && !weightInfo().ok) return false;
    s.ms[ci] = v; save(); return true;
  }
  const vehOk = ci => s.lv.deniz >= CONT[ci].veh;
  function unlock(ci) {
    if (s.unlocked[ci] || !vehOk(ci) || !s.ms[ci]) return false;
    s.unlocked[ci] = true; s.cur = ci; save(); return true;
  }
  function travel(ci) { if (s.unlocked[ci]) { s.cur = ci; save(); return true; } return false; }

  /* ---- gün kapanışı ---- */
  function closeDay() {
    const t = s.today, rep = { day: s.day, ev: [], kept: 0, miss: 0, jok: 0 };
    const E = (i, title, d, k) => rep.ev.push({ i, t: title, d, k: k || 'bad' });
    const guards = s.cast.filter(c => c.job === 'nobet').length;
    const def = s.lv.savunma + guards;
    const lose = (k, pct) => { const v = Math.floor((s.res[k] || 0) * pct); s.res[k] -= v; return v; };
    const grace = s.day === s.firstDay; // ilk gün koruması
    let kitapMiss = false;
    GOALS.forEach(g => {
      if (t[g.id] >= g.min) { rep.kept++; return; }
      if (t.jok[g.id]) { rep.jok++; E('🃏', g.name + ': joker', 'Joker kullandın, olay çıkmadı.', 'ok'); return; }
      rep.miss++;
      if (grace) return;
      if (g.id === 'spor') {
        const v = lose('yiyecek', Math.max(0.05, 0.3 - 0.06 * def)); s.bars.guc = clamp(s.bars.guc - 15, 0, 100);
        E('🐗', 'Vahşi hayvan saldırısı!', 'Spor atlandı. Av kaçtı: −' + v + ' yiyecek, −15 güç.' + (def ? ' Savunman kaybı azalttı.' : ''));
      } else if (g.id === 'beslenme') {
        const v = lose('yiyecek', 0.4); s.bars.tokluk = clamp(s.bars.tokluk - 25, 0, 100);
        E('🦠', 'Yiyecekler çürüdü', 'Beslenme atlandı. −' + v + ' yiyecek, −25 tokluk.');
      } else if (g.id === 'kitap') {
        kitapMiss = true; s.bars.dinlenme = clamp(s.bars.dinlenme - 20, 0, 100);
        E('😵', 'Uykusuz gece', 'Kitap atlandı. Bugün kazanımların yarı yarıya, −20 dinlenme.');
      } else if (g.id === 'ingilizce') {
        if (s.lv.deniz > 0) { const n = TRACKS.deniz.levels[s.lv.deniz - 1].name; s.lv.deniz--; E('⛈️', 'Fırtına!', 'İngilizce atlandı. ' + n + ' hasar gördü, bir kademe düştü.', 'storm'); }
        else { const v = lose('odun', 0.2); E('⛈️', 'Fırtına!', 'İngilizce atlandı. Dalgalar −' + v + ' odun götürdü.', 'storm'); }
      } else if (g.id === 'aof') {
        if (s.lv.barinak > 0) { const n = TRACKS.barinak.levels[s.lv.barinak - 1].name; s.lv.barinak--; E('🏚️', 'Çatı çöktü', 'AÖF atlandı. ' + n + ' bir kademe geri düştü.'); }
        else { const v = lose('odun', 0.1); E('🏚️', 'Kamp dağıldı', 'AÖF atlandı. −' + v + ' odun.'); }
      } else if (g.id === 'siber') {
        if (s.lv.silah > 0 && Math.random() < 0.5) { const n = TRACKS.silah.levels[s.lv.silah - 1].name; s.lv.silah--; E('🗡️', 'Silah köreldi', 'Siber atlandı. ' + n + ' kullanılmaz hâle geldi, bir kademe düştü.'); }
        else if (s.lv.savunma > 0) { const n = TRACKS.savunma.levels[s.lv.savunma - 1].name; s.lv.savunma--; const a = lose('odun', 0.1), b = lose('tas', 0.1); E('🏴‍☠️', 'Yağmacılar sızdı', 'Siber atlandı. ' + n + ' yıkıldı; −' + a + ' odun, −' + b + ' taş.'); }
        else { const p = guards ? 0.2 : 0.3, a = lose('odun', p), b = lose('tas', p); E('🏴‍☠️', 'Yağmacılar sızdı', 'Siber atlandı. Kamp korumasızdı: −' + a + ' odun, −' + b + ' taş.'); }
      }
    });
    // seri
    if (rep.kept + rep.jok === GOALS.length) { s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
    rep.streak = s.streak;
    // kurt
    const wl0 = wolfLv();
    s.wolf = clamp(s.wolf + rep.kept + (rep.kept === GOALS.length ? 2 : 0) - rep.miss * 2, 0, 100);
    const wl1 = wolfLv();
    if (wl1 > wl0) E('🐺', 'Kurt yaklaştı', 'Evcilleşme seviyesi: ' + WOLF[wl1].name + '. ' + WOLF[wl1].desc, 'wolf');
    else if (wl1 < wl0) E('🐺', 'Kurt uzaklaştı', 'Hedefleri kaçırdın. Seviye: ' + WOLF[wl1].name + '.');
    // doğal kayıp
    s.bars.tokluk = clamp(s.bars.tokluk - (s.special[4] ? 15 : 30), 0, 100);
    s.bars.dinlenme = clamp(s.bars.dinlenme - (s.special[5] ? 15 : 30), 0, 100);
    s.bars.guc = clamp(s.bars.guc - (s.bars.tokluk === 0 ? 20 : 10), 0, 100);
    // kazazedeler
    const prod = {}; let hungry = 0;
    s.cast.forEach(c => {
      if (c.job === 'nobet') return;
      if (s.res.yiyecek < 1 && c.job !== 'balik') { hungry++; return; }
      if (c.job === 'balik') give(prod, 'yiyecek', 4);
      else { s.res.yiyecek -= 1; give(prod, c.job, c.job === 'odun' ? 6 : 5); }
    });
    const pk = Object.keys(prod);
    if (pk.length) E('👥', 'Kazazedeler çalıştı', pk.map(k => '+' + prod[k] + ' ' + RES[k][0].toLowerCase()).join(', ') + '.', 'ok');
    if (hungry) E('🍽️', 'Yiyecek yok', hungry + ' kazazede aç kaldığı için çalışamadı.');
    if (s.cast.length < capacity() && rep.kept >= 4) {
      const nm = NAMES.find(n => !s.cast.some(c => c.name === n)) || 'Yolcu';
      s.cast.push({ name: nm, job: 'odun' });
      E('🧍', 'Yeni kazazede!', nm + ' adaya ulaştı ve kampına katıldı. Kamp sekmesinden iş ver.', 'ok');
    }
    if (rep.kept === GOALS.length) E('🌟', 'Mükemmel gün', 'Altı hedefin de tamam. Seri: ' + s.streak + ' gün.', 'ok');
    s.hist[s.day] = { k: rep.kept, j: rep.jok };
    const hk = Object.keys(s.hist).sort(); while (hk.length > 120) delete s.hist[hk.shift()];
    // yeni gün
    s.day = nextDay(s.day); s.today = newToday(); s.slow = kitapMiss;
    const wk = weekId(s.day);
    if (wk !== s.jokWeek) {
      if (s.jok > 0) { const n = s.jok; s.res.odun += 15 * n; s.res.tas += 15 * n; s.res.yiyecek += 10 * n; E('🃏', 'Jokerler bonusa döndü', n + ' kullanılmamış joker: +' + 15 * n + ' odun, +' + 15 * n + ' taş, +' + 10 * n + ' yiyecek.', 'ok'); }
      s.jok = 4; s.jokWeek = wk; E('🃏', 'Yeni hafta', '4 yeni joker verildi.', 'ok');
    }
    return rep;
  }
  // geçen günleri hesapla; yeni rapor varsa true
  function rollover(now) {
    const cur = dayId(now || Date.now()); let n = 0;
    while (s.day < cur && n < 400) { const r = closeDay(); s.reports.push(r); n++; }
    if (n >= 400) s.day = cur;
    if (n) { while (s.reports.length > 5) s.reports.shift(); s.unseen = true; s.away = n; save(); }
    return n > 0;
  }

  const api = {
    GOALS, RES, TRACKS, CONT, JOBS, WOLF, VEH, s,
    load, save, have, mult, wolfLv, addEntry, junk, undo, toggleJoker, costOf, missing, ratio, upgrade, buildSpecial, nextUp,
    workInfo, work, feedWolf, capacity, setJob, weightInfo, logWeight, setMs, vehOk, unlock, travel, rollover, dayId, toDate,
    exportData: () => JSON.stringify(s),
    importData(txt) { const o = JSON.parse(txt); if (!o || typeof o !== 'object' || !o.day || !o.bars) throw new Error('bad'); s = merge(fresh(), o); api.s = s; save(); },
    reset() { s = fresh(); api.s = s; save(); }
  };
  return api;
})();
