# Küp Arena

Paket aç, küp topla, maceraya çık, savaş ve çöz. Telefonda (Android uygulaması) ve tarayıcıda çalışan bir küp oyunu. İnternetsiz oynanabilir.

## Oyun

- **Macera:** 6 dünya × 6 bölüm (Oyuncak Kasabası, Buz Vadisi, Ateş Dağı, Altın Çöl, Galaksi Kalesi, Kaos Boyutu). Her dünyada savaşlar, bir küp bulmacası ve bir boss var. Bölümlerden 1–3 yıldız alınır, her boss nadir bir bulmaca verir.
- **Sonsuz Kule:** Bitmeyen mod. Kat kat zorlaşır, her 5 katta kayıt noktası, her 10 katta muhafız.
- **Arena:** Kupa maçları ve ligler (Bronz → Efsane), sıralama listesi.
- **2 kişilik maç:** Aynı telefonda arkadaşınla. Herkes 3 bulmaca seçer, sırayla oynarsınız.
- **Mağaza:** 3 paket, her 3 saatte bedava paket, günlük hediye, günün fırsatı.
- **Envanter:** 26 bulmaca. Kopyalar seviye yükseltir, jetonla güçlendirme, fazlaları satma.
- **Çöz:** 3B küp simülatörü (2×2–7×7), günlük bulmaca, ipucu.
- **Amaçlar:** Günlük görevler, 22 başarım, oyuncu seviyesi (her 5 seviyede bedava paket).

### Savaş

Sıra tabanlı. Her bulmacanın saldırısı ve bir yeteneği var (3 turda bir). Tür avantajı: **Küp > Piramit > Özel > Küp** (1,3 kat hasar). Sıran gelince yedeğe dokunup bulmaca değiştirebilirsin. "Oto" ile savaş kendi kendine oynanır.

İlerleme cihazda saklanır. Profil → Ayarlar → "Kaydı yedekle" ile kod alıp başka cihaza taşıyabilirsin.

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
