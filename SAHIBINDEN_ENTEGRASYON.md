# Sahibinden İlan Entegrasyonu (Tek Tıkla Otomatik)

Mağaza: <https://sivastoprakgayrimenkulsivas.sahibinden.com/>

## Neden bu yöntem? (test sonuçları)

| Yöntem | Sonuç |
|---|---|
| Sunucudan `fetch` | `403` — Cloudflare engelliyor |
| Headless tarayıcı | `403` — `checkLoading` tuzağında takılıyor |
| Görünür tarayıcı, 90 sn bekleme | Kendiliğinden geçemiyor, insan tıklaması şart |
| **Yer imi + yerel alıcı** | ✅ **Çalışıyor** — kullanıcının kendi tarayıcısındaki DOM okunur, engel yok |

sahibinden'in koruması **sunucu/bot** trafiğini engeller; sizin kendi tarayıcınızda
açtığınız mağaza sayfasının içeriğini okumak ise tamamen serbesttir. Altyapı bunu
kullanır: tek tık → ilanlar siteye düşer.

## Kurulum — bir kez, 1 dakika

Hiçbir şey kurmanıza gerek yok. `http://localhost:8443/#yonetim` adresini açın;
**Yöntem A** sizi yönlendirir (konsol kodu + dosya bırakma).

## Günlük kullanım — 2 adım, 1 dakika

1. Mağaza sayfasında `F12` → **Konsol** → `#yonetim` panelindeki
   **"Konsol kodunu kopyala"** ile alınan kodu yapıştır → `Enter` →
   `ilanlar.json` dosyası iner (kaç ilan/fiyat/fotoğraf bulunduğu uyarıda yazar).
2. İnen dosyayı `#yonetim` panelindeki kutuya sürükleyin → ilanlar sitede.
3. Birden çok sayfa varsa her sayfada tekrarlayın; alıcı **birleştirir**.

## Nasıl çalışıyor?

```
Mağaza sayfası (sizin tarayıcınız, Cloudflare'den zaten geçmiş)
      │  yer imi: DOM'dan kartları okur (başlık, fiyat, konum, foto, link)
      │  window.postMessage → http://localhost:8443/#yonetim
      ▼
Site (#yonetim paneli) → POST /__ilan-sync
      │  (vite dev alıcısı: doğrular, temizler, mevcutla birleştirir)
      ▼
public/ilanlar.json  →  site otomatik tazelenir
```

- Alıcı **sadece dev sunucusunda** yaşar (`vite.config.ts` → `ilanSyncReceiver`,
  `apply: 'serve'`); üretim derlemesine dahil olmaz.
- **Bağlantılar** kanonikleştirilir (`origin + path`, takip parametreleri atılır);
  yalnızca `sahibinden.com/ilan/` biçimi kabul edilir.
- **Fotoğraflar** aktarımdan hemen sonra arka planda `public/ilan-images/` altına
  indirilir (tarayıcı başlığı + Referer ile) ve ilanlar yerel yola çevrilir;
  indirilemeyenler uzak URL'de kalır, yüklenemezse kartta yer tutucu görünür.
  Panel "sitede N fotoğraf kayıtlı" bilgisini gösterir.
- Güvenlik: yalnızca `sahibinden.com/ilan/` URL'leri kabul edilir, boyut 5 MB ile
  sınırlıdır, gelen veri istemcide de (`isValidIncoming`) doğrulanır.
- Yayınlanan (production) site, depodaki `public/ilanlar.json` dosyasını kullanır;
  aktarımdan sonra commit + deploy yeterlidir.

## Dosya haritası

| Dosya | Görev |
|---|---|
| `src/lib/bookmarklet.ts` | Yer imi kodu + gelen veri doğrulama |
| `src/components/IlanYonetimi.tsx` | `#yonetim` paneli: yer imi kurulumu, alıcı durumu, aktarım onayı |
| `vite.config.ts` → `ilanSyncReceiver()` | Yerel alıcı: `GET/POST /__ilan-sync` |
| `src/lib/sahibinden.ts` | Tipler, `STORE_URL`, yedek HTML ayrıştırıcı |
| `src/hooks/useListings.ts` | `/ilanlar.json` okur, 5 dk'da bir tazeler |
| `src/components/ListingsSection.tsx` | Canlı kart ızgarası: arama, filtre, senkron rozeti |
| `public/ilanlar.json` | Önbellek; site burayı okur |
| `scripts/oto-sync.mjs` | Deneysel: gerçek Chromium ile çekiş (etkileşimli doğrulama gerekebilir) |
| `scripts/sync-sahibinden.mjs` | Yedek: kayıtlı HTML'den dönüştürme (`--from-file`) |

## Notlar

- Kartlar trafiği sahibinden'e yönlendirir (`"İlanı sahibinden.com'da aç →"`).
  Fotoğraf yüklenemezse yer tutucu gösterilir; görseller sunucunuza kopyalanmaz.
- Zamanlanmış görev (`kur-otomatik.bat`) yalnızca deneysel Chromium yolunu kullanır;
  ana akış yer imidir.
