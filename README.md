# Küp Arena

Paket aç, küp topla, savaş ve çöz. Telefonda ve tarayıcıda çalışan bir küp oyunu.

## Neler var

- **Mağaza:** 3 paket (Klasik, Usta, Efsane). Her paketten nadirliğine göre 1 bulmaca çıkar. Günlük 150 jeton hediyesi.
- **Envanter:** 26 bulmaca (2×2–7×7 küpler, piramitler, megaküp, eğik küp, ayna küp). Aynı bulmaca tekrar gelirse seviyesi yükselir, fazlası satılabilir.
- **Savaş:** 3 bulmacalık takımla sıra tabanlı savaş. Her bulmacanın bir yeteneği var. Kazanınca jeton ve kupa.
- **Sıralama:** Kupaya göre sıralama (şimdilik bilgisayar rakipler).
- **Çöz:** 3B küp simülatörü. Sahip olduğun küpleri karıştır ve çöz, jeton kazan.

İlerleme cihazda saklanır.

## Tarayıcıda çalıştırma

```bash
npx http-server www -p 8080
```

Sonra `http://localhost:8080` adresini aç.

## Android APK

Her push'ta GitHub Actions APK'yı derler:

1. GitHub'da depoda **Actions** sekmesine gir.
2. En son **Android APK** çalışmasını aç.
3. Altta **kup-arena-apk** dosyasını indir, zip'i aç, `app-debug.apk` dosyasını telefona kur
   (bilinmeyen kaynaklardan yüklemeye izin vermen gerekir).

Kendi bilgisayarında derlemek için (Android Studio gerekir):

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

## Yol haritası

- Çevrimiçi çok oyunculu savaş ve gerçek sıralama (sunucu gerekir, örn. Firebase).
- Piramit ve megaküp için 3B simülasyon.
- Google Play için imzalı sürüm (AAB).
