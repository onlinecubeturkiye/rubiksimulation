# Rubik Academy sitesi için istekler (Küp Arena v3.2)

İki iş var: **1)** giriş sayfasını sadeleştirmek, **2)** kulüp ve takas için Firestore kurallarını eklemek.

---

## 1) `/kup-arena/baglan` giriş sayfasını sadeleştir

Bu sayfa oyunun içinden açılıyor ve yalnız RA ID girişi için var. Oyuncu siteye gitmemeli.

- Üst bar (`header`, `nav`, `.navbar`, `.nav-bar`), alt bar / alt menü ve `footer` **olmasın**.
- Reklam, duyuru / yayın açılır pencereleri, "uygulamayı yükle", bildirim izni ve benzeri kutular **çıkmasın**. `common.js` bunları ekliyorsa bu sayfada kapat.
- Siteye giden hiçbir bağlantı olmasın (logo da tıklanmasın). Google Analytics (`gtag`) bu sayfadan kaldırılabilir.
- Sayfada yalnız şunlar kalsın:
  - Küçük Küp Arena / RA ID başlığı
  - "Google ile giriş yap" düğmesi
  - Girişten sonra "Küp Arena'ya dön" düğmesi (mevcut `kuparena://baglan?gid=...` dönüşü aynen kalsın)
  - Hata olursa kısa hata yazısı ve "Oyuna dön" düğmesi (`kuparena://baglan`)
- Mevcut `?donus=` doğrulaması ve `gid` mantığı **değişmesin**.

---

## 2) Firestore kuralları: kulüpler ve takas

Oyun iki yeni koleksiyon kullanıyor: `kaClubs` ve `kaTrades`. Aşağıdaki bloğu `firestore.rules` içinde, en sondaki `match /{document=**} { allow read, write: if false; }` satırından **önce** ekleyip yayınla. `isAdmin()` ve `suspended()` dosyada zaten var.

```
    // Küp Arena kulüpleri: kaClubs/{kod} (+ m: üyeler, c: sohbet, r: küp bağışı istekleri)
    match /kaClubs/{code} {
      function kaSigned() { return request.auth != null && !suspended(request.auth.uid); }
      function kaClub() { return get(/databases/$(database)/documents/kaClubs/$(code)).data; }
      function kaMember() { return exists(/databases/$(database)/documents/kaClubs/$(code)/m/$(request.auth.uid)); }
      function kaOk(d) {
        return d.keys().hasOnly(['name', 'desc', 'badge', 'owner', 'oName', 'ts'])
          && d.name is string && d.name.size() >= 2 && d.name.size() <= 24
          && d.desc is string && d.desc.size() <= 120
          && d.badge is int && d.badge >= 0 && d.badge <= 11
          && d.owner is string && d.oName is string && d.oName.size() <= 24;
      }
      allow read: if true;
      allow create: if kaSigned() && code.matches('^[A-Z0-9]{6}$') && kaOk(request.resource.data)
        && request.resource.data.owner == request.auth.uid && request.resource.data.ts == request.time;
      allow update: if kaSigned() && resource.data.owner == request.auth.uid && kaOk(request.resource.data);
      allow delete: if request.auth != null && (resource.data.owner == request.auth.uid || isAdmin());

      match /m/{uid} {
        allow read: if true;
        allow create, update: if kaSigned() && request.auth.uid == uid
          && request.resource.data.keys().hasOnly(['name', 'lvl', 'tr', 'title', 'w', 'wk', 'ts'])
          && request.resource.data.name is string && request.resource.data.name.size() <= 24
          && request.resource.data.lvl is int && request.resource.data.tr is int
          && request.resource.data.w is int && request.resource.data.w >= 0 && request.resource.data.w <= 5000
          && request.resource.data.wk is int
          && request.resource.data.title is string && request.resource.data.title.size() <= 24
          && request.resource.data.ts == request.time;
        allow delete: if request.auth != null && (request.auth.uid == uid || kaClub().owner == request.auth.uid || isAdmin());
      }

      match /c/{mid} {
        allow read: if request.auth != null && (kaMember() || isAdmin());
        allow create: if kaSigned() && kaMember() && mid.matches('^[a-z0-9]{6,24}$')
          && request.resource.data.keys().hasOnly(['u', 'n', 'x', 'ts'])
          && request.resource.data.u == request.auth.uid
          && request.resource.data.n is string && request.resource.data.n.size() <= 24
          && request.resource.data.x is string && request.resource.data.x.size() > 0 && request.resource.data.x.size() <= 200
          && request.resource.data.ts == request.time;
        allow delete: if request.auth != null && (resource.data.u == request.auth.uid || kaClub().owner == request.auth.uid || isAdmin());
        allow update: if false;
      }

      // Bağış isteği: belge = isteyen üyenin uid'i. Diğer üyeler got'u 1 artırır ve gv'ye kendi uid'ini ekler (istek başına bir kez).
      match /r/{uid} {
        allow read: if true;
        allow create: if kaSigned() && request.auth.uid == uid && kaMember()
          && request.resource.data.keys().hasOnly(['cube', 'name', 'need', 'got', 'gv', 'ts'])
          && request.resource.data.cube is string && request.resource.data.cube.matches('^[a-z0-9]{1,8}$')
          && request.resource.data.name is string && request.resource.data.name.size() <= 24
          && request.resource.data.need is int && request.resource.data.need >= 1 && request.resource.data.need <= 5
          && request.resource.data.got == 0 && request.resource.data.gv == {}
          && request.resource.data.ts == request.time;
        allow update: if kaSigned() && kaMember() && request.auth.uid != uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['got', 'gv'])
          && request.resource.data.got == resource.data.got + 1
          && request.resource.data.got <= resource.data.need
          && request.resource.data.gv.diff(resource.data.gv).affectedKeys().hasOnly([request.auth.uid])
          && !(request.auth.uid in resource.data.gv);
        allow delete: if request.auth != null && (request.auth.uid == uid || kaClub().owner == request.auth.uid || isAdmin());
      }
    }

    // Küp Arena takasları: kaTrades/{kod}. open → accepted (karşı taraf) → done (teklif sahibi); open → cancel (teklif sahibi)
    match /kaTrades/{code} {
      function ktSigned() { return request.auth != null && !suspended(request.auth.uid); }
      function ktKeys() { return ['from', 'fName', 'club', 'give', 'want', 'st', 'by', 'bName', 'ts']; }
      function ktChg() { return request.resource.data.diff(resource.data).affectedKeys(); }
      allow read: if true;
      allow create: if ktSigned() && code.matches('^[A-Z0-9]{6}$')
        && request.resource.data.keys().hasOnly(ktKeys())
        && request.resource.data.from == request.auth.uid
        && request.resource.data.fName is string && request.resource.data.fName.size() <= 24
        && request.resource.data.club is string && request.resource.data.club.size() <= 6
        && request.resource.data.give is string && request.resource.data.give.matches('^[a-z0-9]{1,8}$')
        && request.resource.data.want is string && request.resource.data.want.matches('^[a-z0-9]{1,8}$')
        && request.resource.data.give != request.resource.data.want
        && request.resource.data.st == 'open' && request.resource.data.by == '' && request.resource.data.bName == ''
        && request.resource.data.ts == request.time;
      allow update: if ktSigned() && request.resource.data.keys().hasOnly(ktKeys()) && (
          (resource.data.st == 'open' && request.resource.data.st == 'accepted'
            && request.resource.data.by == request.auth.uid && request.auth.uid != resource.data.from
            && request.resource.data.bName is string && request.resource.data.bName.size() <= 24
            && ktChg().hasOnly(['st', 'by', 'bName']))
          || (resource.data.from == request.auth.uid && resource.data.st == 'accepted'
            && request.resource.data.st == 'done' && ktChg().hasOnly(['st']))
          || (resource.data.from == request.auth.uid && resource.data.st == 'open'
            && request.resource.data.st == 'cancel' && ktChg().hasOnly(['st'])));
      allow delete: if request.auth != null && (resource.data.from == request.auth.uid || isAdmin());
    }
```

