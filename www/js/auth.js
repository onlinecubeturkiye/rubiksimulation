// RA ID: Rubik Academy hesabıyla giriş (Firebase). İlerleme buluta kaydedilir.
// Giriş yapmamış oyuncu G.TRIAL kadar deneme maçı oynayabilir, sonra giriş istenir.
// window.FIREBASE_CONFIG boşsa sistem tamamen kapalıdır.
(function () {
  const { $, h, esc } = G;
  const Snd = window.Sound;
  const A = G.auth = { enabled: false, ready: false, user: null };
  G.TRIAL = 3;
  const cfg = window.FIREBASE_CONFIG;
  A.needsLogin = () => A.enabled && A.ready && !A.user && (G.S.trial || 0) >= G.TRIAL;
  A.trialLeft = () => Math.max(0, G.TRIAL - (G.S.trial || 0));
  if (!cfg || !window.firebase) return;

  A.enabled = true;
  let auth, db;
  try {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    auth = app.auth(); db = app.firestore();
  } catch (e) { A.enabled = false; return; }
  // Rubik Academy ile aynı projeyi kullanıyoruz: oyun verisi yalnızca bu koleksiyonda durur.
  const ref = (uid) => db.collection('kupArena').doc(uid);

  // ---------- Bulut kaydı ----------
  const score = (s) => (s.level || 1) * 100000 + (s.xp || 0) + ((s.stats && s.stats.wins) || 0) * 10 + Object.keys(s.inv || {}).length;
  let pushT = 0, pulling = false;
  function schedulePush() {
    if (!A.user || pulling) return;
    clearTimeout(pushT);
    pushT = setTimeout(() => {
      const S = G.S;
      ref(A.user.uid).set({
        save: JSON.stringify(S), name: S.name, level: S.level, trophies: S.trophies,
        updated: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }, 3000);
  }
  const origSave = G.save;
  G.save = function () { origSave(); schedulePush(); };

  async function pull(u) {
    pulling = true;
    try {
      const doc = await ref(u.uid).get();
      const cloud = doc.exists && doc.data().save ? JSON.parse(doc.data().save) : null;
      if (cloud && score(cloud) > score(G.S)) {
        G.loadState(cloud);
        G.toast('Bulut kaydın yüklendi!');
      }
    } catch (e) { /* çevrimdışıysa cihazdaki kayıtla devam */ }
    pulling = false;
    G.S.account = { uid: u.uid, email: u.email || '', name: u.displayName || '' };
    if (G.S.name === 'Oyuncu' && u.displayName) G.S.name = u.displayName.split(' ')[0].slice(0, 16);
    G.save();
  }

  auth.onAuthStateChanged(async (u) => {
    A.user = u; A.ready = true;
    if (u) await pull(u);
    G.renderHeader();
    if (G.current === 'home' && G.renderHome) G.renderHome();
  });

  // ---------- Giriş yolları ----------
  const ERR = {
    'auth/invalid-email': 'E-posta adresi geçersiz.',
    'auth/missing-password': 'Şifreyi yaz.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-postayla zaten bir RA ID var. “Giriş yap”ı dene.',
    'auth/invalid-credential': 'E-posta ya da şifre yanlış.',
    'auth/wrong-password': 'E-posta ya da şifre yanlış.',
    'auth/user-not-found': 'Bu e-postayla bir RA ID yok. “Kayıt ol”u dene.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
    'auth/network-request-failed': 'İnternet bağlantısı yok. Bağlanıp tekrar dene.',
    'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.',
    'auth/requires-recent-login': 'Güvenlik için çıkış yapıp tekrar giriş yap, sonra yeniden dene.',
  };
  const errText = (e) => ERR[e && e.code] || 'Bir sorun oldu. Tekrar dene.';

  async function google() {
    const cap = window.Capacitor;
    const FA = cap && cap.Plugins && cap.Plugins.FirebaseAuthentication;
    if (FA && cap.isNativePlatform && cap.isNativePlatform()) {
      // Android: yerel Google girişi, ardından aynı hesapla Firebase'e giriş
      const r = await FA.signInWithGoogle();
      const cred = firebase.auth.GoogleAuthProvider.credential(r.credential && r.credential.idToken);
      await auth.signInWithCredential(cred);
    } else {
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    }
  }

  // Giriş penceresi. reason: 'trial' (deneme bitti) ya da 'profile'
  A.openLogin = function (reason, after) {
    const trial = reason === 'trial';
    const body = G.modal('RA ID ile giriş', `
      <p>${trial ? '<b>3 deneme maçın bitti!</b> Oynamaya devam etmek için Rubik Academy hesabınla (RA ID) giriş yap. İlerlemen hesabına kaydedilir, kaybolmaz.' : 'Rubik Academy hesabınla (RA ID) giriş yap. İlerlemen buluta kaydedilir, telefon değişse de kaybolmaz.'}</p>
      <button class="btn btn-big gbtn" id="ra-google"><span class="g-ico">G</span> Google ile devam et</button>
      <div class="or"><span>ya da e-posta ile</span></div>
      <input class="field" id="ra-email" type="email" autocomplete="email" placeholder="E-posta" aria-label="E-posta">
      <input class="field" id="ra-pass" type="password" autocomplete="current-password" placeholder="Şifre (en az 6 karakter)" aria-label="Şifre">
      <div class="btn-row" style="width:100%"><button class="btn btn-yellow" id="ra-login">Giriş yap</button><button class="btn btn-green" id="ra-register">Kayıt ol</button></div>
      <button class="linkbtn" id="ra-forgot">Şifremi unuttum</button>
      <p class="ra-err" id="ra-err" role="alert"></p>
      <p class="note">RA ID, Rubik Academy’deki hesabınla aynıdır.</p>`,
      trial ? [{ label: 'Daha sonra', onClick: () => G.show('home') }] : [{ label: 'Kapat' }], { replace: true });
    if (!body) return;
    const err = (t) => { $('ra-err').textContent = t; };
    const busy = (on) => body.querySelectorAll('button').forEach(b => (b.disabled = on));
    const done = () => { G.closeModal(); window.FX.confetti(80); G.toast('Hoş geldin! RA ID ile giriş yaptın.'); if (after) after(); };
    const run = async (fn) => { err(''); busy(true); try { await fn(); done(); } catch (e) { err(errText(e)); } busy(false); };
    $('ra-google').onclick = () => run(google);
    $('ra-login').onclick = () => run(() => auth.signInWithEmailAndPassword($('ra-email').value.trim(), $('ra-pass').value));
    $('ra-register').onclick = () => run(() => auth.createUserWithEmailAndPassword($('ra-email').value.trim(), $('ra-pass').value));
    $('ra-forgot').onclick = async () => {
      const em = $('ra-email').value.trim();
      if (!em) return err('Önce e-posta adresini yaz.');
      try { await auth.sendPasswordResetEmail(em); err(''); G.toast('Şifre sıfırlama e-postası gönderildi'); } catch (e) { err(errText(e)); }
    };
  };

  A.signOut = async function () {
    clearTimeout(pushT);
    await auth.signOut();
    G.S.account = null; G.save();
    G.toast('Çıkış yapıldı');
  };
  // Google Play kuralı: hesap açılan uygulamada hesabı silme imkânı olmalı.
  A.deleteAccount = async function () {
    const u = auth.currentUser; if (!u) return;
    try {
      await ref(u.uid).delete();
      await u.delete();
      G.S.account = null; G.save();
      G.toast('Hesabın ve bulut kaydın silindi');
    } catch (e) { G.toast(errText(e)); }
  };
})();
