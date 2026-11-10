/* My Goals — arayüz */
(function () {
  'use strict';
  const $ = q => document.querySelector(q), el = id => document.getElementById(id);
  const S = () => G.s, R = G.RES;
  let sheet = null, sheetArg = null, sel = null, armed = null, armT = 0, toastT = 0;

  /* ---------- HUD ---------- */
  function buildHud() {
    const bar = (id, ic) => '<div class="bar" id="bar-' + id + '"><i>' + ic + '</i><div class="track"><div class="fill"></div></div><b></b></div>';
    const edu = (id, t) => '<div class="bar edu" id="edu-' + id + '"><small>' + t + '</small><div class="track"><div class="fill"></div></div><b></b></div>';
    el('hud').innerHTML = '<div class="r1"><span class="chip" id="chip-streak"></span><span class="chip" id="chip-jok" data-act="open" data-v="entry"></span>' +
      '<span class="chip" id="res-odun"></span><span class="chip" id="res-tas"></span><span class="chip" id="res-yiyecek"></span><span class="chip" id="res-local"></span>' +
      '<button class="gear" data-act="open" data-v="settings">⚙️</button></div>' +
      '<div class="bars">' + bar('tokluk', '❤️') + bar('guc', '💪') + bar('dinlenme', '🌙') + edu('ing', 'İNG') + edu('aof', 'AÖF') + edu('siber', 'SİB') + '</div>';
  }
  function eduNeed(k) {
    const c = tr => { const n = G.costOf(tr); return n && n.cost[k] ? n.cost[k] : 0; };
    const a = k === 'ing' ? [c('deniz')] : k === 'aof' ? [c('barinak')] : [c('silah'), c('savunma')];
    const v = a.filter(Boolean); return v.length ? Math.min.apply(null, v) : 0;
  }
  function updateHud() {
    const s = S();
    el('chip-streak').textContent = '🔥 ' + s.streak;
    el('chip-jok').textContent = '🃏 ' + s.jok;
    ['odun', 'tas', 'yiyecek'].forEach(k => el('res-' + k).textContent = R[k][1] + ' ' + Math.floor(s.res[k]));
    const lr = G.CONT[s.cur].res; el('res-local').textContent = lr ? R[lr][1] + ' ' + Math.floor(s.res[lr]) : '';
    ['tokluk', 'guc', 'dinlenme'].forEach(k => {
      const b = el('bar-' + k), v = Math.round(s.bars[k]), f = b.querySelector('.fill');
      f.style.width = v + '%'; f.classList.toggle('low', v < 20); b.querySelector('b').textContent = v;
    });
    ['ing', 'aof', 'siber'].forEach(k => {
      const b = el('edu-' + k), v = Math.floor(s.edu[k]), need = eduNeed(k);
      b.querySelector('.fill').style.width = (need ? Math.min(100, v / need * 100) : 100) + '%';
      b.querySelector('b').textContent = need ? v + '/' + need : v;
    });
    const n = G.nextUp();
    el('next').innerHTML = !n ? '' : '<button data-act="open" data-v="tree" class="' + (n.miss.length ? '' : 'ready') + '">' + n.icon + ' ' + n.name + (n.repair ? ' (onarım)' : '') + ': ' +
      (n.miss.length ? n.miss.slice(0, 3).map(m => m.need + ' ' + R[m.k][1]).join(' · ') + ' kaldı' : 'hazır — yükselt!') + '</button>';
  }
  function targetOf(k) {
    const s = S();
    if (k in s.bars) return el('bar-' + k);
    if (k in s.edu) return el('edu-' + k);
    if (k === 'odun' || k === 'tas' || k === 'yiyecek') return el('res-' + k);
    return k === G.CONT[s.cur].res ? el('res-local') : el('chip-streak');
  }
  function fly(gains, from) {
    const r = from ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const list = gains.filter(g => g.v), n = list.length;
    list.forEach((g, i) => {
      const d = document.createElement('div'); d.className = 'fly' + (g.v < 0 ? ' neg' : '');
      d.textContent = (g.v > 0 ? '+' : '') + g.v + ' ' + R[g.k][1];
      const tg = targetOf(g.k), tr = tg && tg.getBoundingClientRect();
      const x0 = r.left + r.width / 2, y0 = r.top, x1 = tr && tr.width ? tr.left + tr.width / 2 : x0, y1 = tr && tr.width ? tr.top + tr.height / 2 : y0 - 140;
      el('fx').appendChild(d);
      const done = () => { d.remove(); if (tg) { tg.classList.remove('pulse'); void tg.offsetWidth; tg.classList.add('pulse'); } };
      if (!d.animate) { setTimeout(done, 300); return; }
      d.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.5)', opacity: 0 },
      { transform: 'translate(' + (x0 + (i - (n - 1) / 2) * 52) + 'px,' + (y0 - 64) + 'px) scale(1.3)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.7)', opacity: 0.85 }],
        { duration: 950, delay: i * 80, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'both' }).onfinish = done;
    });
  }
  function toast(t) { const e = el('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2600); }
  // iki dokunuşla onay
  function confirm2(key, btn, txt) {
    if (armed === key && Date.now() - armT < 4000) { armed = null; return true; }
    armed = key; armT = Date.now(); if (btn) btn.textContent = txt || 'Emin misin? Tekrar dokun'; return false;
  }

  /* ---------- sayfalar ---------- */
  const TITLES = { entry: 'Bugünkü hedefler', tree: 'Yetenek ağacı', work: 'Ada işleri', camp: 'Kamp', settings: 'Ayarlar', cont: 'Kıta' };
  function open(name, arg) {
    sheet = name; sheetArg = arg; armed = null;
    if (name === 'tree' && !sel) { const n = G.nextUp(); sel = n ? { t: n.tr, l: S().lv[n.tr] + 1 } : { t: 'barinak', l: 1 }; }
    el('sheet-t').textContent = name === 'cont' ? G.CONT[arg].icon + ' ' + G.CONT[arg].name : TITLES[name];
    render(); el('sheet-b').scrollTop = 0; document.body.classList.add('sheet');
  }
  function close() { sheet = null; document.body.classList.remove('sheet'); }
  function render() {
    if (!sheet) return;
    const b = el('sheet-b'), sc = b.scrollTop;
    b.innerHTML = ({ entry: vEntry, tree: vTree, work: vWork, camp: vCamp, settings: vSettings, cont: vCont })[sheet]();
    b.scrollTop = sc;
  }
  const costHtml = c => '<div class="cost">' + Object.keys(c).map(k => { const h = Math.floor(G.have(k)); return '<span class="' + (h >= c[k] ? '' : 'no') + '">' + R[k][1] + ' ' + R[k][0] + ' ' + Math.min(h, c[k]) + '/' + c[k] + '</span>'; }).join('') + '</div>';

  function vEntry() {
    const s = S(), t = s.today; let h = '';
    const days = []; let d = G.toDate(s.day);
    for (let i = 0; i < 7; i++) { d.setDate(d.getDate() - 1); const id = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); days.unshift({ id, w: 'PSÇPCCP'[(d.getDay() + 6) % 7] }); }
    h += '<div class="week">' + days.map(x => { const r = s.hist[x.id]; const k = !r ? '' : r.k + r.j >= 6 ? 'k3' : r.k >= 4 ? 'k2' : r.k >= 1 ? 'k1' : 'k0'; return '<div class="' + k + '"><i></i>' + x.w + '</div>'; }).join('') + '</div>';
    if (s.slow) h += '<div class="note warn">😵 Uykusuz gece: bugün kazanımların yarı yarıya. Bu akşam kitabını oku.</div>';
    else if (s.bars.dinlenme >= 80) h += '<div class="note">✨ Dinçsin: bugün kazanımlar +%10.</div>';
    h += '<div class="note">🃏 ' + s.jok + ' jokerin var. Tutamayacağın hedefin 🃏 düğmesine bas; o gece olay çıkmaz. Gün 03:00\'te kapanır.</div>';
    G.GOALS.forEach(g => {
      const v = t[g.id], done = v >= g.min, jk = !!t.jok[g.id];
      h += '<div class="card' + (done ? ' done' : '') + '"><div class="gh"><span class="gi">' + g.icon + '</span><div class="gt"><b>' + g.name + (done ? ' ✓' : '') + '</b><small>→ ' + g.feeds + (jk ? ' · 🃏 joker aktif' : '') + '</small></div>' +
        '<div class="gv"><b>' + v + '</b> / ' + g.min + ' ' + g.unit + '</div></div>' +
        '<div class="track"><div class="fill" style="width:' + Math.min(100, v / g.min * 100) + '%"></div></div><div class="gb">' +
        g.steps.map(a => '<button class="btn' + (a === g.steps[g.steps.length > 1 ? 1 : 0] ? ' gold' : '') + '" data-act="add" data-g="' + g.id + '" data-a="' + a + '">+' + a + ' ' + g.unit + '</button>').join('') +
        (done ? '' : '<button class="btn jk' + (jk ? ' on' : '') + '" data-act="jok" data-g="' + g.id + '">🃏</button>') + '</div>' +
        (g.id === 'beslenme' ? '<div class="gb"><button class="btn red" data-act="junk">🍟 Abur cubur yedim' + (t.junk ? ' (' + t.junk + ')' : '') + '</button></div>' : '') + '</div>';
    });
    h += '<button class="btn wide" data-act="undo"' + (t.log.length ? '' : ' disabled') + '>↩︎ Son girişi geri al</button>';
    return h;
  }

  function vTree() {
    const s = S(); let h = '<div class="tree">';
    const keys = Object.keys(G.TRACKS);
    keys.forEach(tr => {
      const T = G.TRACKS[tr], lv = s.lv[tr], mx = s.maxLv[tr], nx = G.costOf(tr);
      h += '<div class="col">' + T.levels.map((L, i) => {
        const l = i + 1, st = l <= lv ? 'built' : l === lv + 1 ? 'next' : '', dmg = l > lv && l <= mx ? ' dmg' : '', on = sel && sel.t === tr && sel.l === l ? ' sel' : '';
        const inner = st === 'next' ? '<span style="--p:' + Math.round(G.ratio(nx.cost) * 100) + '%"><em>' + L.icon + '</em></span>' : '<span>' + L.icon + '</span>';
        return '<button class="node ' + st + dmg + on + '" data-act="node" data-t="' + tr + '" data-l="' + l + '">' + inner + L.name + '</button>';
      }).join('') + '</div>';
    });
    h += '</div><div class="trunk">' + keys.map(k => '<div>' + G.TRACKS[k].icon + ' ' + G.TRACKS[k].name + '</div>').join('') + '</div>';
    if (sel) {
      const T = G.TRACKS[sel.t], L = T.levels[sel.l - 1], lv = s.lv[sel.t];
      h += '<div class="card" style="margin-top:12px"><div class="row"><span class="big">' + L.icon + '</span><div class="gt"><b>' + L.name + '</b><small>' + T.name + ' · seviye ' + sel.l + ' — ' + T.desc + '</small></div></div>';
      if (sel.l <= lv) h += '<div class="note" style="padding-top:8px">✓ Yapıldı.</div>';
      else if (sel.l === lv + 1) {
        const n = G.costOf(sel.t), ok = !G.missing(n.cost).length;
        if (n.repair) h += '<div class="note warn" style="padding-top:8px">Hasar gördü. Onarım yarı fiyatına.</div>';
        h += costHtml(n.cost) + '<button class="btn wide ' + (ok ? 'gold' : '') + '" data-act="up" data-t="' + sel.t + '"' + (ok ? '' : ' disabled') + '>' + (n.repair ? '🔧 Onar' : '⬆️ Yükselt') + '</button>';
      } else h += costHtml(L.cost) + '<div class="note">Önce ' + T.levels[lv].name + ' gerekli.</div>';
      h += '</div>';
    }
    const sp = G.CONT.map((c, i) => ({ c, i })).filter(x => x.c.b && s.unlocked[x.i]);
    if (sp.length) {
      h += '<h3>Kıta yapıları</h3>';
      sp.forEach(x => {
        const b = x.c.b, built = s.special[x.i], ok = !G.missing(b.cost).length;
        h += '<div class="card' + (built ? ' done' : '') + '"><div class="row"><span class="big">' + b.icon + '</span><div class="gt"><b>' + b.name + (built ? ' ✓' : '') + '</b><small>' + x.c.name + ' · ' + b.desc + '</small></div></div>' +
          (built ? '' : costHtml(b.cost) + '<button class="btn wide ' + (ok ? 'gold' : '') + '" data-act="special" data-v="' + x.i + '"' + (ok ? '' : ' disabled') + '>🔨 İnşa et</button>') + '</div>';
      });
    }
    return h;
  }

  function vWork() {
    const s = S(); let h = '';
    const e = s.bars.tokluk < 40 ? 'Tokluk düşük olduğu için verim azaldı. ' : '', j = s.today.junk ? 'Abur cubur seni halsizleştirdi (−%' + Math.min(50, s.today.junk * 10) + '). ' : '';
    h += '<div class="note' + (e || j ? ' warn' : '') + '">💪 Gücün: <b>' + Math.round(s.bars.guc) + '</b>. ' + (e + j || 'Spor yaptıkça güç kazanır, gücü burada kaynağa çevirirsin.') + '</div>';
    const item = (type, ic, name) => {
      const w = G.workInfo(type); if (!w) return '';
      const dis = w.lock || s.bars.guc < w.cost;
      return '<div class="card"><div class="row"><span class="big">' + ic + '</span><div class="gt"><b>' + name + '</b><small>' + (w.lock ? 'Önce bir silah yap (Yetenek → Silah)' : '−' + w.cost + ' 💪 → +' + w.y + ' ' + R[w.k][1] + ' ' + R[w.k][0].toLowerCase()) + '</small></div>' +
        '<button class="btn sm gold" data-act="work" data-v="' + type + '"' + (dis ? ' disabled' : '') + '>Yap</button></div></div>';
    };
    h += item('odun', '🪓', 'Odun topla') + item('tas', '⛏️', 'Taş topla') + item('av', '🏹', 'Avlan');
    const lr = G.CONT[s.cur].res; if (lr) h += item('yerel', R[lr][1], R[lr][0] + ' topla');
    const all = Object.keys(s.res).filter(k => s.res[k] > 0 || ['odun', 'tas', 'yiyecek'].indexOf(k) >= 0);
    h += '<h3>Depo</h3><div class="cost">' + all.map(k => '<span>' + R[k][1] + ' ' + R[k][0] + ' ' + Math.floor(s.res[k]) + '</span>').join('') + '</div>';
    return h;
  }

  function vCamp() {
    const s = S(), wl = G.wolfLv(), W = G.WOLF, nx = W[wl + 1]; let h = '';
    const p = nx ? (s.wolf - W[wl].at) / (nx.at - W[wl].at) * 100 : 100;
    h += '<div class="card"><div class="row"><span class="big">🐺</span><div class="gt"><b>Kurt · ' + W[wl].name + ' (seviye ' + (wl + 1) + '/5)</b><small>' + W[wl].desc + '</small></div></div>' +
      '<div class="track" style="margin:10px 0 6px"><div class="fill" style="width:' + p + '%;background:var(--gold)"></div></div>' +
      '<div class="note">' + (nx ? 'Sonraki: ' + nx.name + ' — ' + nx.desc + ' Tuttuğun her hedef kurdu yaklaştırır, kaçırdığın her hedef uzaklaştırır.' : 'Kurt artık yoldaşın.') + '</div>' +
      '<button class="btn wide" data-act="feed"' + (s.today.fed >= 2 || s.res.yiyecek < 5 ? ' disabled' : '') + '>🍖 Kurdu besle (−5 yiyecek) · bugün ' + s.today.fed + '/2</button></div>';
    h += '<h3>Kazazedeler (' + s.cast.length + '/' + G.capacity() + ')</h3>';
    if (!s.cast.length) h += '<div class="note">Henüz kimse yok. Barınağını Baraka\'ya yükselt ve günde en az 4 hedef tut; kazazedeler gece adana ulaşır. Her barınak seviyesi ve her yeni kıta bir kişilik yer açar.</div>';
    s.cast.forEach((c, i) => {
      h += '<div class="card"><div class="row"><span class="big">🧍</span><div class="gt"><b>' + c.name + '</b><small>' + ({ odun: 'Gecede +6 odun (1 yiyecek yer)', tas: 'Gecede +5 taş (1 yiyecek yer)', balik: 'Gecede +4 yiyecek', nobet: 'Saldırı ve yağma kayıplarını azaltır' })[c.job] + '</small></div></div><div class="seg">' +
        Object.keys(G.JOBS).map(j => '<button class="' + (c.job === j ? 'on' : '') + '" data-act="job" data-i="' + i + '" data-v="' + j + '">' + G.JOBS[j][1] + ' ' + G.JOBS[j][0] + '</button>').join('') + '</div></div>';
    });
    h += '<h3>Seri</h3><div class="note">🔥 Şu an ' + s.streak + ' gün · en iyi ' + s.best + ' gün. Altı hedefin tamamı (ya da joker) tutulursa seri uzar.</div>';
    return h;
  }

  function vCont() {
    const s = S(), i = sheetArg, c = G.CONT[i]; let h = '';
    if (c.res) h += '<div class="note">Yeni kaynak: ' + R[c.res][1] + ' ' + R[c.res][0] + ' · Yeni yapı: ' + c.b.icon + ' ' + c.b.name + ' (' + c.b.desc + ')</div>';
    if (s.unlocked[i]) {
      h += '<div class="note">' + (s.cur === i ? 'Şu an bu adadasın.' : 'Bu kıtayı açtın. Kampını buraya taşıyabilirsin.') + '</div>' +
        '<button class="btn wide gold" data-act="go" data-v="' + i + '">🏝️ ' + (s.cur === i ? 'Adaya in' : 'Bu adaya git') + '</button>';
      return h;
    }
    const v = G.vehOk(i), m = s.ms[i];
    h += '<div class="cond"><i>' + (v ? '✅' : '⬜') + '</i><div><b>Taşıt: ' + G.VEH[c.veh] + '</b><br><span class="sub">' + (v ? 'Hazır.' : 'Yetenek ağacında Deniz yolu dalından yap.') + '</span></div></div>';
    h += '<div class="cond"><i>' + (m ? '✅' : '⬜') + '</i><div><b>' + c.ms + '</b><br><span class="sub">Gerçek hayattaki dönüm noktan.</span>';
    if (c.weight) {
      const w = G.weightInfo();
      h += s.weight.target == null || !s.weight.log.length ? '<br><span class="sub">Ayarlardan hedef kilonu gir ve güncel kilonu kaydet.</span>' :
        '<div class="track" style="margin:8px 0 4px"><div class="fill" style="width:' + w.pct * 100 + '%"></div></div><span class="sub">Başlangıç ' + w.st + ' kg · şimdi ' + w.cur + ' kg · hedef ' + w.tg + ' kg</span>';
    }
    h += '</div>' + (m ? '<button class="btn sm" data-act="ms" data-v="' + i + '" data-on="0">Geri al</button>' : '<button class="btn sm gold" data-act="ms" data-v="' + i + '" data-on="1"' + (c.weight && !G.weightInfo().ok ? ' disabled' : '') + '>Ulaştım</button>') + '</div>';
    h += '<button class="btn wide gold" style="margin-top:8px" data-act="unlock" data-v="' + i + '"' + (v && m ? '' : ' disabled') + '>' + (c.veh === 3 ? '✈️ Havalan' : '⛵ Yola çık') + '</button>';
    return h;
  }

  function vSettings() {
    const s = S(), w = s.weight, last = w.log.length ? w.log[w.log.length - 1] : null, wi = G.weightInfo(); let h = '';
    const tog = (k, t) => '<div class="card row"><div class="gt"><b>' + t + '</b></div><button class="tog' + (s.set[k] ? ' on' : '') + '" data-act="tog" data-v="' + k + '"></button></div>';
    h += '<h3>Ses</h3>' + tog('music', '🎵 Müzik') + tog('sfx', '🔊 Efektler ve ortam sesi');
    h += '<h3>Kilo takibi</h3><div class="card"><div class="row"><div class="gt"><b>Hedef kilo (kg)</b></div><input class="inp" id="in-target" type="number" inputmode="decimal" step="0.1" value="' + (w.target == null ? '' : w.target) + '"><button class="btn sm" data-act="wtarget">Kaydet</button></div>' +
      '<div class="row" style="margin-top:9px"><div class="gt"><b>Güncel kilo (kg)</b><small>' + (last ? 'Son kayıt: ' + last.kg + ' kg' : 'Henüz kayıt yok') + '</small></div><input class="inp" id="in-kg" type="number" inputmode="decimal" step="0.1" value=""><button class="btn sm gold" data-act="wlog">Kaydet</button></div>' +
      (w.target != null && last ? '<div class="track" style="margin:11px 0 5px"><div class="fill" style="width:' + wi.pct * 100 + '%"></div></div><div class="sub">' + (wi.ok ? '🎉 Hedefe ulaştın! Dağ Kıtası\'nda "Ulaştım"ı işaretleyebilirsin.' : 'Hedefe ' + Math.abs(wi.cur - wi.tg).toFixed(1) + ' kg kaldı (%' + Math.round(wi.pct * 100) + ').') + '</div>' : '') + '</div>';
    h += '<h3>Yedek</h3><div class="gb" style="margin-top:0"><button class="btn" data-act="backup">⬇️ Yedek al</button><button class="btn" data-act="restore">⬆️ Yedeği yükle</button></div>';
    h += '<h3>Diğer</h3><div class="gb" style="margin-top:0"><button class="btn" data-act="look">🧍 Görünüm</button><button class="btn" data-act="report"' + (s.reports.length ? '' : ' disabled') + '>🌙 Son gece</button></div>' +
      '<div class="gb"><button class="btn red" data-act="reset">Oyunu sıfırla</button></div>' +
      '<div class="note" style="margin-top:12px">Verilerin yalnızca bu cihazda saklanır. Ana ekrandaki uygulamayı silmeden önce yedek al.</div>';
    return h;
  }

  /* ---------- kurulum & gece raporu ---------- */
  function showSetup() {
    const s = S(), L = World.look, o = el('overlay');
    const row = (k, t, arr) => '<div class="sub">' + t + '</div><div class="sw">' + arr.map((c, i) => '<button class="' + (s.look[k] === i ? 'on' : '') + '" style="background:' + c + '" data-act="lookset" data-k="' + k + '" data-v="' + i + '"></button>').join('') + '</div>';
    o.className = 'on'; World.closeup(true); document.body.classList.add('setup');
    o.innerHTML = '<div class="panel"><h2>' + (s.setup ? 'Görünümünü değiştir' : 'Adaya düştün!') + '</h2><div class="note" style="padding-left:0">' + (s.setup ? '' : 'Sıfırdan hayatta kal, geliş, tüm kıtaları aç. Önce karakterini seç.') + '</div>' +
      row('skin', 'Ten', L.SKIN) + row('hair', 'Saç', L.HAIR) + row('shirt', 'Kıyafet', L.SHIRT) +
      '<button class="btn wide gold" data-act="setupok">' + (s.setup ? 'Tamam' : '🏝️ Başla') + '</button></div>';
  }
  function showReport() {
    const s = S(), o = el('overlay'), reps = s.reports.slice(-3); if (!reps.length) return;
    let h = '<div class="repbox"><h2>🌙 Gece olanlar</h2><div class="sub">' + (s.away > 3 ? s.away + ' gün uzaktaydın; son 3 gün gösteriliyor.' : 'Sen yokken adada yaşananlar') + '</div>', n = 0, storm = false, wolf = false, bad = false;
    reps.forEach(r => {
      h += '<div class="rday">' + G.toDate(r.day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }) + ' · ' + r.kept + '/6 hedef</div>';
      if (!r.ev.length) h += '<div class="rcard ok" style="animation-delay:' + (n++ * 0.22) + 's"><i>🏕️</i><div><b>Sakin bir gece</b><small>Kamp güvende.</small></div></div>';
      r.ev.forEach(e => {
        if (e.k === 'storm') storm = true; if (e.k === 'wolf') wolf = true; if (e.k === 'bad' || e.k === 'storm') bad = true;
        h += '<div class="rcard ' + e.k + '" style="animation-delay:' + (n++ * 0.22) + 's"><i>' + e.i + '</i><div><b>' + e.t + '</b><small>' + e.d + '</small></div></div>';
      });
    });
    h += '<button class="btn wide gold" style="margin-top:10px" data-act="repok">☀️ Güne başla</button></div>';
    o.className = 'on rep'; o.innerHTML = h; World.forceNight(true);
    setTimeout(() => { if (storm) Snd.thunder(); else if (bad) Snd.bad(); else Snd.reward(); }, 500);
    if (wolf) setTimeout(() => Snd.howl(0.12), 1500);
  }
  function hideOverlay() { const o = el('overlay'); o.className = ''; o.innerHTML = ''; World.forceNight(false); World.closeup(false); document.body.classList.remove('setup'); }

  function fade(fn) { const f = el('fade'); f.classList.add('on'); setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 120); }, 300); }
  function setMode(m) {
    World.setMode(m); document.body.classList.toggle('globe', m === 'globe');
    el('nav-world').textContent = m === 'globe' ? '🏝️' : '🌍'; el('nav-world-t').textContent = m === 'globe' ? 'Ada' : 'Dünya';
    Snd.setScene(m === 'island', World.isNight());
  }
  function afterChange(world) { updateHud(); render(); if (world) World.refresh(); }

  /* ---------- eylemler ---------- */
  const ACT = {
    open(d) { Snd.tap(); if (World.mode() === 'globe' && d.v !== 'settings' && d.v !== 'tree') fade(() => setMode('island')); open(d.v); },
    close() { close(); },
    world() { Snd.tap(); close(); fade(() => setMode(World.mode() === 'globe' ? 'island' : 'globe')); },
    cont(d) { Snd.tap(); open('cont', +d.v); },
    add(d, b) {
      const r = G.addEntry(d.g, +d.a); fly(r.gains, b);
      if (r.perfect) { Snd.build(); toast('🌟 Mükemmel gün! Altı hedef de tamam.'); }
      else if (r.reached) { Snd.reward(); toast('✓ ' + G.GOALS.find(g => g.id === d.g).name + ' hedefi tamam! +5 🪵 +5 🪨'); }
      else Snd.coin();
      afterChange();
    },
    junk(d, b) { const r = G.junk(); fly(r.gains, b); Snd.bad(); toast('🍟 Halsizleştin: bugün toplama verimi düştü.'); afterChange(); },
    undo() { if (G.undo()) { Snd.tap(); afterChange(); } },
    jok(d) {
      const r = G.toggleJoker(d.g);
      if (r === 'none') { Snd.bad(); toast('Jokerin kalmadı. Pazartesi 4 yeni joker gelir.'); return; }
      Snd.coin(); toast(r === 'on' ? '🃏 Joker kullanıldı: bu gece o hedef için olay çıkmaz.' : 'Joker geri alındı.'); afterChange();
    },
    node(d) { Snd.tap(); sel = { t: d.t, l: +d.l }; render(); },
    up(d, b) {
      const tr = d.t, L = G.TRACKS[tr].levels[S().lv[tr]];
      if (!G.upgrade(tr)) return;
      Snd.build(); toast('🎉 ' + L.name + ' hazır!'); fly([{ k: 'guc', v: 0 }], b);
      sel = S().lv[tr] < G.TRACKS[tr].levels.length ? { t: tr, l: S().lv[tr] + 1 } : { t: tr, l: S().lv[tr] };
      afterChange(true); close();
    },
    special(d) { const i = +d.v; if (G.buildSpecial(i)) { Snd.build(); toast('🎉 ' + G.CONT[i].b.name + ' inşa edildi!'); afterChange(true); } },
    work(d, b) { const r = G.work(d.v); if (!r) return; fly(r.gains, b); Snd.coin(); afterChange(); },
    feed() { if (G.feedWolf()) { Snd.coin(); toast('🐺 Kurt sana biraz daha güveniyor.'); afterChange(true); } },
    job(d) { Snd.tap(); G.setJob(+d.i, d.v); afterChange(true); },
    go(d) { const i = +d.v; close(); fade(() => { G.travel(i); setMode('island'); updateHud(); }); },
    ms(d, b) {
      const i = +d.v;
      if (d.on === '1') { if (!confirm2('ms' + i, b, 'Emin misin? Tekrar dokun')) return; if (G.setMs(i, true)) { Snd.reward(); toast('🏁 Dönüm noktası işaretlendi. Tebrikler!'); } }
      else G.setMs(i, false);
      render();
    },
    unlock(d) {
      const i = +d.v; if (!G.unlock(i)) return;
      close(); Snd.build();
      fade(() => { setMode('island'); updateHud(); toast('🎉 ' + G.CONT[i].name + ' açıldı! Yeni kaynak: ' + R[G.CONT[i].res][0]); });
    },
    tog(d) { const s = S(); s.set[d.v] = !s.set[d.v]; G.save(); Snd.setMusic(s.set.music); Snd.setSfx(s.set.sfx); render(); },
    wtarget() { const v = parseFloat(el('in-target').value.replace(',', '.')); if (!(v > 20 && v < 300)) { toast('Geçerli bir kilo gir.'); return; } S().weight.target = v; G.save(); toast('Hedef kilo kaydedildi.'); render(); },
    wlog() { const v = parseFloat(el('in-kg').value.replace(',', '.')); if (!(v > 20 && v < 300)) { toast('Geçerli bir kilo gir.'); return; } G.logWeight(v); Snd.coin(); toast('Kilo kaydedildi.'); render(); },
    backup() {
      const name = 'mygoals-yedek-' + S().day + '.json', txt = G.exportData();
      try {
        const f = new File([txt], name, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: 'My Goals yedeği' }).catch(() => { }); return; }
      } catch (e) { }
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    restore() { el('file').value = ''; el('file').click(); },
    look() { close(); if (World.mode() === 'globe') setMode('island'); showSetup(); },
    lookset(d) { S().look[d.k] = +d.v; G.save(); World.refresh(); showSetup(); Snd.tap(); },
    setupok() {
      const first = !S().setup; S().setup = true; G.save(); hideOverlay(); Snd.reward();
      if (first) toast('＋ düğmesiyle bugün yaptıklarını gir.');
    },
    report() { close(); if (World.mode() === 'globe') setMode('island'); showReport(); },
    repok() { S().unseen = false; G.save(); hideOverlay(); Snd.tap(); },
    reset(d, b) { if (!confirm2('reset', b, 'Her şey silinecek! Tekrar dokun')) return; G.reset(); location.reload(); }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    Snd.unlock(); const f = ACT[b.dataset.act]; if (f) f(b.dataset, b);
  });
  document.addEventListener('pointerdown', () => Snd.unlock(), { passive: true });
  el('file').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { try { G.importData(rd.result); location.reload(); } catch (x) { toast('Bu dosya geçerli bir yedek değil.'); } };
    rd.readAsText(f);
  });

  /* ---------- başlangıç ---------- */
  function tick() {
    if (G.rollover()) { updateHud(); render(); World.refresh(); if (S().setup && !el('overlay').classList.contains('on')) showReport(); }
  }
  function boot() {
    G.load(); G.rollover();
    try { World.init(el('c'), el('labels')); }
    catch (x) { const e = el('err'); e.style.display = 'flex'; e.textContent = 'Bu cihazda 3D (WebGL) açılamadı: ' + x.message; return; }
    World.on('pick', i => ACT.cont({ v: i }));
    World.on('descend', i => { close(); fade(() => { G.travel(i); setMode('island'); updateHud(); }); });
    Snd.setMusic(S().set.music); Snd.setSfx(S().set.sfx);
    buildHud(); updateHud();
    if (!S().setup) showSetup(); else if (S().unseen) showReport();
    setInterval(tick, 30000);
    setInterval(() => Snd.setScene(World.mode() === 'island', World.isNight()), 1500);
    document.addEventListener('visibilitychange', () => { if (document.hidden) Snd.pause(); else { Snd.resume(); tick(); } });
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
    window.__app = { open, showReport, setMode, updateHud };
  }
  boot();
})();
