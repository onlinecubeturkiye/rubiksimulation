// Atölye (köy): binalar jeton üretir, oyuncuyu güçlendirir. Aynı anda tek bina yükseltilir (Usta Robot).
(function () {
  const { $, h, esc } = G;
  const Snd = window.Sound;
  const MAX = 5;
  const B = {
    mine:  { name: 'Jeton Madeni',      unlock: 1, desc: 'Sen yokken bile jeton biriktirir.', roof: '#ffc928', wall: '#c99a5b', icon: 'coin',
             rate: [0, 20, 35, 55, 80, 110], cap: 8, cost: [0, 0, 300, 700, 1500, 3000], mins: [0, 0, 5, 30, 120, 360] },
    gym:   { name: 'Antrenman Salonu',  unlock: 2, desc: 'Her seviye +%10 XP.', roof: '#3bdc6e', wall: '#e8ecff', icon: 'dumbbell',
             cost: [250, 600, 1200, 2500, 4500], mins: [5, 30, 120, 300, 600] },
    depot: { name: 'Kutu Deposu',       unlock: 3, desc: 'Her seviye küp kutuları %10 daha hızlı açılır.', roof: '#ff8a1f', wall: '#b07f43', icon: 'box',
             cost: [300, 700, 1500, 3000, 5000], mins: [5, 30, 120, 300, 600] },
    lab:   { name: 'Laboratuvar',       unlock: 4, desc: 'Her seviye tüm küplerine +%3 can ve saldırı.', roof: '#8a5cff', wall: '#dfe6ff', icon: 'flask',
             cost: [400, 900, 1800, 3500, 6000], mins: [10, 45, 180, 480, 720] },
    table: { name: 'Küp Masası',        unlock: 1, desc: '3B küp çöz, jeton kazan. Her gün yeni bir bulmaca.', roof: '#2e8cff', wall: '#ffffff', icon: 'cube' },
  };
  const ORDER = ['mine', 'table', 'gym', 'depot', 'lab'];

  function st() {
    const S = G.S;
    if (!S.base) S.base = { mine: { lv: 1, t: Date.now() }, gym: { lv: 0 }, depot: { lv: 0 }, lab: { lv: 0 }, build: null };
    return S.base;
  }
  const lv = (k) => (st()[k] && st()[k].lv) || 0;
  G.baseLevel = lv;
  G.baseBonus = (k) => ({ lab: 0.03, gym: 0.1, depot: 0.1 }[k] || 0) * lv(k);

  // ---------- Maden ----------
  function mined() {
    const m = st().mine, d = B.mine;
    const hours = (Date.now() - m.t) / 3600000;
    return Math.min(d.rate[m.lv] * d.cap, Math.floor(d.rate[m.lv] * hours));
  }
  G.mineReady = () => mined() >= B.mine.rate[lv('mine')] * B.mine.cap * 0.5;
  function collect(btn) {
    const n = mined(); if (n < 1) return G.toast('Henüz jeton birikmedi');
    st().mine.t = Date.now();
    G.addCoins(n); G.coinFloat(n); window.FX.coins(Math.min(12, 3 + Math.floor(n / 30)), btn);
    G.save(); G.renderBase();
  }

  // ---------- Yükseltme ----------
  const fmt = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60 ? (m % 60) + ' dk' : ''}`.trim() : ms < 60000 ? `${Math.ceil(ms / 1000)} sn` : `${m} dk`; };
  const nextCost = (k) => { const d = B[k], l = lv(k); return d.cost && l < MAX ? { coins: d.cost[k === 'mine' ? l + 1 : l], mins: d.mins[k === 'mine' ? l + 1 : l] } : null; };
  const rushCost = (ms) => Math.max(10, Math.ceil(ms / 60000 * 1.5));
  function checkBuild() {
    const s = st(), b = s.build;
    if (!b || Date.now() < b.end) return;
    s[b.k] = s[b.k] || { lv: 0 };
    if (b.k === 'mine') { const n = mined(); s.mine.lv++; s.mine.t = Date.now() - n / B.mine.rate[s.mine.lv] * 3600000; }
    else s[b.k].lv++;
    s.build = null;
    G.save();
    window.FX.confetti(70); Snd.win();
    G.toast(`${B[b.k].name} seviye ${lv(b.k)} oldu!`);
  }
  function upgrade(k) {
    const s = st(), c = nextCost(k);
    if (!c) return;
    if (s.build) return G.toast('Usta Robot meşgul. Önceki yükseltme bitsin.');
    if (G.S.coins < c.coins) return G.toast(`Yeterli jeton yok (${c.coins} gerekli)`);
    G.S.coins -= c.coins; G.coinFloat(-c.coins);
    if (k !== 'mine' && !s[k]) s[k] = { lv: 0 };
    s.build = { k, end: Date.now() + c.mins * 60000 };
    G.save(); Snd.click(); G.renderBase();
  }
  function rush() {
    const b = st().build; if (!b) return;
    const cost = rushCost(b.end - Date.now());
    if (G.S.coins < cost) return G.toast(`Yeterli jeton yok (${cost} gerekli)`);
    G.S.coins -= cost; G.coinFloat(-cost); b.end = Date.now(); checkBuild(); G.renderBase();
  }

  // ---------- Bina çizimi (izometrik) ----------
  const ICON = {
    coin: '<circle cx="0" cy="0" r="9" fill="#ffc928" stroke="#0b1033" stroke-width="2.5"/><text x="0" y="4" text-anchor="middle" font-size="11" font-weight="900" fill="#a86400">₺</text>',
    dumbbell: '<rect x="-10" y="-2" width="20" height="4" fill="#0b1033"/><rect x="-13" y="-7" width="5" height="14" rx="1.5" fill="#ff4d5e" stroke="#0b1033" stroke-width="2"/><rect x="8" y="-7" width="5" height="14" rx="1.5" fill="#ff4d5e" stroke="#0b1033" stroke-width="2"/>',
    box: '<path d="M-9-4 0-9 9-4 9 6 0 11-9 6z" fill="#c99a5b" stroke="#0b1033" stroke-width="2" stroke-linejoin="round"/><path d="M-9-4 0 1 9-4M0 1v10" fill="none" stroke="#0b1033" stroke-width="2"/>',
    flask: '<path d="M-3-10h6v6l7 12c1 2 0 3-2 3h-16c-2 0-3-1-2-3l7-12z" fill="#7dffa6" stroke="#0b1033" stroke-width="2" stroke-linejoin="round"/><path d="M-6 4h12" stroke="#0b1033" stroke-width="2"/>',
    cube: '<path d="M0-10 10-4v10L0 12-10 6V-4z" fill="#ffc928" stroke="#0b1033" stroke-width="2" stroke-linejoin="round"/><path d="M-10-4 0 2 10-4M0 2v10" fill="none" stroke="#0b1033" stroke-width="2"/><path d="M0 2 10-4v10L0 12z" fill="#ff8a1f" stroke="#0b1033" stroke-width="2" stroke-linejoin="round"/>',
  };
  function buildingSVG(k, level, locked) {
    const d = B[k], H = 30 + Math.min(level, 5) * 5;            // seviye arttıkça bina yükselir
    const L = [16, 72], F = [50, 89], R = [84, 72];               // zemindeki köşeler
    const up = (p, dy = H) => [p[0], p[1] - dy];
    const P = (...a) => a.map(p => p.join(',')).join(' ');
    const apex = [50, 72 - H - 26];
    const Lr = [8, 72 - H + 2], Fr = [50, 93 - H], Rr = [92, 72 - H + 2];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d0 = lerp(L, F, 0.38), d1 = lerp(L, F, 0.66);
    const w0 = lerp(F, R, 0.3), w1 = lerp(F, R, 0.7);
    return `<svg class="bld${locked ? ' locked' : ''}" viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="86" rx="44" ry="12" fill="#1f9b46" stroke="#0b1033" stroke-width="2.5"/>
      <polygon points="${P(up(L), up(F), F, L)}" fill="${d.wall}" stroke="#0b1033" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="${P(up(F), up(R), R, F)}" fill="${d.wall}" stroke="#0b1033" stroke-width="3" stroke-linejoin="round" style="filter:brightness(.75)"/>
      <polygon points="${P(d0, d1, up(d1, 18), up(d0, 18))}" fill="#8a5a22" stroke="#0b1033" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="${P(up(w0, H * 0.45), up(w1, H * 0.45), up(w1, H * 0.8), up(w0, H * 0.8))}" fill="#bfe9ff" stroke="#0b1033" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="${P(Lr, Fr, apex)}" fill="${d.roof}" stroke="#0b1033" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="${P(Fr, Rr, apex)}" fill="${d.roof}" stroke="#0b1033" stroke-width="3" stroke-linejoin="round" style="filter:brightness(.72)"/>
      <path d="M${P(lerp(Lr, apex, 0.15), lerp(Fr, apex, 0.15))}" stroke="#fff" stroke-width="2" opacity=".35"/>
      <g transform="translate(${apex[0]} ${apex[1] + 30})">${ICON[d.icon]}</g>
    </svg>`;
  }

  // ---------- Görünüm ----------
  function render() {
    checkBuild();
    const S = G.S, s = st();
    const b = s.build;
    $('builder').innerHTML = `<svg viewBox="0 0 48 48" class="robot" aria-hidden="true"><rect x="10" y="14" width="28" height="22" rx="6" fill="#b9c5ff" stroke="#0b1033" stroke-width="3"/><circle cx="19" cy="25" r="4" fill="#0b1033"/><circle cx="29" cy="25" r="4" fill="#0b1033"/><path d="M24 14V7" stroke="#0b1033" stroke-width="3"/><circle cx="24" cy="6" r="3" fill="#ff4d5e" stroke="#0b1033" stroke-width="2"/><rect x="14" y="36" width="20" height="6" rx="2" fill="#7b4dff" stroke="#0b1033" stroke-width="2.5"/></svg>
      <div><b>Usta Robot</b><small>${b ? `${esc(B[b.k].name)} yükseltiliyor · <span data-end="${b.end}">${fmt(b.end - Date.now())}</span>` : 'Boşta. Bir bina yükselt!'}</small></div>
      ${b ? `<button class="btn btn-small btn-yellow" id="rush-btn" data-rush="${b.end}">Hemen bitir (${rushCost(b.end - Date.now())})</button>` : ''}`;
    if (b) $('rush-btn').onclick = rush;
    const v = $('village'); v.innerHTML = '';
    ORDER.forEach(k => {
      const d = B[k], l = k === 'table' ? 1 : lv(k), locked = S.level < d.unlock;
      const card = h('div', 'bld-card' + (locked ? ' locked' : '') + (b && b.k === k ? ' building' : ''));
      let status = '', actions = '';
      if (locked) status = `<small>Seviye ${d.unlock}’de açılır</small>`;
      else if (k === 'table') { status = `<small>${esc(d.desc)}</small>`; actions = '<button class="btn btn-small btn-blue" data-act="table">Masaya otur</button>'; }
      else {
        const stars = `<span class="stars">${'★'.repeat(l)}${'☆'.repeat(MAX - l)}</span>`;
        let eff = '';
        if (k === 'mine') { const n = mined(), cap = d.rate[l] * d.cap; eff = `<small>${d.rate[l]} jeton/saat · depo ${cap}</small><span class="bar"><i style="width:${Math.min(100, n / cap * 100)}%"></i></span>`; actions += `<button class="btn btn-small btn-green" data-act="collect" ${n < 1 ? 'disabled' : ''}>Topla ${n}</button>`; }
        else eff = `<small>${l ? `Şu an: ${k === 'lab' ? `+%${l * 3} güç` : k === 'gym' ? `+%${l * 10} XP` : `%${l * 10} hızlı`}` : esc(d.desc)}</small>`;
        status = stars + eff;
        const c = nextCost(k);
        if (b && b.k === k) actions += `<span class="bld-time" data-end="${b.end}">${fmt(b.end - Date.now())}</span>`;
        else if (c) actions += `<button class="btn btn-small btn-yellow" data-act="up" ${b || S.coins < c.coins ? 'disabled' : ''}><i class="coin"></i>${c.coins} · ${fmt(c.mins * 60000)}</button>`;
        else actions += '<span class="bld-max">EN ÜST</span>';
      }
      card.innerHTML = `${buildingSVG(k, l, locked)}<div class="bld-info"><b>${esc(d.name)}${k !== 'table' && !locked ? ` <em>Sv ${l}</em>` : ''}</b>${status}</div><div class="bld-acts">${actions}</div>`;
      card.querySelectorAll('[data-act]').forEach(btn => (btn.onclick = () => {
        const a = btn.dataset.act;
        if (a === 'collect') collect(btn);
        else if (a === 'up') upgrade(k);
        else if (a === 'table') { Snd.click(); G.show('solve'); }
      }));
      v.appendChild(card);
    });
  }
  G.renderBase = render;
  G.baseNeedsAttention = () => { checkBuild(); return G.mineReady() || (!st().build && ORDER.some(k => B[k].cost && G.S.level >= B[k].unlock && nextCost(k) && G.S.coins >= nextCost(k).coins)); };
  // Atölye yalnız durum değişince yeniden çizilir (bina bitti, maden doldu, seviye/jeton değişti)
  const sig = () => { const s = st(); return [lv('mine'), lv('gym'), lv('depot'), lv('lab'), s.build && s.build.k, mined(), G.S.coins, G.S.level].join('|'); };
  let lastSig = '';
  const origRender = render;
  G.renderBase = function () { origRender(); lastSig = sig(); };
  setInterval(() => {
    checkBuild();
    if (G.current !== 'base') return;
    if (sig() !== lastSig) { if (!G.isModalOpen()) G.renderBase(); } else G.tickTimers($('tab-base'));
  }, 1000);
})();
