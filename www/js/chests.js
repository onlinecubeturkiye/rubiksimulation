// Sandıklar: galibiyetlerden düşer, 4 yuvaya girer. Aynı anda bir sandığın kilidi açılır.
// Taç Sandığı: rakip küplerini yendikçe taç toplanır, günde 10 taçta bedava açılır.
(function () {
  const { $, h, esc, cubeById, D } = G;
  const R = window.Render, Snd = window.Sound;
  const SLOTS = 4;

  // ---------- Sandık çizimi ----------
  G.chestSVG = function (type, cls = '') {
    const c = D.CHESTS[type];
    return `<svg class="chest-svg ${cls}" viewBox="0 0 100 90" aria-hidden="true">
      <g class="c-body"><rect x="10" y="40" width="80" height="44" rx="8" fill="${c.color}" stroke="#0b1033" stroke-width="5"/>
      <rect x="10" y="40" width="80" height="12" fill="#0b1033" opacity=".18"/>
      <rect x="22" y="40" width="9" height="44" fill="#0b1033" opacity=".28"/><rect x="69" y="40" width="9" height="44" fill="#0b1033" opacity=".28"/></g>
      <g class="c-lid"><path d="M10 44 Q10 10 50 10 Q90 10 90 44 Z" fill="${c.lid}" stroke="#0b1033" stroke-width="5" stroke-linejoin="round"/>
      <path d="M22 44 Q22 16 30 13 M78 44 Q78 16 70 13" stroke="#0b1033" stroke-width="5" opacity=".3" fill="none"/>
      <path d="M24 22 Q50 8 76 22" stroke="#fff" stroke-width="4" opacity=".35" fill="none" stroke-linecap="round"/></g>
      <rect x="40" y="34" width="20" height="20" rx="4" fill="#ffc928" stroke="#0b1033" stroke-width="4"/><circle cx="50" cy="44" r="3" fill="#0b1033"/>
    </svg>`;
  };

  // ---------- Durum ----------
  const now = () => Date.now();
  function slots() {
    const S = G.S;
    if (!Array.isArray(S.chests) || S.chests.length !== SLOTS) S.chests = Array.from({ length: SLOTS }, (_, i) => (S.chests && S.chests[i]) || null);
    return S.chests;
  }
  const stateOf = (c) => (!c ? 'empty' : !c.end ? 'locked' : now() >= c.end ? 'ready' : 'unlocking');
  const anyUnlocking = () => slots().some(c => stateOf(c) === 'unlocking');
  const fmt = (ms) => {
    const m = Math.ceil(ms / 60000);
    if (m >= 60) return `${Math.floor(m / 60)} sa ${m % 60 ? (m % 60) + ' dk' : ''}`.trim();
    if (ms < 60000) return `${Math.ceil(ms / 1000)} sn`;
    return `${m} dk`;
  };
  const rushCost = (ms) => Math.max(10, Math.ceil((ms / 60000) * 1.5));

  // Galibiyette sandık ver (yuva boşsa). Döndürür: sandık türü ya da null.
  G.dropChest = function () {
    const S = G.S, list = slots();
    const i = list.findIndex(c => !c);
    if (i < 0) return null;
    S.chestIdx = S.chestIdx || 0;
    const type = D.CHEST_CYCLE[S.chestIdx % D.CHEST_CYCLE.length];
    S.chestIdx++;
    list[i] = { type, end: null };
    return type;
  };
  G.chestsReady = () => slots().some(c => stateOf(c) === 'ready') || G.crownReady();

  // ---------- Taçlar ----------
  G.crownState = function () {
    const S = G.S, d = G.dayIndex();
    if (!S.crowns || S.crowns.day !== d) S.crowns = { day: d, n: 0, got: false };
    return S.crowns;
  };
  G.addCrowns = function (n) { const c = G.crownState(); c.n = Math.min(10, c.n + n); return c.n; };
  G.crownReady = () => { const c = G.crownState(); return c.n >= 10 && !c.got; };
  G.openCrownChest = function () {
    const c = G.crownState();
    if (c.got) return G.toast('Bugünkü Taç Sandığı’nı açtın. Yarın yine 10 taç topla!');
    if (c.n < 10) return G.toast(`Taç Sandığı için ${10 - c.n} taç daha. Rakip küplerini yenerek taç kazan!`);
    c.got = true; G.save();
    openChest('tac');
  };

  // ---------- Yuvalar (ana ekran) ----------
  function renderSlots() {
    const row = $('chest-row');
    if (!row) return;
    row.innerHTML = '';
    slots().forEach((c, i) => {
      const st = stateOf(c);
      const b = h('button', `slot-chest ${st}`);
      if (st === 'empty') b.innerHTML = '<span class="sc-empty">Boş yuva</span>';
      else {
        const def = D.CHESTS[c.type];
        const info = st === 'ready' ? '<b class="sc-open">AÇ!</b>'
          : st === 'unlocking' ? `<b class="sc-time">${fmt(c.end - now())}</b>`
          : `<small>${fmt(def.mins * 60000)}</small><b class="sc-unlock">Kilidi aç</b>`;
        b.innerHTML = `${G.chestSVG(c.type)}<span class="sc-name">${esc(def.name.replace(' Sandık', ''))}</span>${info}`;
      }
      b.onclick = () => tapSlot(i);
      row.appendChild(b);
    });
  }
  G.renderChestSlots = renderSlots;
  setInterval(() => { if (G.current === 'home' && !G.isModalOpen()) renderSlots(); }, 1000);

  function tapSlot(i) {
    const list = slots(), c = list[i], st = stateOf(c);
    Snd.click();
    if (st === 'empty') return G.toast('Savaş kazan, sandık kazan! Boş yuvalar dolsun.');
    const def = D.CHESTS[c.type];
    if (st === 'ready') { list[i] = null; G.save(); renderSlots(); return openChest(c.type); }
    const left = st === 'unlocking' ? c.end - now() : def.mins * 60000;
    const cost = rushCost(left);
    const body = G.modal(def.name, `
      <div class="chest-big">${G.chestSVG(c.type)}</div>
      <p>İçinde: <b>${def.cubes} küp</b> ve <b>${def.coins} jeton</b>${def.min ? ` · en az 1 <b>${D.RARITIES[def.min].name}</b>` : ''}</p>
      <p>${st === 'unlocking' ? `Kilit açılıyor: <b>${fmt(left)}</b> kaldı` : `Kilidi açmak <b>${fmt(left)}</b> sürer.`}</p>
      ${st === 'locked' && anyUnlocking() ? '<p class="note">Aynı anda tek sandığın kilidi açılabilir. Diğeri bitince bunu başlat.</p>' : ''}`,
      [
        ...(st === 'locked' ? [{ label: 'Kilidi açmaya başla', cls: 'btn-green', disabled: anyUnlocking(), onClick: () => { c.end = now() + def.mins * 60000; G.save(); renderSlots(); } }] : []),
        { label: `Hemen aç (${cost})`, cls: 'btn-yellow', disabled: G.S.coins < cost, onClick: () => {
          if (G.S.coins < cost) return;
          G.S.coins -= cost; list[i] = null; G.save(); renderSlots(); openChest(c.type);
        } },
      ], { replace: true });
    if (body) body.querySelector('.chest-svg').classList.add('wobble');
  }

  // ---------- Sandık açma ----------
  let opening = null;
  function rollContents(type) {
    const def = D.CHESTS[type];
    const total = def.odds.reduce((a, b) => a + b, 0);
    const picks = [];
    for (let i = 0; i < def.cubes; i++) {
      let x = Math.random() * total, ri = 0;
      for (; ri < 5; ri++) { x -= def.odds[ri]; if (x < 0) break; }
      picks.push(G.pickOne(D.CUBES.filter(c => c.rarity === D.RARITY_ORDER[Math.min(ri, 4)])));
    }
    if (def.min) {
      const minOrder = D.RARITIES[def.min].order;
      if (!picks.some(p => D.RARITIES[p.rarity].order >= minOrder)) picks[picks.length - 1] = G.pickOne(D.CUBES.filter(c => c.rarity === def.min));
    }
    // En nadir olan en sona: heyecan sona kalsın
    return picks.sort((a, b) => D.RARITIES[a.rarity].order - D.RARITIES[b.rarity].order);
  }
  function openChest(type) {
    const def = D.CHESTS[type];
    const cubes = rollContents(type);
    const results = cubes.map(c => ({ def: c, got: G.addCube(c.id) }));
    G.addCoins(def.coins);
    G.bump('packs');
    G.addXP(10 + def.cubes * 2);
    G.save();
    opening = { type, results, i: -1, coins: def.coins, stage: 'closed' };
    const ov = $('chest-open');
    $('co-chest').innerHTML = G.chestSVG(type, 'idle');
    $('co-chest').hidden = false;
    $('co-card').hidden = true; $('co-summary').hidden = true;
    $('co-hint').textContent = 'Açmak için dokun';
    $('co-left').textContent = `${def.name} · ${results.length} küp`;
    ov.hidden = false;
  }
  G.openChestType = openChest;

  async function step() {
    if (!opening) return;
    const o = opening;
    if (o.stage === 'closed') {
      o.stage = 'busy';
      const svg = $('co-chest').querySelector('.chest-svg');
      svg.classList.remove('idle'); svg.classList.add('shake'); Snd.shake();
      await G.wait(480);
      svg.classList.remove('shake'); svg.classList.add('open'); Snd.tear();
      window.FX.burstAt(svg, D.CHESTS[o.type].color, 30, 8);
      await G.wait(380);
      o.stage = 'cards';
      // önce jetonlar
      showCard({ coins: o.coins });
      return;
    }
    if (o.stage === 'cards') {
      o.i++;
      if (o.i >= o.results.length) return summary();
      showCard(o.results[o.i]);
    }
  }
  function showCard(item) {
    const o = opening;
    $('co-chest').hidden = true;
    const card = $('co-card');
    card.hidden = false;
    card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip');
    if (item.coins) {
      card.style.setProperty('--rc', '#ffc928');
      card.innerHTML = `<div class="co-coins"><i class="coin"></i><i class="coin"></i><i class="coin"></i></div><b class="co-name">+${item.coins} jeton</b>`;
      window.FX.coins(8, card);
    } else {
      const r = D.RARITIES[item.def.rarity];
      card.style.setProperty('--rc', r.color);
      card.innerHTML = `<span class="rarity-tag" style="--glow:${r.color}">${r.name}</span><canvas></canvas>${G.brandChip(item.def)}<b class="co-name">${esc(item.def.model)}</b>
        <span class="co-sub">${item.got.isNew ? '<b class="good">YENİ!</b>' : `Seviye ${item.got.lvl}`}</span>`;
      R.drawPuzzle(card.querySelector('canvas'), item.def);
      Snd.reveal(r.order);
      if (r.order >= 2) window.FX.burstAt(card, r.color, 16 + r.order * 10, 6);
      if (r.order >= 3) window.FX.confetti(60);
    }
    const left = o.results.length - Math.max(0, o.i + 1);
    $('co-left').textContent = left > 0 ? `${left} küp kaldı` : 'Son küp!';
    $('co-hint').textContent = 'Devam etmek için dokun';
  }
  function summary() {
    const o = opening;
    o.stage = 'done';
    $('co-card').hidden = true;
    $('co-hint').textContent = '';
    $('co-left').textContent = '';
    const s = $('co-summary');
    s.hidden = false;
    s.innerHTML = `<h3>${esc(D.CHESTS[o.type].name)}</h3><div class="co-grid"></div><p>+${o.coins} jeton</p>`;
    const grid = s.querySelector('.co-grid');
    o.results.forEach(r => {
      const it = h('div', 'co-mini', `<canvas></canvas>${r.got.isNew ? '<em>YENİ</em>' : ''}`);
      it.style.setProperty('--rc', D.RARITIES[r.def.rarity].color);
      grid.appendChild(it);
      requestAnimationFrame(() => R.drawPuzzle(it.querySelector('canvas'), r.def));
    });
    const b = h('button', 'btn btn-yellow btn-big', 'Harika!');
    b.onclick = (e) => { e.stopPropagation(); close(); };
    s.appendChild(b);
  }
  function close() {
    $('chest-open').hidden = true; opening = null;
    if (G.current === 'home') G.renderHome();
    if (G.current === 'inv') G.renderInv();
  }
  G.isChestOpen = () => !!opening;
  G.closeChest = () => { if (opening && opening.stage === 'done') close(); };
  $('chest-open').addEventListener('click', () => { if (opening && opening.stage !== 'done' && opening.stage !== 'busy') step(); });
})();
