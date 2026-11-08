// Savaş motoru: Macera, Kule, Arena ve 2 kişilik maç bunu kullanır.
// G.battle({ mode, title, bg, nameA, nameB, teamA:[{id,lvl}], teamB:[{id,lvl,mult,boss,label}], onEnd(res) })
(function () {
  const { $, h, esc, wait, rand, cubeById, D } = G;
  const R = window.Render, Snd = window.Sound;
  let B = null;

  const eff = (a, d) => {
    const ta = G.typeOf(a.def), td = G.typeOf(d.def);
    if (D.TYPES[ta].beats === td) return 1.3;
    if (D.TYPES[td].beats === ta) return 0.8;
    return 1;
  };
  function mkF(x) {
    const def = cubeById(x.id);
    const st = G.statsOf(def, x.lvl, 1);
    const hpM = (x.mult || 1) * (x.boss ? 2.2 : 1), atkM = (x.mult || 1) * (x.boss ? 1.15 : 1);
    const hp = Math.round(st.hp * hpM);
    return { def, lvl: x.lvl, hp, max: hp, atk: Math.round(st.atk * atkM), cd: 0, shield: 0, stun: false, boss: !!x.boss, label: x.label || def.name };
  }
  const other = (s) => (s === 'A' ? 'B' : 'A');
  const cur = (s) => B[s].list[B[s].idx];
  const alive = (s) => B[s].list.filter(f => f.hp > 0);
  const isHuman = (s) => (s === 'A' ? !B.auto : B.mode === 'pvp');
  const pace = (ms) => wait(B && B.fast ? ms * 0.55 : ms);

  G.battle = function (cfg) {
    B = {
      mode: cfg.mode, cfg, auto: false, fast: false, over: false, resolve: null, turnSide: 'A',
      A: { list: cfg.teamA.map(mkF), idx: 0, name: cfg.nameA || G.S.name },
      B: { list: cfg.teamB.map(mkF), idx: 0, name: cfg.nameB || 'Rakip' },
      skillsUsed: 0,
    };
    $('b-title').textContent = cfg.title || 'Savaş';
    $('battle').style.setProperty('--bbg', cfg.bg || 'radial-gradient(120% 70% at 50% 0%, #3b1f86, #1a0f3a 70%)');
    $('b-auto').hidden = cfg.mode === 'pvp';
    $('b-auto').textContent = 'Oto: Kapalı';
    $('b-quit').textContent = cfg.mode === 'pvp' ? 'Bitir' : 'Pes et';
    $('battle').hidden = false;
    B.drawn = {};
    renderAll();
    say(`<b>${esc(B.B.name)}</b> ile savaş başladı!`);
    run();
  };
  G.inBattle = () => !!B;

  async function run() {
    let side = 'A';
    await pace(600);
    while (B && !B.over) {
      await takeTurn(side);
      if (!B || B.over) break;
      side = other(side);
    }
  }
  async function takeTurn(side) {
    const f = cur(side);
    if (f.cd > 0) f.cd--;
    B.turnSide = side;
    renderAll();
    if (f.stun) {
      f.stun = false;
      say(`<b>${esc(f.label)}</b> sersem, turu kaçırdı`);
      renderAll();
      await pace(900);
      return;
    }
    let act;
    if (isHuman(side)) {
      if (B.mode === 'pvp') Snd.turn();
      act = await new Promise(res => (B.resolve = res));
      B.resolve = null;
    } else {
      await pace(side === 'A' ? 350 : 550);
      if (!B || B.over) return;
      act = ai(side);
    }
    if (!B || B.over) return;
    await perform(side, act);
  }

  function ai(side) {
    const me = cur(side), op = cur(other(side));
    // Dezavantajdaysa avantajlı yedeğe geç
    if (eff(op, me) > 1 && Math.random() < 0.35) {
      const i = B[side].list.findIndex((x, k) => k !== B[side].idx && x.hp > x.max * 0.4 && eff(x, op) > 1);
      if (i >= 0) return { kind: 'switch', idx: i };
    }
    if (me.cd === 0) {
      const s = me.def.skill;
      if (s === 'heal') { if (me.hp < me.max * 0.55) return { kind: 'skill' }; }
      else if (s === 'shield') { if (me.hp < me.max * 0.8 || Math.random() < 0.3) return { kind: 'skill' }; }
      else if (s === 'stun') { if (!op.stun) return { kind: 'skill' }; }
      else return { kind: 'skill' };
    }
    return { kind: 'atk' };
  }

  function rollDmg(a, d, k) {
    let dmg = a.atk * rand(0.85, 1.15) * k;
    const e = eff(a, d);
    dmg *= e;
    const crit = Math.random() < 0.1;
    if (crit) dmg *= 1.5;
    return { dmg: Math.max(1, Math.round(dmg)), crit, e };
  }
  function hit(dSide, dmg) {
    const d = cur(dSide);
    if (d.shield > 0) { dmg = Math.max(1, Math.round(dmg / 2)); d.shield--; }
    d.hp = Math.max(0, d.hp - dmg);
    anim(dSide, 'hit'); floatNum(dSide, '-' + dmg);
    Snd.hit();
    return dmg;
  }
  const effText = (e) => (e > 1 ? ' <b class="good">Çok etkili!</b>' : e < 1 ? ' <span class="weak">Pek etkili değil.</span>' : '');

  async function perform(side, act) {
    const dSide = other(side);
    if (act.kind === 'switch') {
      const prev = cur(side);
      B[side].idx = act.idx;
      say(`<b>${esc(prev.label)}</b> geri çekildi, <b>${esc(cur(side).label)}</b> sahada!`);
      Snd.click();
      renderAll();
      await pace(800);
      return;
    }
    if (act.kind === 'quit') return;
    const a = cur(side), d = cur(dSide);
    const who = `<b>${esc(a.label)}</b>`;
    anim(side, 'lunge');
    await pace(180);
    if (!B || B.over) return;
    if (act.kind === 'atk') {
      const r = rollDmg(a, d, 1);
      const dealt = hit(dSide, r.dmg);
      say(`${who} saldırdı: ${dealt} hasar${r.crit ? ' (kritik!)' : ''}.${effText(r.e)}`);
    } else {
      const sk = D.SKILLS[a.def.skill];
      a.cd = 3;
      if (side === 'A' || B.mode === 'pvp') { G.bump('skills'); }
      Snd.skill();
      if (a.def.skill === 'double') { const r = rollDmg(a, d, 2); const dealt = hit(dSide, r.dmg); say(`${who} ${sk.name}: ${dealt} hasar!${effText(r.e)}`); }
      else if (a.def.skill === 'heal') { const v = Math.min(a.max - a.hp, Math.round(a.max * 0.35)); a.hp += v; floatNum(side, '+' + v, true); Snd.heal(); say(`${who} ${sk.name} ile ${v} can yeniledi`); }
      else if (a.def.skill === 'stun') { const r = rollDmg(a, d, 0.6); const dealt = hit(dSide, r.dmg); d.stun = true; say(`${who} ${sk.name}: ${dealt} hasar, rakip sersemledi!${effText(r.e)}`); }
      else if (a.def.skill === 'shield') { a.shield = 2; const r = rollDmg(a, d, 0.5); const dealt = hit(dSide, r.dmg); say(`${who} ${sk.name} açtı ve ${dealt} hasar verdi.`); }
      else if (a.def.skill === 'drain') { const r = rollDmg(a, d, 1.2); const dealt = hit(dSide, r.dmg); const v = Math.min(a.max - a.hp, Math.round(dealt / 2)); a.hp += v; if (v) floatNum(side, '+' + v, true); say(`${who} ${sk.name}: ${dealt} hasar, ${v} can aldı.${effText(r.e)}`); }
    }
    renderAll();
    await pace(650);
    if (!B || B.over) return;
    if (d.hp <= 0) await knockOut(dSide);
  }

  async function knockOut(side) {
    const f = cur(side);
    say(`<b>${esc(f.label)}</b> oyun dışı!`);
    await pace(700);
    if (!B || B.over) return;
    const next = B[side].list.findIndex(x => x.hp > 0);
    if (next < 0) return end(side === 'B');
    B[side].idx = next;
    renderAll();
    if (!B) return;
    say(`<b>${esc(B[side].name)}</b> sahaya <b>${esc(cur(side).label)}</b> çıkardı`);
    await pace(600);
  }

  function end(wonA) {
    B.over = true;
    const res = { won: wonA, koA: B.A.list.filter(f => f.hp <= 0).length, sizeA: B.A.list.length };
    const cb = B.cfg.onEnd;
    setTimeout(() => {
      $('battle').hidden = true;
      B = null;
      (wonA ? Snd.win : Snd.lose)();
      cb && cb(res);
    }, 300);
  }

  // ---------- Görünüm ----------
  function say(html) { $('blog').innerHTML = `<span>${html}</span>`; }
  function anim(side, cls) {
    const el = $('b-' + side).querySelector('.fighter');
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 400);
  }
  function floatNum(side, txt, heal) {
    const el = $('b-' + side).querySelector('.fighter');
    if (!el) return;
    const f = h('span', 'float' + (heal ? ' heal' : ''), txt);
    el.appendChild(f); setTimeout(() => f.remove(), 900);
  }

  function renderSide(side) {
    const wrap = $('b-' + side), S = B[side], f = cur(side), op = cur(other(side));
    const key = S.idx + ':' + f.def.id;
    if (B.drawn[side] !== key) {
      B.drawn[side] = key;
      wrap.innerHTML = `<div class="fighter"><canvas></canvas><div class="info"><div class="nm"></div><div class="meta"></div><div class="hp"><i></i></div><div class="hp-txt"></div></div></div><div class="bench"></div>`;
      R.drawPuzzle(wrap.querySelector('canvas'), f.def);
      const bench = wrap.querySelector('.bench');
      bench.appendChild(h('span', 'b-owner', esc(S.name)));
      S.list.forEach((x, i) => {
        const b = h('button', 'bench-btn', '<canvas></canvas><i></i>');
        b.setAttribute('aria-label', x.label + ' ile değiştir');
        b.onclick = () => {
          if (!B || B.turnSide !== side || !B.resolve || !isHuman(side)) return;
          if (i === S.idx || x.hp <= 0) return;
          B.resolve({ kind: 'switch', idx: i });
        };
        bench.appendChild(b);
        requestAnimationFrame(() => R.drawPuzzle(b.querySelector('canvas'), x.def));
      });
    }
    const fighter = wrap.querySelector('.fighter');
    fighter.classList.toggle('active-turn', B.turnSide === side && !B.over);
    fighter.classList.toggle('boss', f.boss);
    wrap.querySelector('.nm').textContent = f.label;
    const ty = D.TYPES[G.typeOf(f.def)];
    const e = eff(f, op);
    const chips = [`<span>Sv ${f.lvl}</span>`, `<span class="fx" style="color:${ty.color}">${ty.name}</span>`];
    if (f.boss) chips.push('<span class="fx boss-chip">BOSS</span>');
    if (e > 1) chips.push('<span class="fx good">Avantajlı</span>');
    if (f.shield) chips.push(`<span class="fx">Kalkan ×${f.shield}</span>`);
    if (f.stun) chips.push('<span class="fx">Sersem</span>');
    if (f.cd > 0) chips.push(`<span class="fx">Yetenek ${f.cd}</span>`);
    wrap.querySelector('.meta').innerHTML = chips.join('');
    const pct = Math.max(0, f.hp / f.max * 100);
    const bar = wrap.querySelector('.hp i'); bar.style.width = pct + '%'; bar.classList.toggle('low', pct < 30);
    wrap.querySelector('.hp-txt').textContent = `${f.hp} / ${f.max} can · Saldırı ${f.atk}`;
    wrap.querySelectorAll('.bench-btn').forEach((b, i) => {
      const x = S.list[i];
      b.classList.toggle('ko', x.hp <= 0);
      b.classList.toggle('on', i === S.idx);
      b.querySelector('i').style.width = Math.max(0, x.hp / x.max * 100) + '%';
      b.disabled = !(B.turnSide === side && isHuman(side) && i !== S.idx && x.hp > 0);
    });
  }
  function renderAll() {
    if (!B) return;
    renderSide('A'); renderSide('B');
    const side = B.turnSide, f = cur(side), human = isHuman(side) && !B.over;
    const sk = D.SKILLS[f.def.skill];
    $('act-atk').disabled = !human;
    $('act-skill').disabled = !human || f.cd > 0;
    $('act-skill').innerHTML = `${esc(sk.name)}${f.cd > 0 ? ` (${f.cd})` : ''}<small>${esc(sk.desc)}</small>`;
    let turn = '';
    if (B.mode === 'pvp') turn = `Sıra: <b>${esc(B[side].name)}</b>`;
    else if (B.auto) turn = 'Otomatik savaş açık';
    else turn = side === 'A' ? 'Sıra sende · Yedeğe dokunarak küp değiştirebilirsin' : 'Rakip düşünüyor…';
    $('b-turn').innerHTML = turn;
  }

  $('act-atk').onclick = () => { if (B && B.resolve) { Snd.click(); B.resolve({ kind: 'atk' }); } };
  $('act-skill').onclick = () => { if (B && B.resolve && cur(B.turnSide).cd === 0) { Snd.click(); B.resolve({ kind: 'skill' }); } };
  $('b-auto').onclick = () => {
    if (!B) return;
    B.auto = !B.auto; B.fast = B.auto;
    $('b-auto').textContent = B.auto ? 'Oto: Açık' : 'Oto: Kapalı';
    if (B.auto && B.resolve && B.turnSide === 'A') B.resolve(ai('A'));
    renderAll();
  };
  $('b-quit').onclick = () => {
    if (!B) return;
    const pvp = B.mode === 'pvp';
    G.confirm(pvp ? 'Maçı bitir?' : 'Pes et?', pvp ? 'Maç berabere sayılmaz, kimse kazanmaz.' : 'Bu savaşı kaybetmiş sayılırsın.', pvp ? 'Bitir' : 'Pes et', () => {
      if (!B) return;
      if (B.resolve) B.resolve({ kind: 'quit' });
      if (pvp) { B.over = true; $('battle').hidden = true; B = null; return; }
      end(false);
    });
  };
})();
