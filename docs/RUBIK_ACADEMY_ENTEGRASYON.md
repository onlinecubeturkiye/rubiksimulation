# Küp Arena × Rubik Academy entegrasyonu

Bu belge, **rubikacademy.fun** sitesini geliştiren kişiye (ya da Claude oturumuna) Küp Arena için sitede yapılması gerekenleri anlatır.

## Küp Arena nedir?

- Rubik Academy'ye ait, çocuklara yönelik bir küp oyunu: paket/küp kutusu açma, koleksiyon, sıra tabanlı savaş, 6 dünyalık macera, 3B küp çözme.
- Kod: `onlinecubeturkiye/rubiksimulation` deposu (`www/` klasörü).
- Android uygulaması (Capacitor, WebView): paket adı `com.onlinecubeturkiye.kuparena`.
- APK her zaman şu adresten indirilir: `https://github.com/onlinecubeturkiye/rubiksimulation/releases/latest/download/KupArena.apk`

## Hesap sistemi: RA ID

Oyun, sitenin Firebase projesini (`rubikacademydb`) **yalnızca hesap bağlamak ve oyun kaydını saklamak için** kullanır. Site tarafında Firestore kurallarını değiştirmek gerekmez.

- **Giriş yolları (oyunun içinde):** E-posta + şifre (giriş, kayıt, şifremi unuttum) doğrudan çalışır.
- **Google ile giriş (telefonda):** Google, uygulama içi WebView'da giriş izni vermez. Bu yüzden oyun siteyi telefonun tarayıcısında açar, site Google ile giriş yapıp kimlik belgesini oyuna geri yollar (aşağıda 2. madde).
- **Deneme sınırı:** Giriş yapmayan oyuncu 3 deneme maçından sonra RA ID ile giriş yapmak zorunda.
- **Oyun kaydının yeri:** `users/{uid}/kv/kup-arena` belgesi, alanları `{ v: "<oyun kaydı JSON metni>", t: <ms cinsinden zaman> }`.
  - Bu, mevcut `users/{uid}/kv/{key}` kuralına birebir uyar (anahtar `^[a-z0-9-]{1,64}$`, alanlar yalnızca `v` ve `t`).
  - Sitenin `SYNC_KEYS` listesinde `kup-arena` **yok**, olmasın: site bu belgeyi localStorage'a çekmesin.
  - "Tüm verilerimi sil" ve hesap silme zaten tüm `kv` belgelerini sildiği için Küp Arena kaydı da silinir. Bu doğru davranış.
- **Oyuncu adı:** Oyun, oyuncunun adını herkese açık `users/{uid}.name` alanından okur. Belge yoksa (oyuncu siteyi hiç açmadıysa) oyun belgeyi `{ name, joined, seen }` alanlarıyla kendisi oluşturur. `name` en fazla 24 karakterdir; `joined` ve `seen` milisaniye cinsinden tam sayıdır.
- **Hesap silme:** Oyun içinde yalnızca "Küp Arena kaydımı sil" var. RA ID hesabının tamamını silmek için oyun `https://rubikacademy.fun/ayarlar` sayfasına yönlendirir ("Hesabımı sil"). Bu sayfa ve düğme yerinde kalmalı (Google Play hesap silme kuralı için gerekli).
- **API anahtarı:** Şu an kısıtsız; `https://localhost` (uygulamanın adresi) isteklerini kabul ediyor. İleride anahtara referrer kısıtı eklenirse `https://localhost/*` de izinli olmalı. Authentication → Settings → Authorized domains içinde `localhost` kalmalı.

## Sitede yapılacaklar

### 1. Küp Arena tanıtım/giriş yeri

Ana sayfada ve İçerikler'de bir "Küp Arena" kartı (oyun görseli, kısa açıklama):

- **"Android için indir"** düğmesi → `https://github.com/onlinecubeturkiye/rubiksimulation/releases/latest/download/KupArena.apk`
- **Kısa kurulum notu:** "İlk kurulumda telefon 'bilinmeyen kaynaklardan yükleme' izni isteyebilir."
- **Hesap notu:** "Rubik Academy hesabınla (RA ID) giriş yap, ilerlemen kaybolmasın."
- **İsteğe bağlı:** Giriş yapmış kullanıcının profil sayfasında Küp Arena özeti. `users/{uid}/kv/kup-arena` belgesinin `v` alanı JSON'dur. İşe yarayan alanlar:
  - `level`: oyuncu seviyesi
  - `trophies`: kupa
  - `stats.wins`: galibiyet
  - `Object.keys(inv).length`: toplanan küp sayısı (26 küpten)
  - `adv.stars`: bölüm başına yıldız (toplam 108)

