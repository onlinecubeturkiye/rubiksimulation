# Küp Arena'yı Google Play'e yükleme rehberi

## 0. Bir kerelik: imza şifresini GitHub'a ekle

Google Play, `.apk` değil imzalı `.aab` dosyası ister. İmza anahtarı repo herkese açık olduğu için repoda durmaz; GitHub'ın gizli değişkenlerinde saklanır.

1. GitHub'da repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. Name: `UPLOAD_KEY_PASSWORD` · Secret: sana verilen şifre → **Add secret**
3. Tekrar **New repository secret** → Name: `UPLOAD_KEYSTORE_B64` · Secret: sana verilen uzun anahtar metni (tamamı, boşluksuz)
4. **Actions** sekmesi → **Android APK** → **Run workflow** (ya da yeni bir commit)
5. Bitince **Releases** sayfasında `KupArena-GooglePlay.aab` ve `KupArena-Magaza.zip` çıkar.

> Şifreyi ve anahtar metnini kimseyle paylaşma, ikisini de bir yere yedekle. Kaybolursa Play Console'dan "yükleme anahtarını sıfırla" talebiyle yenisi alınabilir.

## 1. Play Console hesabı

- https://play.google.com/console → geliştirici hesabı (bir kerelik 25 $).
- **Kişisel hesaplarda kural:** üretime çıkmadan önce **en az 12 test kullanıcısıyla 14 gün kapalı test** zorunlu. Önce "Kapalı test" kanalına yükle, 12 arkadaşının e-postasını ekle, 14 gün oynasınlar.

## 2. Uygulama oluştur

- Ad: `Küp Arena: Paket Aç ve Savaş`
- Varsayılan dil: Türkçe
- Oyun · Ücretsiz

## 3. Uygulama içeriği (Politika → Uygulama içeriği)

| Bölüm | Cevap |
|---|---|
| Gizlilik politikası | `MAGAZA-METINLERI.md` içindeki adres |
| Uygulama erişimi | "Bazı işlevler kısıtlı" → 3 deneme maçından sonra RA ID girişi gerekir. İnceleme için bir test e-postası ve şifresi ver (rubikacademy.fun'da açtığın bir hesap). |
| Reklamlar | Hayır, reklam içermiyor |
| İçerik derecelendirmesi | Anketi doldur: Kategori "Oyun". Şiddet: yalnızca çizgi film tarzı, kan yok. Kumar: **gerçek para yok** ama "ödül kutuları/paketler" var → evet, "oyun içi para ile rastgele ödül" de. Kullanıcı etkileşimi yok (sohbet yok). Beklenen sonuç: PEGI 3–7 / Herkes. |
| Hedef kitle | **13 yaş ve üzeri** seç (13 altı seçilirse Aileler politikası ve ek kurallar gelir) |
| Veri güvenliği | Aşağıdaki tablo |
| Devlet uygulaması / Finans / Sağlık | Hayır |
| Haber uygulaması | Hayır |

### Veri güvenliği formu

- Veri toplanıyor mu: **Evet**
- Aktarım sırasında şifreleniyor mu: **Evet**
- Kullanıcı silme isteyebiliyor mu: **Evet** (gizlilik politikasındaki e-posta ile)
- Hesap silme bağlantısı: gizlilik politikası adresi (Verilerin silinmesi bölümü)

| Veri türü | Toplanıyor | Paylaşılıyor | Neden | Zorunlu mu |
|---|---|---|---|---|
| Kişisel bilgi → E-posta adresi | Evet | Hayır | Hesap yönetimi | Zorunlu |
| Kişisel bilgi → Ad | Evet | Hayır | Hesap yönetimi | Zorunlu |
| Kişisel bilgi → Kullanıcı kimlikleri | Evet | Hayır | Hesap yönetimi, Uygulama işlevleri | Zorunlu |
| Uygulama etkinliği → Diğer (oyun ilerlemesi) | Evet | Hayır | Uygulama işlevleri | Zorunlu |

Konum, rehber, fotoğraf, finans, sağlık, cihaz kimliği: **Hayır**.

## 4. Mağaza girişi (Büyüme → Mağaza varlığı → Ana mağaza girişi)

- Metinler: `MAGAZA-METINLERI.md`
- Simge: `simge-512.png`
- Öne çıkan grafik: `tanitim-1024x500.png`
- Telefon ekran görüntüleri: `ekran-goruntuleri/` içindeki 7 görsel
- İletişim e-postası: kendi e-postan

## 5. Sürüm yükle

Test → Kapalı test → Yeni sürüm → `KupArena-GooglePlay.aab` dosyasını yükle.
"Play Uygulama İmzalama"yı kabul et (Google kendi anahtarıyla imzalar, sen yalnızca yükleme anahtarıyla imzalarsın).

Sürüm notu örneği:
```
İlk sürüm: küp kutuları, macera, arena rütbeleri, atölye ve RA ID ile bulut kaydı.
```

## 6. İncelemeye gönder

Tüm bölümler yeşil tik olunca **Sürümü incelemeye gönder**. İlk inceleme birkaç gün sürebilir.

## Not

- Telefona doğrudan kurmak için `KupArena.apk` kullanılmaya devam edilebilir. Play'den indirilen sürüm farklı imzalı olduğu için, APK'yı kaldırıp Play sürümünü kurman gerekir (RA ID ile giriş yaptıysan ilerlemen buluttan geri gelir).
- Hedef Android sürümü: API 36 (Google'ın güncel şartı).
