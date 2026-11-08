// Çekirdek: kayıt, ekonomi, oyuncu seviyesi, görevler, başarımlar, pencere ve bildirimler.
(function () {
  const D = window.GameData;
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickOne = (arr, rng = Math.random) => arr[(rng() * arr.length) | 0];
  const cubeById = (id) => D.CUBES.find(c => c.id === id);
  const dayIndex = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  function seeded(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---------- Kayıt ----------
  const KEY = 'kup-arena-v1';
  const STAT_KEYS = ['wins', 'losses', 'packs', 'solves', 'skills', 'stages', 'upgrades', 'floors', 'arena', 'pvp', 'bigSolve', 'towerBest'];
  function defaults() {
    const stats = {}; STAT_KEYS.forEach(k => (stats[k] = 0));
    return {
      v: 2, name: 'Oyuncu', coins: 200, trophies: 0, level: 1, xp: 0,
      inv: { c3: 1, c2: 1 }, lvl: { c3: 1, c2: 1 }, team: ['c3', 'c2'],
      packs: { klasik: 0, usta: 0, efsane: 0 },
      lastGift: 0, lastFree: 0, dealDay: -1,
      stats, best: {}, adv: { stars: {}, bosses: [] }, towerCheckpoint: 0,
      quests: null, ach: {}, settings: { sound: true }, seenIntro: false, dailyDone: -1,
    };
  }
  function migrate(s) {
    const d = defaults();
    const out = Object.assign(d, s);
    out.stats = Object.assign(defaults().stats, s.stats || {});
    out.packs = Object.assign(d.packs, s.packs || {});
    out.adv = Object.assign({ stars: {}, bosses: [] }, s.adv || {});
    out.settings = Object.assign({ sound: true }, s.settings || {});
    if (!s.lvl) { out.lvl = {}; for (const id in out.inv) out.lvl[id] = Math.min(10, out.inv[id]); }
    if (!s.v) out.seenIntro = true; // eski oyuncular rehberi tekrar görmesin
    out.team = (out.team || []).filter(id => out.inv[id]).slice(0, 3);
    out.v = 2;
    return out;
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.inv) return migrate(s); } catch (e) {}
    return defaults();
  }
  const G = window.G = {};
  G.S = load();
  G.save = function () {
    checkAchievements();
    try { localStorage.setItem(KEY, JSON.stringify(G.S)); } catch (e) {}
    renderHeader();
  };
  G.resetSave = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };
  G.exportSave = () => btoa(unescape(encodeURIComponent(JSON.stringify(G.S))));
  G.importSave = function (code) {
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (!s || !s.inv) return false;
      G.S = migrate(s); G.save(); return true;
    } catch (e) { return false; }
  };

  // ---------- Bulmacalar ----------
  G.level = (id) => G.S.inv[id] ? (G.S.lvl[id] || 1) : 0;
  G.statsOf = (def, lvl, mult = 1) => { const m = (1 + 0.1 * (lvl - 1)) * mult; return { hp: Math.round(def.hp * m), atk: Math.round(def.atk * m) }; };
  G.addCube = function (id) {
    const isNew = !G.S.inv[id];
    G.S.inv[id] = (G.S.inv[id] || 0) + 1;
    if (isNew) G.S.lvl[id] = 1; else G.S.lvl[id] = Math.min(10, (G.S.lvl[id] || 1) + 1);
    if (isNew && G.S.team.length < 3) G.S.team.push(id);
    return { isNew, lvl: G.S.lvl[id] };
  };
  G.upgradeCost = (def) => Math.round(40 * G.level(def.id) * (1 + D.RARITIES[def.rarity].order * 0.5));
  G.rollPack = function (pack) {
    const total = pack.odds.reduce((a, b) => a + b, 0);
    let x = Math.random() * total, ri = 0;
    for (; ri < pack.odds.length; ri++) { x -= pack.odds[ri]; if (x < 0) break; }
    const rarity = D.RARITY_ORDER[Math.min(ri, 4)];
    return pickOne(D.CUBES.filter(c => c.rarity === rarity));
  };
  G.typeOf = (def) => D.TYPE_OF[def.type];

  // ---------- Jeton ve deneyim ----------
  G.addCoins = function (n) { G.S.coins += n; if (n > 0) window.Sound.coin(); };
  G.xpNeed = (lv) => 100 + 60 * (lv - 1);
  G.addXP = function (n) {
    const S = G.S;
    S.xp += n;
    while (S.xp >= G.xpNeed(S.level)) {
      S.xp -= G.xpNeed(S.level);
      S.level++;
      const coins = 100 + 20 * S.level;
      S.coins += coins;
      const pack = S.level % 5 === 0 ? 'usta' : null;
      if (pack) S.packs.usta++;
      G.notify(`Seviye ${S.level}!`, `<div class="big-num">Sv ${S.level}</div><p>+${coins} jeton${pack ? ' ve bedava <b>Usta Paketi</b>' : ''}</p>`);
      window.Sound.win();
    }
  };

  // ---------- Sayaçlar, görevler, başarımlar ----------
  G.bump = function (stat, n = 1) { G.S.stats[stat] = (G.S.stats[stat] || 0) + n; };
  G.totalStars = () => Object.values(G.S.adv.stars).reduce((a, b) => a + b, 0);
  function statValue(name) {
    const S = G.S;
    switch (name) {
      case 'collection': return D.CUBES.filter(c => S.inv[c.id]).length;
      case 'worlds': return S.adv.bosses.length;
      case 'stars': return G.totalStars();
      case 'trophies': return S.trophies;
      case 'maxLevel': return Math.max(0, ...Object.keys(S.inv).map(G.level));
      case 'mythics': return D.CUBES.filter(c => c.rarity === 'mythic' && S.inv[c.id]).length;
      case 'fast3': return S.best[3] && S.best[3] < 120000 ? 1 : 0;
      case 'flash3': return S.best[3] && S.best[3] < 60000 ? 1 : 0;
      default: return S.stats[name] || 0;
    }
  }
  G.statValue = statValue;
  function checkAchievements() {
    for (const a of D.ACHIEVEMENTS) {
      if (G.S.ach[a.id] || statValue(a.stat) < a.target) continue;
      G.S.ach[a.id] = true;
      G.S.coins += a.reward;
      G.toast(`Başarım: ${a.name} (+${a.reward} jeton)`);
    }
  }
  G.achProgress = (a) => Math.min(a.target, statValue(a.stat));

  G.ensureQuests = function () {
    const day = dayIndex();
    if (G.S.quests && G.S.quests.day === day) return G.S.quests;
    const rng = seeded(day * 7919);
    const pool = D.QUESTS.slice();
    const list = [];
    while (list.length < 3) list.push(pool.splice((rng() * pool.length) | 0, 1)[0]);
    G.S.quests = { day, bonus: false, list: list.map(q => ({ id: q.id, start: statValue(q.stat), claimed: false })) };
    G.save();
    return G.S.quests;
  };
  G.questInfo = function (q) {
    const def = D.QUESTS.find(x => x.id === q.id);
    const progress = Math.min(def.target, statValue(def.stat) - q.start);
    return { def, progress, done: progress >= def.target };
  };
  G.questsClaimable = function () {
    const qs = G.ensureQuests();
    const any = qs.list.some(q => !q.claimed && G.questInfo(q).done);
    const bonus = !qs.bonus && qs.list.every(q => q.claimed);
    return any || bonus;
  };

  // ---------- Üst bar ----------
  function renderHeader() {
    const S = G.S;
    $('coins').textContent = S.coins;
    $('lvl-num').textContent = S.level;
    const pct = Math.min(100, S.xp / G.xpNeed(S.level) * 100);
    $('lvl-btn').style.setProperty('--p', pct + '%');
    if (S.quests) $('quest-btn').classList.toggle('dot', G.questsClaimable());
    const packCount = S.packs.klasik + S.packs.usta + S.packs.efsane;
    const shopTab = document.querySelector('[data-tab=shop]');
    if (shopTab) shopTab.classList.toggle('dot', packCount > 0 || S.lastGift + G.GIFT_MS <= Date.now() || S.lastFree + G.FREE_MS <= Date.now());
  }
  G.renderHeader = renderHeader;
  G.GIFT_MS = 20 * 3600 * 1000;
  G.FREE_MS = 3 * 3600 * 1000;

  // ---------- Bildirim ----------
  const toasts = [];
  let toastBusy = false;
  G.toast = function (msg) { toasts.push(msg); if (!toastBusy) nextToast(); };
  function nextToast() {
    const msg = toasts.shift();
    if (!msg) { toastBusy = false; $('toast').hidden = true; return; }
    toastBusy = true;
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    setTimeout(nextToast, 2100);
  }

  // ---------- Pencere (sıralı) ----------
  const modalQueue = [];
  let modalOpen = false, onModalClose = null;
  G.modal = function (title, bodyHtml, actions, opts = {}) {
    if (modalOpen && !opts.replace) { modalQueue.push([title, bodyHtml, actions, opts]); return null; }
    modalOpen = true;
    onModalClose = opts.onClose || null;
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = bodyHtml;
    $('modal').classList.toggle('wide', !!opts.wide);
    const row = $('modal-actions'); row.innerHTML = '';
    (actions || [{ label: 'Tamam', cls: 'btn-yellow' }]).forEach(a => {
      const b = h('button', 'btn ' + (a.cls || ''), esc(a.label));
      b.disabled = !!a.disabled;
      b.onclick = () => { window.Sound.click(); if (!a.keep) G.closeModal(); a.onClick && a.onClick(); };
      row.appendChild(b);
    });
    $('modal').hidden = false;
    $('modal').querySelector('.modal-card').scrollTop = 0;
    return $('modal-body');
  };
  G.notify = (title, html) => G.modal(title, html, null);
  G.closeModal = function () {
    $('modal').hidden = true; modalOpen = false;
    const cb = onModalClose; onModalClose = null;
    if (cb) cb();
    if (modalQueue.length && !modalOpen) { const [t, b, a, o] = modalQueue.shift(); setTimeout(() => G.modal(t, b, a, o), 120); }
  };
  G.isModalOpen = () => modalOpen;
  G.confirm = function (title, text, okLabel, onOk) {
    G.modal(title, `<p>${text}</p>`, [{ label: 'Vazgeç' }, { label: okLabel, cls: 'btn-pink', onClick: onOk }], { replace: true });
  };
  $('modal').addEventListener('click', e => { if (e.target.id === 'modal') G.closeModal(); });

  Object.assign(G, { $, h, esc, wait, rand, pickOne, cubeById, dayIndex, seeded, D });
  window.Sound.setEnabled(G.S.settings.sound);
})();
