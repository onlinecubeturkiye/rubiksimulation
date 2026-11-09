# Küp Arena

Paket aç, küp topla, maceraya çık, savaş ve çöz. Telefonda (Android uygulaması) ve tarayıcıda çalışan bir küp oyunu. İnternetsiz oynanabilir.

## Oyun

- **Küp kutuları:** Her galibiyette gerçek speedcube ambalajlarından esinlenen bir kutu (Karton, Pencereli, Premium, Koleksiyon, Şeffaf Vitrin). 4 raf, aynı anda bir kutu açılır, jetonla hemen açılabilir. Rakip küplerini yenerek günde 10 taç topla, Şampiyon Kutusu'nu aç.
- **Enerji:** Savaşta yetenekler enerji harcar; enerji her turda dolar.
- **İfadeler:** Savaşta ifade balonları gönder, bilgisayar rakip de cevap verir.

- **Öğretici:** İlk açılışta Küpi adlı rehber ekranı adım adım tanıtır, ilk savaşta ipuçları verir. Profil → Nasıl oynanır? ile tekrar izlenir.

- **Ana Ekran:** Vitrin küpü, büyük OYNA düğmesi, görevler, günlük giriş, çark, sandık ve sezon kısayolları.
- **Sezon Yolu:** Her 28 günde yenilenen 30 kademeli ödül yolu (son ödül Mitik küp). Oynayarak kazanılan XP ile ilerler.
- **Haftalık etkinlik:** Her hafta değişir (Çift Jeton, Piramit Festivali, Kule Haftası, Marka Haftası).

- **Macera:** 6 dünya × 6 bölüm (Oyuncak Kasabası, Buz Vadisi, Ateş Dağı, Altın Çöl, Galaksi Kalesi, Kaos Boyutu). Her dünyada savaşlar, bir küp bulmacası ve bir boss var. Bölümlerden 1–3 yıldız alınır, her boss nadir bir bulmaca verir.
- **Sonsuz Kule:** Bitmeyen mod. Kat kat zorlaşır, her 5 katta kayıt noktası, her 10 katta muhafız.
- **Arena ve rütbe:** 15 basamaklı rütbe (Bronz III → Efsane), rütbe koruması, rütbe atlama ödülleri ve 28 günlük rütbe sezonu. Her 6 saatte değişen modlar: Klasik, Enerji Fırtınası, Kritik Gecesi, Dev Küpler, Teke Tek. Her 100 kupada ödül veren Kupa Yolu.
- **Atölye:** Jeton Madeni, Antrenman Salonu, Kutu Deposu ve Laboratuvar yükseltilir (tek Usta Robot). Küp çözmek isteyenler için Küp Masası (3B küp, günlük bulmaca).
- **2 kişilik maç:** Aynı telefonda arkadaşınla. Herkes 3 bulmaca seçer, sırayla oynarsınız.
- **Mağaza:** 3 paket, her 3 saatte bedava paket, günlük hediye, günün fırsatı.
- **Markalar:** 5 kurgusal küp markası (ZENKO, KAIRO, HAYATE, TORVA, VEXA). Her birinin kendi logosu, modelleri, marka kutusu ve savaşta bir avantajı var. Gerçek markalarla ilgisi yoktur.
- **Envanter:** 26 bulmaca. Kopyalar seviye yükseltir, jetonla güçlendirme, fazlaları satma.
- **Amaçlar:** Günlük görevler, 22 başarım, oyuncu seviyesi (her 5 seviyede bedava paket).

### Savaş

Sıra tabanlı. Saldırırken güç çubuğunu doğru anda durdur (MÜKEMMEL vuruş), rakip saldırırken halka kalkana değince SAVUN'a bas (hasar yarıya iner). Her bulmacanın saldırısı ve bir yeteneği var (3 turda bir). Tür avantajı: **Küp > Piramit > Özel > Küp** (1,3 kat hasar). Sıran gelince yedeğe dokunup bulmaca değiştirebilirsin. "Oto" ile savaş kendi kendine oynanır.

İlerleme cihazda saklanır. Profil → Ayarlar → "Kaydı yedekle" ile kod alıp başka cihaza taşıyabilirsin.

## RA ID (Rubik Academy hesabı)

Giriş, rubikacademy.fun ile aynı Firebase projesini kullanır. Oyun kaydı `users/{uid}/kv/kup-arena` belgesinde durur. Sitede yapılacaklar: [docs/RUBIK_ACADEMY_ENTEGRASYON.md](docs/RUBIK_ACADEMY_ENTEGRASYON.md).

## Android APK

Her push'ta GitHub Actions APK'yı derler ve **Releases** bölümüne koyar:

1. GitHub'da depo sayfasında sağdaki **Releases** bölümüne gir.
2. En yeni sürümde **KupArena.apk** dosyasını indir ve telefonda aç.
3. İlk kurulumda "bilinmeyen kaynaklardan yükleme" izni istenebilir.

Yeni sürümler eskisinin üstüne kurulur, ilerleme silinmez (sabit debug anahtarı: `signing/debug.keystore`, yalnızca test sürümleri için).

## Tarayıcıda çalıştırma

```bash
npx http-server www -p 8080
```

## Kendi bilgisayarında Android derlemesi

```bash
npm install
npx cap add android
npm run android:assets
npx cap sync android
npx cap open android
```

## Klasörler

- `www/`: oyunun kendisi (HTML, CSS, JS, yazı tipleri, Three.js)
- `assets/`: uygulama ikonu ve açılış ekranı kaynakları
- `.github/workflows/android.yml`: APK derleme

## Yol haritası

- Çevrimiçi çok oyunculu savaş ve gerçek sıralama (sunucu gerekir, ör. Firebase)
- Piramit ve megaküp için 3B simülasyon
- Google Play için imzalı sürüm (AAB)