### Oyunun yaptığı sorgular (kuralların bunlara izin vermesi gerekiyor)

- `kaClubs` → `orderBy('ts', 'desc').limit(15)` (kulüp listesi)
- `kaClubs/{kod}/m` → `orderBy('tr', 'desc')`
- `kaClubs/{kod}/c` → `orderBy('ts', 'desc').limit(40)` (canlı dinleme, yalnız üyeler)
- `kaTrades` → `where('club', '==', kod).where('st', '==', 'open')` ve `where('from', '==', uid)` (+ `where('st', '==', 'accepted')`)

Bunlar tek alanlı otomatik dizinlerle çalışır, ek dizin gerekmemesi lazım. Konsol "index gerekli" derse verdiği bağlantıyla dizini oluştur.

### Not

Kurallar eklenmeden önce oyundaki Kulüp ve Takas ekranları "Kulüp sunucusu henüz açılmadı" der, oyunun geri kalanı etkilenmez.

---

## 3) Oyunu siteden de oynanabilir yap: `/kup-arena/oyna/`

Oyun tamamen statik (HTML + JS + CSS, derleme yok). Her yeni sürümde GitHub sürüm sayfasına web paketi konuyor:

`https://github.com/onlinecubeturkiye/rubiksimulation/releases/latest/download/KupArena-Web.zip`

Zip'in içi doğrudan `index.html`, `css/`, `js/`, `vendor/`, `fonts/` … (alt klasör yok). Tüm yollar göreli, yani alt klasörde sorunsuz çalışır.

Yapılacaklar:

1. **Senkron iş akışı:** Site reposuna `.github/workflows/kup-arena-web.yml` ekle. Günde birkaç kez (ör. `cron: '17 */6 * * *'`) ve elle (`workflow_dispatch`) çalışsın:
   - zip'i indir (`curl -L -o web.zip <yukarıdaki adres>`),
   - `kup-arena/oyna/` klasörünü silip zip'i oraya aç,
   - değişiklik varsa commit edip pushla (`permissions: contents: write`).
   Repo herkese açık olduğu için indirmek için anahtar gerekmez.
2. **Sayfa kabuğu yok:** `kup-arena/oyna/index.html` oyunun kendi sayfası. Sitenin üst barı, alt barı, reklamları, duyuruları, `common.js` / `i18n.js` gibi site betikleri bu klasöre **eklenmesin**.
3. **Service worker:** Sitenin `sw.js` dosyası `/kup-arena/oyna/` altını önbelleğe alıyorsa, oyunun eski sürümü takılı kalmasın diye bu yolu ağdan getirsin (network-first) ya da hiç önbelleğe almasın.
4. **Firebase:** Oyun aynı Firebase projesini kullanıyor. Web'de Google girişi açılır pencereyle (popup) yapılıyor. `rubikacademy.fun` zaten yetkili alanlarda olduğu için ek ayar gerekmemeli.
5. **Bağlantı:** `/kup-arena` tanıtım sayfasına "Tarayıcıda oyna" düğmesi koy → `/kup-arena/oyna/`.