### 2. `/kup-arena/baglan` sayfası (telefonda Google girişi için şart)

Oyun bu sayfayı telefonun tarayıcısında şu adresle açar:
`https://rubikacademy.fun/kup-arena/baglan?donus=kuparena%3A%2F%2Fbaglan`

Sayfanın yapacağı:

1. `donus` parametresini oku. **Yalnızca `kuparena://baglan` ile başlıyorsa kabul et**, değilse hiçbir yere yönlendirme (açık yönlendirme açığı olmasın).
2. Ekranda tek büyük düğme göster: **"Google ile giriş yap ve Küp Arena'ya dön"**. Açılır pencere için kullanıcının dokunması gerekir.
3. Düğmeye basılınca Google ile giriş yap ve **Google OAuth kimlik belgesini** al. Firebase'in kendi ID token'ı değil, Google'ın `idToken`'ı gerekiyor:
   ```js
   import { getAuth, GoogleAuthProvider, signInWithPopup } from "/js/vendor/firebase/firebase-auth.js";
   const p = new GoogleAuthProvider();
   p.setCustomParameters({ prompt: "select_account" });
   const r = await signInWithPopup(getAuth(app), p);
   const cred = GoogleAuthProvider.credentialFromResult(r);
   location.href = donus + "?gid=" + encodeURIComponent(cred.idToken);
   ```
4. Kullanıcı sitede zaten giriş yapmışsa da aynı düğmeyi göster ve aynı akışı izle (ya da `reauthenticateWithPopup` + `credentialFromResult`). Önceki girişin belgesi saklanmadığı için yeni bir Google belgesi gerekiyor.
5. Ek durumlar:
   - Açılır pencere engellenirse `signInWithRedirect` + `getRedirectResult` ile aynı belgeyi al.
   - Hata olursa anlaşılır bir Türkçe mesaj göster, "Tekrar dene" düğmesi koy.
   - Sayfaya `donus` olmadan (masaüstünden) girilirse Küp Arena tanıtımını ve APK bağlantısını göster.
   - E-posta/şifre ile kayıtlı kullanıcılar için not: "E-posta ile kayıt olduysan oyunun içinde 'E-posta ile giriş'i kullan."
6. Yönlendirmeden sonra bir "Küp Arena'ya dön" düğmesi de göster (aynı `kuparena://baglan?gid=...` adresi). Bazı tarayıcılar otomatik yönlendirmeyi engeller.

Oyun tarafı hazır: `kuparena://baglan?gid=...` adresini yakalayıp `signInWithCredential(GoogleAuthProvider.credential(gid))` ile aynı RA ID hesabına giriş yapıyor.

**Güvenlik notu:** `gid` yaklaşık 1 saat geçerli bir Google kimlik belgesidir. Yalnızca `kuparena://` adresine yollanmalı, sayfada loglanmamalı, hiçbir yerde saklanmamalı.

### 3. Gizlilik metni (`/gizlilik`)

Küp Arena bölümü eklenmeli:

- **Saklanan veri:** Oyun ilerlemesi (seviye, koleksiyon, yıldızlar, kupa), oyuncu adı.
- **Yeri:** RA ID hesabına bağlı Firestore belgesi.
- **Amacı:** İlerlemenin cihazlar arasında kaybolmaması.
- **Silme:** Oyunda "Küp Arena kaydımı sil", tüm hesap için `/ayarlar` → "Hesabımı sil".
- **Çocuklar:** Oyuncuların çoğu çocuk olabilir. KVKK ve Google Play aile politikası açısından veli onayı metni gözden geçirilmeli.

## Durum

Site tarafı yayında (rubikacademy PR #219): `/kup-arena`, `/kup-arena/baglan`, ana sayfa kartı, gizlilik bölümü ve profil özeti hazır. Profil özeti `level`, `trophies`, `stats.wins`, `inv` ve `adv.stars` alanlarını okur; bu alan adları değişirse siteye haber verilmeli.

## Test için

1. APK'yı telefona kur.
2. Oyunda 3 maç oyna; 4. maçta "RA ID ile giriş" penceresi çıkar.
3. **E-posta:** Rubik Academy'deki e-posta/şifreyle giriş yap. Oyun açılır, ilerleme Firestore'da `users/{uid}/kv/kup-arena` belgesine yazılır.
4. **Google:** "Google ile devam et" → tarayıcıda `/kup-arena/baglan` açılır → Google ile giriş → oyuna geri dönülür ve giriş yapılmış olur.
