// Arena (kupa maçları + lig), sıralama ve aynı telefonda 2 kişilik maç.
(function () {
  const { $, h, esc, cubeById, D } = G;
  const R = window.Render;

  const LEAGUES = [
    { name: 'Bronz Lig', min: 0, color: '#d08a4e' },
    { name: 'Gümüş Lig', min: 300, color: '#cfd8e6' },
    { name: 'Altın Lig', min: 700, color: '#ffd23f' },
    { name: 'Elmas Lig', min: 1200, color: '#67e8f9' },
    { name: 'Efsane Lig', min: 2000, color: '#ff4fa3' },
  ];
  const leagueOf = (t) => LEAGUES.filter(l => t >= l.min).pop();

  function dayDrift(i) { const day = G.dayIndex(); return Math.round(Math.sin(day * 1.7 + i * 2.3) * 35); }
  function botList() { return D.BOTS.map((b, i) => ({ name: b.name, tr: Math.max(0, b.tr + dayDrift(i)) })); }

  let opp = null;
  function makeOpponent() {
    const S = G.S;
    const bots = botList().sort((a, b) => Math.abs(a.tr - S.trophies) - Math.abs(b.tr - S.trophies)).slice(0, 6);
    const bot = G.pickOne(bots), t = bot.tr;
    const w = [Math.max(6, 60 - t / 40), 30, 8 + t / 120, 2 + t / 300, t > 1500 ? t / 1000 : 0];
    const size = Math.max(1, Math.min(3, S.team.length || 1));
    const team = [];
    for (let i = 0; i < size; i++) {
      let x = Math.random() * w.reduce((a, b) => a + b, 0), ri = 0;
      for (; ri < 5; ri++) { x -= w[ri]; if (x < 0) break; }
      const def = G.pickOne(D.CUBES.filter(c => c.rarity === D.RARITY_ORDER[Math.min(ri, 4)]));
      const lvl = Math.max(1, Math.min(10, 1 + Math.floor(t / 280) + ((Math.random() * 3) | 0) - 1));
      team.push({ id: def.id, lvl, mult: 0.9 });
    }
    return { name: bot.name, tr: bot.tr, team };
  }

  function miniRow(el, items) {
    el.innerHTML = '';
    if (!items.length) { el.innerHTML = '<span class="empty">Takım boş</span>'; return; }
    items.forEach(x => {
      const s = h('span', 'mini', `<canvas></canvas><small>Sv ${x.lvl}</small>`);
      el.appendChild(s);
      requestAnimationFrame(() => R.drawPuzzle(s.querySelector('canvas'), cubeById(x.id)));
    });
  }

  function render() {
    const S = G.S;
    const lg = leagueOf(S.trophies), nx = LEAGUES[LEAGUES.indexOf(lg) + 1];
    $('league').innerHTML = `
      <div><span class="label">Ligin</span><div class="league-name" style="color:${lg.color}">${lg.name}</div>
      <div class="note">${nx ? `${nx.name} için ${nx.min - S.trophies} kupa daha` : 'En yüksek lig!'}</div></div>
      <div class="league-tr"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v3h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 8.4 13H8a4 4 0 0 1-4-4V6h3V3Z" fill="#ffd23f"/></svg>${S.trophies}</div>`;
    if (!opp) opp = makeOpponent();
    miniRow($('my-team'), S.team.map(id => ({ id, lvl: G.level(id) })));
    miniRow($('opp-team'), opp.team);
    $('opp-name').textContent = opp.name;
    $('opp-tr').textContent = opp.tr + ' kupa';
    $('fight').disabled = !S.team.length;
    renderRank();
  }
  G.renderArena = render;

  function renderRank() {
    const S = G.S;
    const list = botList().concat([{ name: S.name, tr: S.trophies, you: true }]).sort((a, b) => b.tr - a.tr);
    const ol = $('rank'); ol.innerHTML = '';
    list.forEach((x, i) => {
      ol.appendChild(h('li', x.you ? 'you' : '', `<span class="pos">${i + 1}</span><span class="who">${esc(x.name)}${x.you ? ' (sen)' : ''}</span><span class="tr">${x.tr}</span>`));
    });
  }

  $('opp-new').onclick = () => { opp = makeOpponent(); render(); };
  $('fight').onclick = () => {
    if (!G.S.team.length) { G.toast('Önce Envanter’den takımına bulmaca ekle'); return; }
    const o = opp;
    G.battle({
      mode: 'arena', bg: 'linear-gradient(170deg, #ff8a1f, #ff4f9a 55%, #7b4dff)', title: `Arena · ${leagueOf(G.S.trophies).name}`, nameB: o.name,
      teamA: G.S.team.map(id => ({ id, lvl: G.level(id) })), teamB: o.team,
      onEnd: (res) => {
        const S = G.S;
        const bonus = G.afterBattle(res);
        const coins = res.won ? 40 + Math.round(o.tr / 40) : 10;
        const before = leagueOf(S.trophies);
        const tr = res.won ? 25 + ((Math.random() * 7) | 0) : -Math.min(15, S.trophies);
        S.trophies += tr;
        G.bump('arena'); G.bump(res.won ? 'wins' : 'losses');
        G.addCoins(coins); G.addXP(res.won ? 30 : 10);
        G.save();
        opp = null;
        if (res.won) window.FX.coins(6);
        const after = leagueOf(S.trophies);
        const up = after !== before && tr > 0;
        G.modal(res.won ? 'Kazandın!' : 'Kaybettin', `
          <div class="big-num">${tr >= 0 ? '+' : ''}${tr} kupa</div>
          <p>+${coins} jeton · +${res.won ? 30 : 10} XP</p>${bonus.html}
          ${up ? `<p class="good">Yeni lig: <b>${after.name}</b>!</p>` : ''}
          ${res.won ? '' : '<p class="note">Takımını güçlendir ya da tür avantajı olan bulmacalar seç.</p>'}`,
          [{ label: 'Tamam', cls: 'btn-yellow', onClick: render }]);
        render();
      },
    });
  };

  // ---------- 2 kişilik maç (aynı telefon) ----------
  const PVP_LVL = 5;
  $('pvp-btn').onclick = () => draft(1, []);
  function draft(player, p1) {
    const picked = [];
    const body = G.modal(`${player}. Oyuncu: 3 bulmaca seç`, `
      <p class="note">${player === 1 ? 'Telefonu 1. oyuncuya ver.' : 'Şimdi telefonu 2. oyuncuya ver. Seçimini rakibin görmesin!'} Tüm bulmacalar seviye ${PVP_LVL}.</p>
      <div class="draft-grid"></div>`,
      [{ label: 'Vazgeç' }, { label: 'Hazır', cls: 'btn-pink', keep: true, onClick: () => {
        if (picked.length !== 3) return G.toast('3 bulmaca seç');
        if (player === 1) draft(2, picked.slice());
        else { G.closeModal(); start(p1, picked); }
      } }], { replace: true, wide: true });
    if (!body) return;
    const grid = body.querySelector('.draft-grid');
    D.CUBES.forEach(def => {
      const b = h('button', 'draft', `<canvas></canvas><span>${esc(def.name)}</span>`);
      b.style.setProperty('--rc', D.RARITIES[def.rarity].color);
      b.onclick = () => {
        const i = picked.indexOf(def.id);
        if (i >= 0) picked.splice(i, 1); else if (picked.length < 3) picked.push(def.id); else return G.toast('En fazla 3 bulmaca');
        grid.querySelectorAll('.draft').forEach((x, k) => {
          const n = picked.indexOf(D.CUBES[k].id);
          x.classList.toggle('on', n >= 0);
          x.dataset.n = n >= 0 ? n + 1 : '';
        });
      };
      grid.appendChild(b);
      requestAnimationFrame(() => R.drawPuzzle(b.querySelector('canvas'), def));
    });
  }
  function start(a, b) {
    G.battle({
      mode: 'pvp', bg: 'linear-gradient(170deg, #19c0a8, #2a7bff)', title: '2 Kişilik Maç', nameA: '1. Oyuncu', nameB: '2. Oyuncu',
      teamA: a.map(id => ({ id, lvl: PVP_LVL })), teamB: b.map(id => ({ id, lvl: PVP_LVL })),
      onEnd: (res) => {
        G.bump('pvp'); G.save();
        G.modal(`${res.won ? '1.' : '2.'} Oyuncu kazandı!`, '<p>Güzel maçtı. Rövanş?</p>',
          [{ label: 'Kapat' }, { label: 'Rövanş', cls: 'btn-pink', onClick: () => start(a, b) }]);
      },
    });
  }
})();
