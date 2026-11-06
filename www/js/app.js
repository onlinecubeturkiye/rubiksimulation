// Küp Arena: mağaza, paket açma, envanter, savaş, sıralama ve çözme ödülleri.
(function () {
  const D = window.GameData, R = window.Render;
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickOne = (arr) => arr[(Math.random() * arr.length) | 0];
  const cubeById = (id) => D.CUBES.find(c => c.id === id);

  // ---------- Kayıt ----------
  const KEY = 'kup-arena-v1';
  const GIFT_MS = 20 * 3600 * 1000;
  const defaults = () => ({
    name: 'Oyuncu', coins: 300, trophies: 0, inv: { c3: 1 }, team: ['c3'], lastGift: 0,
    stats: { wins: 0, losses: 0, packs: 0, solves: 0 }, best: {},
  });
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.inv) return Object.assign(defaults(), s); } catch (e) {}
    return defaults();
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    $('coins').textContent = S.coins;
    $('trophies').textContent = S.trophies;
  }

  const level = (id) => Math.min(10, S.inv[id] || 0);
  function statsOf(def, lvl) { const m = 1 + 0.1 * (lvl - 1); return { hp: Math.round(def.hp * m), atk: Math.round(def.atk * m) }; }
  const solvable = (def) => def.type === 'cube';

  // ---------- Bildirim ----------
  let toastT = 0;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2200);
  }

  // ---------- Pencere ----------
  function modal(title, bodyHtml, actions) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = bodyHtml;
    const row = $('modal-actions'); row.innerHTML = '';
    actions.forEach(a => {
      const b = h('button', 'btn ' + (a.cls || ''), esc(a.label));
      b.disabled = !!a.disabled;
      b.onclick = () => { if (a.keep !== true) closeModal(); a.onClick && a.onClick(); };
      row.appendChild(b);
    });
    $('modal').hidden = false;
    return $('modal-body');
  }
  function closeModal() { $('modal').hidden = true; }
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

  // ---------- Sekmeler ----------
  let current = 'shop';
  function show(tab) {
    if (current === 'battle' && B && tab !== 'battle') { toast('Savaş bitmeden çıkamazsın'); return; }
    current = tab;
    document.querySelectorAll('.tab').forEach(s => (s.hidden = s.id !== 'tab-' + tab));
    document.querySelectorAll('#tabs button').forEach(b => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    window.Sim.active = tab === 'solve';
    ({ shop: renderShop, inv: renderInv, battle: renderLobby, rank: renderRank, solve: renderSolve })[tab]();
    $('tab-' + tab).parentElement.scrollTop = 0;
  }
  $('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.tab); });

  // ---------- Paket görseli ----------
  function zigzag(teeth, depth, bottom) {
    const pts = [];
    for (let i = 0; i <= teeth * 2; i++) {
      const x = (i / (teeth * 2)) * 100;
      const y = i % 2 ? depth : 0;
      pts.push(bottom ? `${100 - x}% ${100 - y}%` : `${x}% ${y}%`);
    }
    return pts;
  }
  const CAP_CLIP = `polygon(${zigzag(14, 26, false).join(',')}, 100% 100%, 0% 100%)`;
  const MAIN_CLIP = `polygon(0% 0%, 100% 0%, ${zigzag(14, 3, true).join(',')})`;
  function makePack(pack, w) {
    const el = h('div', 'pack');
    if (w) el.style.setProperty('--w', w);
    el.style.setProperty('--cap', pack.cap);
    el.style.setProperty('--bg-pack', pack.bg);
    const cap = h('div', 'pack-cap'); cap.style.clipPath = CAP_CLIP;
    const main = h('div', 'pack-main'); main.style.clipPath = MAIN_CLIP;
    main.innerHTML = `<div class="pack-logo">Küp<span>Arena</span></div><canvas class="pack-art"></canvas><div class="pack-title">${esc(pack.name).replace(' ', '<br>')}</div>`;
    el.append(cap, main);
    requestAnimationFrame(() => R.drawPackArt(main.querySelector('canvas'), pack.art.map(cubeById)));
    return el;
  }

  // ---------- Mağaza ----------
  function renderShop() {
    const wrap = $('packs'); wrap.innerHTML = '';
    D.PACKS.forEach(p => {
      const card = h('div', 'pack-card');
      card.appendChild(makePack(p));
      const odds = D.RARITY_ORDER.map((r, i) => p.odds[i] ? `<b style="color:${D.RARITIES[r].color}">${D.RARITIES[r].name}</b> %${p.odds[i]}` : '').filter(Boolean).join(' · ');
      card.appendChild(h('div', 'odds', odds));
      const b = h('button', 'btn btn-yellow', `<i class="coin"></i>${p.price}`);
      b.setAttribute('aria-label', `${p.name} satın al, ${p.price} jeton`);
      b.onclick = () => buy(p);
      card.appendChild(b);
      wrap.appendChild(card);
    });
    renderGift();
  }
  function renderGift() {
    const left = S.lastGift + GIFT_MS - Date.now();
    const btn = $('gift-btn');
    if (left <= 0) { $('gift-text').textContent = '150 jeton seni bekliyor.'; btn.disabled = false; }
    else {
      const hh = Math.floor(left / 3600000), mm = Math.floor((left % 3600000) / 60000);
      $('gift-text').textContent = `Sonraki hediye ${hh} sa ${mm} dk sonra.`; btn.disabled = true;
    }
  }
  $('gift-btn').onclick = () => {
    if (S.lastGift + GIFT_MS > Date.now()) return;
    S.lastGift = Date.now(); S.coins += 150; save(); renderGift(); toast('+150 jeton!');
  };
  setInterval(() => { if (current === 'shop') renderGift(); }, 30000);

  function roll(pack) {
    const total = pack.odds.reduce((a, b) => a + b, 0);
    let x = Math.random() * total, ri = 0;
    for (; ri < pack.odds.length; ri++) { x -= pack.odds[ri]; if (x < 0) break; }
    const rarity = D.RARITY_ORDER[Math.min(ri, 4)];
    return pickOne(D.CUBES.filter(c => c.rarity === rarity));
  }

  let lastPack = null;
  function buy(pack) {
    if (S.coins < pack.price) { toast(`Yeterli jeton yok (${pack.price} gerekli)`); return; }
    S.coins -= pack.price;
    const def = roll(pack);
    const isNew = !S.inv[def.id];
    S.inv[def.id] = (S.inv[def.id] || 0) + 1;
    S.stats.packs++;
    save();
    lastPack = pack;
    openPack(pack, def, isNew);
  }

  // ---------- Paket açma ----------
  let opening = null;
  function openPack(pack, def, isNew) {
    opening = { pack, def, isNew, stage: 'pack' };
    const slot = $('open-slot'); slot.innerHTML = '';
    const el = makePack(pack); el.classList.add('idle');
    slot.appendChild(el);
    slot.hidden = false;
    $('reveal').hidden = true; $('open-actions').hidden = true; $('open-hint').hidden = false;
    $('rays').className = 'rays';
    $('opener').hidden = false;
  }
  $('open-slot').addEventListener('click', async () => {
    if (!opening || opening.stage !== 'pack') return;
    opening.stage = 'tearing';
    const el = $('open-slot').firstChild;
    $('open-hint').hidden = true;
    el.classList.remove('idle'); el.classList.add('shake');
    await wait(500);
    el.classList.remove('shake'); el.classList.add('torn');
    await wait(650);
    reveal();
  });
  function reveal() {
    const { def, isNew } = opening;
    const r = D.RARITIES[def.rarity];
    $('open-slot').hidden = true;
    const rv = $('reveal');
    rv.style.setProperty('--glow', r.color);
    $('rays').style.setProperty('--ray', r.color);
    $('rays').className = 'rays on';
    $('rv-rarity').textContent = r.name;
    $('rv-name').textContent = def.name;
    $('rv-sub').textContent = isNew ? 'Yeni! Koleksiyonuna eklendi.' : `Tekrar geldi: seviye ${level(def.id)} oldu.`;
    rv.hidden = false;
    rv.style.animation = 'none'; void rv.offsetWidth; rv.style.animation = '';
    R.drawPuzzle($('rv-canvas'), def);
    $('open-again').textContent = `Bir tane daha (${opening.pack.price})`;
    $('open-again').disabled = S.coins < opening.pack.price;
    $('open-actions').hidden = false;
    opening.stage = 'done';
  }
  function closeOpener() { $('opener').hidden = true; opening = null; if (current === 'shop') renderShop(); }
  $('open-ok').onclick = closeOpener;
  $('open-again').onclick = () => { closeOpener(); if (lastPack) buy(lastPack); };

  // ---------- Envanter ----------
  function sortedCatalog() {
    return D.CUBES.slice().sort((a, b) => D.RARITIES[b.rarity].order - D.RARITIES[a.rarity].order);
  }
  function renderInv() {
    const owned = D.CUBES.filter(c => S.inv[c.id]).length;
    $('inv-progress').textContent = `${owned}/${D.CUBES.length} keşfedildi`;
    renderTeamSlots();
    const grid = $('inv-grid'); grid.innerHTML = '';
    const list = sortedCatalog().sort((a, b) => (S.inv[b.id] ? 1 : 0) - (S.inv[a.id] ? 1 : 0));
    list.forEach(def => {
      const have = S.inv[def.id] || 0;
      const card = h('button', 'card' + (have ? '' : ' locked') + (S.team.includes(def.id) ? ' in-team' : ''));
      card.style.setProperty('--rc', D.RARITIES[def.rarity].color);
      card.innerHTML = `<canvas></canvas><span class="nm">${have ? esc(def.name) : '???'}</span><span class="rr">${D.RARITIES[def.rarity].name}</span>` +
        (have ? `<span class="lv">Sv ${level(def.id)}</span>${have > 1 ? `<span class="cnt">×${have}</span>` : ''}` : '');
      if (have) card.onclick = () => openDetail(def);
      else card.disabled = true;
      grid.appendChild(card);
      requestAnimationFrame(() => R.drawPuzzle(card.querySelector('canvas'), def, { unknown: !have }));
    });
  }
  function renderTeamSlots() {
    const wrap = $('team-slots'); wrap.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const id = S.team[i];
      const def = id && cubeById(id);
      const slot = h('button', 'slot' + (def ? ' filled' : ''), def ? `<canvas></canvas><span>${esc(def.name)}</span>` : '<span>Boş yer</span>');
      if (def) { slot.onclick = () => openDetail(def); requestAnimationFrame(() => R.drawPuzzle(slot.querySelector('canvas'), def)); }
      else slot.disabled = true;
      wrap.appendChild(slot);
    }
  }
  function openDetail(def) {
    const r = D.RARITIES[def.rarity], lv = level(def.id), st = statsOf(def, lv), have = S.inv[def.id];
    const inTeam = S.team.includes(def.id);
    const sk = D.SKILLS[def.skill];
    const body = modal(def.name, `
      <span class="rarity-tag" style="--glow:${r.color}">${r.name}</span>
      <canvas></canvas>
      <div class="stats">
        <div><span class="label">Seviye</span><b>${lv}</b></div>
        <div><span class="label">Can</span><b>${st.hp}</b></div>
        <div><span class="label">Saldırı</span><b>${st.atk}</b></div>
      </div>
      <div class="skill"><b>${esc(sk.name)}</b>: ${esc(sk.desc)}</div>
      <p class="note">${have} adet var. ${lv < 10 ? 'Bir kopya daha gelirse seviye atlar.' : 'En yüksek seviyede.'}</p>`,
      [
        { label: inTeam ? 'Takımdan çıkar' : (S.team.length >= 3 ? 'Takım dolu' : 'Takıma ekle'), cls: 'btn-pink', disabled: !inTeam && S.team.length >= 3,
          onClick: () => { toggleTeam(def.id); renderInv(); } },
        { label: `Sat (+${r.sell})`, disabled: have < 2, onClick: () => sell(def) },
        ...(solvable(def) ? [{ label: 'Çöz', cls: 'btn-yellow', onClick: () => { solveId = def.id; show('solve'); } }] : []),
      ]);
    R.drawPuzzle(body.querySelector('canvas'), def);
  }
  function toggleTeam(id) {
    const i = S.team.indexOf(id);
    if (i >= 0) S.team.splice(i, 1); else if (S.team.length < 3) S.team.push(id);
    save();
  }
  function sell(def) {
    if ((S.inv[def.id] || 0) < 2) return;
    S.inv[def.id]--; S.coins += D.RARITIES[def.rarity].sell; save();
    toast(`${def.name} satıldı: +${D.RARITIES[def.rarity].sell} jeton`);
    renderInv();
  }

  // ---------- Rakipler ve sıralama ----------
  function dayDrift(i) { const day = Math.floor(Date.now() / 86400000); return Math.round(Math.sin(day * 1.7 + i * 2.3) * 35); }
  function botList() { return D.BOTS.map((b, i) => ({ name: b.name, tr: Math.max(0, b.tr + dayDrift(i)) })); }
  function makeOpponent() {
    const bots = botList().sort((a, b) => Math.abs(a.tr - S.trophies) - Math.abs(b.tr - S.trophies)).slice(0, 6);
    const bot = pickOne(bots);
    const t = bot.tr;
    const w = [Math.max(6, 60 - t / 40), 30, 8 + t / 120, 2 + t / 300, t > 1500 ? t / 1000 : 0];
    const size = Math.max(1, Math.min(3, S.team.length || 1));
    const team = [];
    for (let i = 0; i < size; i++) {
      let x = Math.random() * w.reduce((a, b) => a + b, 0), ri = 0;
      for (; ri < 5; ri++) { x -= w[ri]; if (x < 0) break; }
      const def = pickOne(D.CUBES.filter(c => c.rarity === D.RARITY_ORDER[Math.min(ri, 4)]));
      const lvl = Math.max(1, Math.min(10, 1 + Math.floor(t / 280) + ((Math.random() * 3) | 0) - 1));
      team.push({ id: def.id, lvl });
    }
    return { name: bot.name, tr: bot.tr, team };
  }
  function renderRank() {
    const list = botList().concat([{ name: S.name, tr: S.trophies, you: true }]).sort((a, b) => b.tr - a.tr);
    const pos = list.findIndex(x => x.you) + 1;
    $('me-card').innerHTML = `<div><span class="label" style="color:#fff">Sıran</span><div class="big-num">#${pos}</div></div>
      <div style="text-align:right"><div style="font-size:1.1rem">${esc(S.name)}</div><div class="note" style="color:#ffe">${S.trophies} kupa · ${S.stats.wins} galibiyet</div></div>`;
    const ol = $('rank'); ol.innerHTML = '';
    list.forEach((x, i) => {
      const li = h('li', x.you ? 'you' : '', `<span class="pos">${i + 1}</span><span class="who">${esc(x.name)}${x.you ? ' (sen)' : ''}</span><span class="tr">${x.tr}</span>`);
      ol.appendChild(li);
    });
  }
  $('rename').onclick = () => {
    const body = modal('Adını değiştir', `<input class="field" id="name-input" maxlength="16" value="${esc(S.name)}" aria-label="Oyuncu adı">`, [
      { label: 'Vazgeç' },
      { label: 'Kaydet', cls: 'btn-yellow', onClick: () => {
        const v = ($('name-input').value || '').trim().slice(0, 16);
        if (v) { S.name = v; save(); renderRank(); }
      } },
    ]);
    const inp = body.querySelector('input'); inp.focus(); inp.select();
  };

  // ---------- Savaş ----------
  let opp = null, B = null;
  function miniRow(el, items) {
    el.innerHTML = '';
    if (!items.length) { el.innerHTML = '<span class="empty">Takım boş</span>'; return; }
    items.forEach(def => { const c = h('canvas'); el.appendChild(c); requestAnimationFrame(() => R.drawPuzzle(c, def)); });
  }
  function renderLobby() {
    if (B) return;
    $('lobby').hidden = false; $('arena').hidden = true;
    if (!opp) opp = makeOpponent();
    miniRow($('my-team'), S.team.map(cubeById));
    miniRow($('opp-team'), opp.team.map(x => cubeById(x.id)));
    $('opp-name').textContent = opp.name;
    $('opp-tr').textContent = opp.tr + ' kupa';
    $('fight').disabled = !S.team.length;
  }
  $('opp-new').onclick = () => { opp = makeOpponent(); renderLobby(); };
  $('fight').onclick = () => {
    if (!S.team.length) { toast('Önce Envanter’den takımına bulmaca ekle'); return; }
    startFight();
  };

  const mkF = (def, lvl) => { const st = statsOf(def, lvl); return { def, lvl, hp: st.hp, max: st.hp, atk: st.atk, cd: 0, shield: 0, stun: false }; };
  const cur = (side) => B[side][B[side === 'me' ? 'mi' : 'ei']];

  function startFight() {
    B = { me: S.team.map(id => mkF(cubeById(id), level(id))), en: opp.team.map(x => mkF(cubeById(x.id), x.lvl)), mi: 0, ei: 0, busy: false };
    $('lobby').hidden = true; $('arena').hidden = false;
    drawFighter('me', true); drawFighter('en', true);
    say(`<b>${esc(opp.name)}</b> ile savaş başladı!`);
    updateActs();
  }
  function drawFighter(side, full) {
    const el = $(side === 'me' ? 'f-me' : 'f-enemy');
    const f = cur(side), list = B[side];
    if (full || !el.querySelector('canvas')) {
      el.innerHTML = `<canvas></canvas><div class="info"><div class="nm"></div><div class="meta"></div><div class="hp"><i></i></div><div class="hp-txt"></div><div class="bench"></div></div>`;
      R.drawPuzzle(el.querySelector('canvas'), f.def);
    }
    el.querySelector('.nm').textContent = (side === 'en' ? opp.name + ': ' : '') + f.def.name;
    const fx = [];
    if (f.shield) fx.push(`<span class="fx">Kalkan ×${f.shield}</span>`);
    if (f.stun) fx.push('<span class="fx">Sersem</span>');
    el.querySelector('.meta').innerHTML = `<span>Sv ${f.lvl}</span><span>Saldırı ${f.atk}</span>${fx.join('')}`;
    const pct = Math.max(0, f.hp / f.max * 100);
    const bar = el.querySelector('.hp i'); bar.style.width = pct + '%'; bar.classList.toggle('low', pct < 30);
    el.querySelector('.hp-txt').textContent = `${f.hp} / ${f.max} can`;
    el.querySelector('.bench').innerHTML = list.map(x => `<i class="${x.hp <= 0 ? 'ko' : ''}"></i>`).join('');
  }
  function say(html) { $('blog').innerHTML = `<span>${html}</span>`; }
  function updateActs() {
    const me = cur('me');
    const sk = D.SKILLS[me.def.skill];
    $('act-skill').textContent = me.cd > 0 ? `${sk.name} (${me.cd})` : sk.name;
    $('act-atk').disabled = B.busy;
    $('act-skill').disabled = B.busy || me.cd > 0;
  }
  function anim(side, cls) {
    const el = $(side === 'me' ? 'f-me' : 'f-enemy');
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 400);
  }
  function floatNum(side, txt, heal) {
    const el = $(side === 'me' ? 'f-me' : 'f-enemy');
    const f = h('span', 'float' + (heal ? ' heal' : ''), txt);
    el.appendChild(f); setTimeout(() => f.remove(), 900);
  }
  function hit(dSide, dmg) {
    const d = cur(dSide);
    if (d.shield > 0) { dmg = Math.round(dmg / 2); d.shield--; }
    d.hp = Math.max(0, d.hp - dmg);
    anim(dSide, 'hit'); floatNum(dSide, '-' + dmg);
    return dmg;
  }
  const rollDmg = (atk) => { let d = Math.round(atk * rand(0.85, 1.15)); const crit = Math.random() < 0.1; if (crit) d = Math.round(d * 1.5); return { d, crit }; };

  async function doAction(aSide, kind) {
    const dSide = aSide === 'me' ? 'en' : 'me';
    const a = cur(aSide);
    const who = `<b>${esc(a.def.name)}</b>`;
    anim(aSide, 'lunge');
    await wait(180);
    if (kind === 'atk') {
      const { d, crit } = rollDmg(a.atk);
      const dealt = hit(dSide, d);
      say(`${who} saldırdı: ${dealt} hasar${crit ? ' (kritik!)' : ''}`);
    } else {
      const sk = D.SKILLS[a.def.skill];
      a.cd = 3;
      if (a.def.skill === 'double') { const dealt = hit(dSide, rollDmg(a.atk).d * 2); say(`${who} ${sk.name} kullandı: ${dealt} hasar!`); }
      else if (a.def.skill === 'heal') { const v = Math.min(a.max - a.hp, Math.round(a.max * 0.35)); a.hp += v; floatNum(aSide, '+' + v, true); say(`${who} ${sk.name} ile ${v} can yeniledi`); }
      else if (a.def.skill === 'stun') { const dealt = hit(dSide, Math.round(rollDmg(a.atk).d * 0.6)); cur(dSide).stun = true; say(`${who} ${sk.name} kullandı: ${dealt} hasar, rakip sersemledi!`); }
      else if (a.def.skill === 'shield') { a.shield = 2; const dealt = hit(dSide, Math.round(rollDmg(a.atk).d * 0.5)); say(`${who} ${sk.name} açtı ve ${dealt} hasar verdi`); }
      else if (a.def.skill === 'drain') { const dealt = hit(dSide, Math.round(rollDmg(a.atk).d * 1.2)); const v = Math.min(a.max - a.hp, Math.round(dealt / 2)); a.hp += v; if (v) floatNum(aSide, '+' + v, true); say(`${who} ${sk.name}: ${dealt} hasar, ${v} can aldı`); }
    }
    drawFighter('me'); drawFighter('en');
    await wait(550);
    return checkKO(dSide);
  }
  // true dönerse savaş bitti
  async function checkKO(side) {
    if (cur(side).hp > 0) return false;
    const idxKey = side === 'me' ? 'mi' : 'ei';
    say(`<b>${esc(cur(side).def.name)}</b> oyun dışı!`);
    await wait(600);
    B[idxKey]++;
    if (B[idxKey] >= B[side].length) { endFight(side === 'en'); return true; }
    drawFighter(side, true);
    say(`${side === 'me' ? 'Sıradaki bulmacan' : 'Rakip yeni bulmaca çıkardı'}: <b>${esc(cur(side).def.name)}</b>`);
    await wait(500);
    return false;
  }
  function startTurn(side) { const f = cur(side); if (f.cd > 0) f.cd--; }
  async function enemyTurn() {
    startTurn('en');
    const e = cur('en');
    if (e.stun) { e.stun = false; say(`<b>${esc(e.def.name)}</b> sersem, turu kaçırdı`); drawFighter('en'); await wait(800); return false; }
    let kind = 'atk';
    if (e.cd === 0) {
      if (e.def.skill === 'heal') kind = e.hp < e.max * 0.5 ? 'skill' : 'atk';
      else kind = Math.random() < 0.6 ? 'skill' : 'atk';
    }
    return doAction('en', kind);
  }
  async function playerAct(kind) {
    if (!B || B.busy) return;
    B.busy = true; updateActs();
    if (await doAction('me', kind)) return;
    if (await enemyTurn()) return;
    // Sersemlediysen rakip bir kez daha oynar
    while (B && cur('me').stun) {
      cur('me').stun = false;
      say(`<b>${esc(cur('me').def.name)}</b> sersem, turu kaçırdın`); drawFighter('me');
      await wait(800);
      if (await enemyTurn()) return;
    }
    startTurn('me');
    B.busy = false; updateActs();
  }
  $('act-atk').onclick = () => playerAct('atk');
  $('act-skill').onclick = () => playerAct('skill');

  function endFight(won) {
    const coins = won ? 50 + Math.round(opp.tr / 40) : 10;
    const tr = won ? 25 + ((Math.random() * 7) | 0) : -Math.min(15, S.trophies);
    S.coins += coins; S.trophies += tr;
    if (won) S.stats.wins++; else S.stats.losses++;
    save();
    B = null; opp = null;
    modal(won ? 'Kazandın!' : 'Kaybettin', `
      <div class="big-num">${tr >= 0 ? '+' : ''}${tr} kupa</div>
      <p class="note">+${coins} jeton kazandın.${won ? '' : ' Daha güçlü küpler için paket açmayı dene.'}</p>`,
      [{ label: 'Lobiye dön', cls: 'btn-yellow', onClick: renderLobby }]);
    renderLobby();
  }

  // ---------- Çözme ----------
  const SOLVE_REWARD = { 2: 30, 3: 80, 4: 150, 5: 250, 6: 400, 7: 600 };
  const FAST = { 2: 60e3, 3: 180e3, 4: 420e3, 5: 720e3, 6: 1200e3, 7: 1800e3 };
  let solveId = 'c3', loadedId = null;
  function renderSolve() {
    const owned = D.CUBES.filter(c => S.inv[c.id] && solvable(c));
    if (!owned.find(c => c.id === solveId)) solveId = owned.length ? owned[0].id : 'c3';
    const pick = $('solve-pick'); pick.innerHTML = '';
    owned.forEach(def => {
      const b = h('button', '', '<canvas></canvas>');
      b.setAttribute('aria-pressed', String(def.id === solveId));
      b.setAttribute('aria-label', def.name);
      b.title = def.name;
      b.onclick = () => {
        if (window.Sim.isBusy() && !confirmSwitch) { confirmSwitch = true; toast('Süre işliyor. Değiştirmek için tekrar dokun.'); setTimeout(() => (confirmSwitch = false), 2500); return; }
        confirmSwitch = false; solveId = def.id; renderSolve();
      };
      pick.appendChild(b);
      requestAnimationFrame(() => R.drawPuzzle(b.querySelector('canvas'), def));
    });
    const def = cubeById(solveId);
    if (loadedId !== solveId) { loadedId = solveId; window.Sim.load(def.n, D.PALETTES[def.pal]); }
    else requestAnimationFrame(() => window.Sim.resize());
    $('sim-reward').textContent = `Çözersen +${SOLVE_REWARD[def.n]} jeton`;
  }
  let confirmSwitch = false;
  window.Sim.onSolved = ({ n, ms, moves }) => {
    const base = SOLVE_REWARD[n] || 50;
    const fast = ms < FAST[n];
    const coins = base + (fast ? Math.round(base / 2) : 0);
    const prevBest = S.best[n];
    const record = !prevBest || ms < prevBest;
    if (record) S.best[n] = ms;
    S.coins += coins; S.stats.solves++;
    save();
    modal('Çözüldü!', `
      <div class="big-num">${window.Sim.fmt(ms)}</div>
      <p class="note">${n}×${n} · ${moves} hamle${record ? ' · Yeni rekor!' : ` · Rekorun ${window.Sim.fmt(prevBest)}`}</p>
      <p>+${coins} jeton${fast ? ' (hız bonusu dahil)' : ''}</p>`,
      [{ label: 'Kapat' }, { label: 'Yeniden karıştır', cls: 'btn-yellow', onClick: () => $('sim-scramble').click() }]);
  };

  // ---------- Başlat ----------
  save();
  show('shop');
})();
