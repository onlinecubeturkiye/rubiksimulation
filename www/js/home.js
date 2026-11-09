// Ana ekran: vitrin küpü, büyük OYNA düğmesi, yan kısayollar, sezon yolu ve haftalık etkinlik.
(function () {
  const { $, esc, cubeById, D } = G;
  const R = window.Render, Snd = window.Sound;

  function favList() {
    const S = G.S;
    const owned = D.CUBES.filter(c => S.inv[c.id]).sort((a, b) =>
      (S.team.includes(b.id) ? 1 : 0) - (S.team.includes(a.id) ? 1 : 0) || D.RARITIES[b.rarity].order - D.RARITIES[a.rarity].order);
    return owned.length ? owned : [cubeById('c3')];
  }
  function render() {
    const S = G.S;
    // Etkinlik bandı
    const ev = G.event();
    const eb = $('event-banner');
    eb.style.setProperty('--ev', ev.color);
    eb.innerHTML = `<span class="ev-tag">ETKİNLİK</span><div><b>${esc(ev.name)}</b><small>${esc(ev.desc)}</small></div><span class="ev-time">${ev.daysLeft} gün</span>`;

    // Vitrin
    const list = favList();
    const fav = list.find(c => c.id === S.fav) || list[0];
    R.drawPuzzle($('sc-cv'), fav, { noLogo: false });
    const r = D.RARITIES[fav.rarity];
    $('sc-name').innerHTML = `${G.brandChip(fav)}<b>${esc(fav.model)}</b><small style="color:${r.color}">${r.name} · Sv ${G.level(fav.id) || 1}</small>`;

    // Yan düğmeler
    const ready = S.keys >= 3;
    $('chest-home').classList.toggle('ready', ready);
    $('chest-home-txt').textContent = ready ? 'Aç!' : `Sandık ${S.keys}/3`;
    $('login-btn').classList.toggle('dot', S.login.day !== G.dayIndex());
    $('wheel-home').classList.toggle('dot', S.wheelDay !== G.dayIndex());
    $('season-btn').classList.toggle('dot', G.seasonClaimable());
    $('tower-home').classList.toggle('locked', !S.adv.bosses.includes('w1'));

    // Sezon çubuğu
    const st = G.seasonState(), tier = G.seasonTier();
    const into = tier >= G.SEASON_TIERS ? G.SEASON_TIER : st.pts % G.SEASON_TIER;
    $('season-bar').innerHTML = `<span class="s-tier">${tier}</span><span class="s-mid"><b>Sezon Yolu ${tier < G.SEASON_TIERS ? `· Sonraki: ${esc(G.seasonReward(tier + 1).text)}` : '· Tamamlandı!'}</b><span class="bar"><i style="width:${into / G.SEASON_TIER * 100}%"></i></span></span><small>${G.seasonDaysLeft()} gün</small>`;

    // Oyna
    const next = G.nextStage && G.nextStage();
    $('home-play-sub').textContent = next ? `Bölüm ${next.label} · ${next.w.name}` : 'Macera bitti! Yıldız topla';
    $('home-arena-sub').textContent = `${S.trophies} kupa`;
  }
  G.renderHome = render;

  $('showcase').onclick = () => {
    const list = favList();
    const i = list.findIndex(c => c.id === (G.S.fav || list[0].id));
    G.S.fav = list[(i + 1) % list.length].id;
    G.save(); Snd.click();
    render();
    window.FX.burstAt($('sc-cv'), null, 12, 4);
  };
  $('home-play').onclick = () => {
    Snd.click();
    G.show('adv');
    const next = G.nextStage && G.nextStage();
    if (next) setTimeout(() => { const el = document.querySelector(`[data-stage="${next.id}"]`); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
  };
  $('home-arena').onclick = () => { Snd.click(); G.show('arena'); };
  $('chest-home').onclick = () => { G.openChest(); render(); };
  $('login-btn').onclick = () => { if (!G.checkLogin()) G.toast('Bugünün ödülünü aldın, yarın yine gel!'); };
  $('wheel-home').onclick = () => {
    if (G.S.wheelDay === G.dayIndex()) return G.toast('Çark yarın yine dönecek!');
    G.show('shop'); $('wheel-btn').click();
  };
  $('tower-home').onclick = () => {
    if (!G.S.adv.bosses.includes('w1')) return G.toast('Sonsuz Kule, ilk dünyanın boss’unu yenince açılır'); G.show('adv'); setTimeout(() => $('tower').scrollIntoView({ block: 'center', behavior: 'smooth' }), 60); };
  $('season-btn').onclick = openSeason;
  $('season-bar').onclick = openSeason;
  $('event-banner').onclick = () => {
    const ev = G.event();
    G.notify(ev.name, `<p>${esc(ev.desc)}.</p><p class="note">Her hafta yeni bir etkinlik başlar. Bu etkinlik ${ev.daysLeft} gün sonra biter.</p>`);
  };

  // ---------- Sezon Yolu ----------
  function openSeason() {
    Snd.click();
    const st = G.seasonState(), tier = G.seasonTier();
    const rows = [];
    for (let t = 1; t <= G.SEASON_TIERS; t++) {
      const rw = G.seasonReward(t), reached = t <= tier, claimed = st.claimed.includes(t);
      rows.push(`<div class="s-row${reached ? ' reached' : ''}${claimed ? ' claimed' : ''}${rw.pack || rw.mythic ? ' big' : ''}">
        <span class="s-num">${t}</span><b>${esc(rw.text)}</b>
        <button class="btn btn-small ${reached && !claimed ? 'btn-green' : ''}" data-t="${t}" ${reached && !claimed ? '' : 'disabled'}>${claimed ? 'Alındı' : reached ? 'Al' : `${t * G.SEASON_TIER - st.pts} XP`}</button></div>`);
    }
    const body = G.modal('Sezon Yolu', `
      <p>Oynadıkça kazandığın her XP sezon yolunda ilerletir. Sezon ${G.seasonDaysLeft()} gün sonra yenilenir.</p>
      <div class="bar" style="width:100%"><i style="width:${Math.min(100, st.pts / (G.SEASON_TIERS * G.SEASON_TIER) * 100)}%"></i></div>
      <div class="season-list">${rows.join('')}</div>`, [{ label: 'Kapat' }], { replace: true });
    if (!body) return;
    body.querySelectorAll('[data-t]').forEach(b => (b.onclick = () => claim(+b.dataset.t)));
    const first = body.querySelector('.s-row:not(.reached)') || body.querySelector('.s-row:last-child');
    if (first) setTimeout(() => first.scrollIntoView({ block: 'center' }), 50);
  }
  function claim(t) {
    const S = G.S, st = G.seasonState();
    if (t > G.seasonTier() || st.claimed.includes(t)) return;
    st.claimed.push(t);
    const rw = G.seasonReward(t);
    if (rw.coins) { G.addCoins(rw.coins); window.FX.coins(6); G.toast(`+${rw.coins} jeton`); }
    if (rw.pack) { S.packs[rw.pack]++; G.toast(`${rw.text} Mağaza’da seni bekliyor!`); }
    if (rw.mythic) {
      const pool = D.CUBES.filter(c => c.rarity === 'mythic');
      const def = pool.find(c => !S.inv[c.id]) || G.pickOne(pool);
      const got = G.addCube(def.id);
      window.FX.confetti(120);
      G.toast(`${def.name} ${got.isNew ? 'koleksiyonuna eklendi!' : `seviye ${got.lvl} oldu!`}`);
    }
    G.save();
    openSeason();
    render();
  }
})();
