// Oyun verileri: nadirlikler, renk paletleri, küpler, paketler, bilgisayar rakipler.
(function () {
  const RARITIES = {
    common:    { name: 'Yaygın', color: '#a9bcd6', sell: 10,  mult: 1.0,  order: 0 },
    rare:      { name: 'Nadir',  color: '#3fa9ff', sell: 25,  mult: 1.2,  order: 1 },
    epic:      { name: 'Epik',   color: '#b45cff', sell: 60,  mult: 1.45, order: 2 },
    legendary: { name: 'Efsane', color: '#ffb020', sell: 150, mult: 1.8,  order: 3 },
    mythic:    { name: 'Mitik',  color: '#ff3d8b', sell: 400, mult: 2.3,  order: 4 },
  };
  const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

  const PALETTES = {
    classic: { U: '#f4f4f0', D: '#ffd21f', F: '#16a34a', B: '#1d4ed8', R: '#c81e2e', L: '#ff7a14', body: '#15161a' },
    pastel:  { U: '#fdfcf7', D: '#ffe9a8', F: '#9fe3bb', B: '#a9c8ff', R: '#ffb3c1', L: '#ffcf9e', body: '#e6e0f3' },
    neon:    { U: '#f8fff0', D: '#faff00', F: '#39ff7a', B: '#2e9bff', R: '#ff2e88', L: '#ff8a00', body: '#0b0b12' },
    ice:     { U: '#ffffff', D: '#d9f4ff', F: '#7fd6ff', B: '#2f7fd8', R: '#9ab0ff', L: '#3fc3d8', body: '#1b2a44' },
    fire:    { U: '#fff3c4', D: '#ffd000', F: '#ff8a00', B: '#8a0f0f', R: '#e3261b', L: '#ff5a1f', body: '#1a0a05' },
    gold:    { U: '#fff4c2', D: '#f1cf6a', F: '#d4a017', B: '#6b4a10', R: '#a8741a', L: '#e8b84a', body: '#2a1d06' },
    galaxy:  { U: '#f2e9ff', D: '#ffd6f5', F: '#8b5cff', B: '#3434a8', R: '#ff4fa3', L: '#38d6ff', body: '#0d0820' },
    crystal: { U: '#f2fdff', D: '#c7f0ff', F: '#8fe3ff', B: '#6aa8ff', R: '#d5c4ff', L: '#a8ffe8', body: '#7fc8ee' },
    void:    { U: '#8b5cf6', D: '#2a2770', F: '#c084fc', B: '#4338ca', R: '#ec4899', L: '#06b6d4', body: '#000000' },
    silver:  { U: '#eef0f3', D: '#cbd5e1', F: '#a3b1c2', B: '#64748b', R: '#8e9aab', L: '#d7dde5', body: '#1f2937' },
    mirrorgold: { U: '#fff2b8', D: '#f0cc5a', F: '#d9a521', B: '#8a6212', R: '#b8861d', L: '#f6dc85', body: '#2a1d06' },
    diamond: { U: '#e8fdff', D: '#b5f5ff', F: '#67e8f9', B: '#0ea5e9', R: '#a5f3fc', L: '#22d3ee', body: '#0b3a4a' },
    rainbow: { U: '#b45cff', D: '#ffffff', F: '#ff3b3b', B: '#2ec4ff', R: '#ff9f1c', L: '#3ee08f', body: '#111018',
               ring: ['#ff3b3b', '#ff9f1c', '#ffe14d', '#3ee08f', '#2ec4ff'] },
  };

  const SKILLS = {
    double: { name: 'Köşe Darbesi', desc: '2 kat hasar verir.' },
    heal:   { name: 'Hizala',       desc: 'Canının %35’ini yeniler.' },
    stun:   { name: 'Karıştır',     desc: 'Az hasar verir, rakip 1 tur bekler.' },
    shield: { name: 'Kalkan',       desc: 'Sonraki 2 saldırıda yarı hasar alır.' },
    drain:  { name: 'Emici',        desc: 'Hasar verir, yarısını can olarak alır.' },
  };

  function mk(id, name, type, n, pal, rarity, skill) {
    const base = {
      cube:    { hp: 60 + n * 10, atk: 8 + n * 2.5 },
      pyramid: { hp: 55 + n * 12, atk: 10 + n * 3 },
      mega:    { hp: 120, atk: 22 },
      skewb:   { hp: 85, atk: 17 },
      mirror:  { hp: 95, atk: 18 },
    }[type];
    const m = RARITIES[rarity].mult;
    return { id, name, type, n, pal, rarity, skill, hp: Math.round(base.hp * m), atk: Math.round(base.atk * m) };
  }

  const CUBES = [
    mk('c2',  '2×2 Klasik',        'cube',    2, 'classic', 'common',    'double'),
    mk('c3',  '3×3 Klasik',        'cube',    3, 'classic', 'common',    'heal'),
    mk('p2',  'Mini Piramit',      'pyramid', 2, 'classic', 'common',    'stun'),
    mk('c2p', '2×2 Pastel',        'cube',    2, 'pastel',  'common',    'shield'),
    mk('c3p', '3×3 Pastel',        'cube',    3, 'pastel',  'common',    'drain'),
    mk('c4',  '4×4 Klasik',        'cube',    4, 'classic', 'rare',      'shield'),
    mk('c3n', '3×3 Neon',          'cube',    3, 'neon',    'rare',      'double'),
    mk('p3',  'Piramit',           'pyramid', 3, 'classic', 'rare',      'stun'),
    mk('sk',  'Eğik Küp',          'skewb',   2, 'classic', 'rare',      'drain'),
    mk('c3i', '3×3 Buz',           'cube',    3, 'ice',     'rare',      'heal'),
    mk('c2f', '2×2 Ateş',          'cube',    2, 'fire',    'rare',      'double'),
    mk('c5',  '5×5 Klasik',        'cube',    5, 'classic', 'epic',      'heal'),
    mk('mg',  'Megaküp',           'mega',    3, 'classic', 'epic',      'shield'),
    mk('c3f', '3×3 Ateş',          'cube',    3, 'fire',    'epic',      'double'),
    mk('mr',  'Ayna Küp',          'mirror',  3, 'silver',  'epic',      'stun'),
    mk('p4',  'Usta Piramit',      'pyramid', 4, 'neon',    'epic',      'drain'),
    mk('c4i', '4×4 Buz',           'cube',    4, 'ice',     'epic',      'shield'),
    mk('c6',  '6×6 Klasik',        'cube',    6, 'classic', 'legendary', 'heal'),
    mk('c7',  '7×7 Klasik',        'cube',    7, 'classic', 'legendary', 'shield'),
    mk('c3g', '3×3 Altın',         'cube',    3, 'gold',    'legendary', 'double'),
    mk('mgr', 'Gökkuşağı Megaküp', 'mega',    3, 'rainbow', 'legendary', 'drain'),
    mk('c5g', '5×5 Galaksi',       'cube',    5, 'galaxy',  'legendary', 'stun'),
    mk('c3c', 'Kristal Küp',       'cube',    3, 'crystal', 'mythic',    'heal'),
    mk('c5v', 'Kara Delik',        'cube',    5, 'void',    'mythic',    'drain'),
    mk('p3d', 'Elmas Piramit',     'pyramid', 3, 'diamond', 'mythic',    'double'),
    mk('mrg', 'Altın Ayna',        'mirror',  3, 'mirrorgold', 'mythic', 'stun'),
  ];

  // Oranlar: Yaygın, Nadir, Epik, Efsane, Mitik (yüzde)
  const PACKS = [
    { id: 'klasik', name: 'Klasik Paket', price: 100, odds: [70, 22, 6.5, 1.4, 0.1],
      bg: 'linear-gradient(160deg,#1f6bff,#21d4fd)', cap: '#0b4fd1', art: ['c2', 'c3', 'p2'] },
    { id: 'usta', name: 'Usta Paketi', price: 250, odds: [35, 40, 18, 6, 1],
      bg: 'linear-gradient(160deg,#7b2ff7,#ff4fa3)', cap: '#5a17c9', art: ['p3', 'mg', 'c4'] },
    { id: 'efsane', name: 'Efsane Paketi', price: 600, odds: [0, 35, 40, 20, 5],
      bg: 'linear-gradient(160deg,#ff9a00,#ff2e88 55%,#8b2cff)', cap: '#c2186b', art: ['c5g', 'mgr', 'c3g'] },
  ];

  // Bilgisayar rakipler (gerçek oyuncular değil).
  const BOTS = [
    ['KüpUstası', 2610], ['Zeynep_34', 2380], ['HızlıParmak', 2190], ['Mert.cube', 2040], ['PiramitKralı', 1880],
    ['Elif2012', 1750], ['AyazSpeed', 1620], ['DenizK', 1505], ['Kerem3x3', 1390], ['Ece.solve', 1280],
    ['MegaMinxer', 1175], ['Burak_TR', 1080], ['NilCube', 990], ['Poyraz', 905], ['Defne', 820],
    ['Arda.07', 745], ['Lina', 670], ['EmirHan', 600], ['KüpKedisi', 530], ['Yağmur', 470],
    ['Can_R2', 410], ['Selin', 355], ['Toprak', 300], ['Asel', 250], ['Efe.rubik', 205],
    ['Miray', 160], ['Ozan', 120], ['Duru', 85], ['Kaan', 50], ['Yeni_Başlayan', 20],
  ].map(([name, tr]) => ({ name, tr }));

  window.GameData = { RARITIES, RARITY_ORDER, PALETTES, SKILLS, CUBES, PACKS, BOTS };
})();
