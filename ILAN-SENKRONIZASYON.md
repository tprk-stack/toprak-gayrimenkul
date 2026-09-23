# İlan Senkronizasyonu

Bu site, dış ilan portalındaki mağaza sayfasındaki ilanları listeler.
Bu site ilgili portaldan bağımsızdır; ilan bilgileri bilgilendirme amaçlıdır,
güncel fiyat ve detaylar için her karttaki bağlantıdan kaynağa bakınız.

## Otomatik akış

Her sabah iki adımda çalışır (bilgisayar açıkken):

```
08:00  Chrome eklentisi (scripts/uzanti) mağaza sayfalarını gezer,
       detayları okur, fotoğrafları + ilanlar.json dosyasını indirir
       → %USERPROFILE%\Downloads\toprak-senkron\
08:30  scripts/sabah-senkron.bat dosyaları siteye yerleştirir,
       değişiklik varsa commit + push eder (canlı site güncellenir)
```

Neden eklenti? Kaynak sitenin koruması sunucusuz/otomatik tarayıcıları
engellemektedir; eklenti sizin gerçek tarayıcınızın içinden, kendi
oturumunuzla çalıştığı için engele takılmaz.

### Kurulum (bir kez)

1. `scripts/sabah-senkron-kur.bat` dosyasını çalıştırın
   (gerekirse sağ tık → "Yönetici olarak çalıştır").
   Bu, git kimliğini ve her sabah 08:30 görevini kurar.
2. Chrome'da `chrome://extensions` adresini açın →
   sağ üstte **Geliştirici modu**nu açın →
   **"Paketlenmemiş öğe yükle"** → `scripts/uzanti` klasörünü seçin.
3. Mağaza sayfasını normal sekmede açık bırakın (gizli sekme değil).
4. İsterseniz eklenti simgesine tıklayıp ilk senkronu hemen başlatın.

Kayıtlar: `%LOCALAPPDATA%\ToprakIlanSync\sabah-sync.log`

Senkron o gün çalışamazsa (bilgisayar kapalıysa, Chrome kapalıysa ya da
kaynak site o an ek doğrulama isterse) eski veri korunur, boş commit
atılmaz; ertesi sabah tekrar denenir.

## Yedek yöntem (elle)

Kaynak sayfanın HTML'ini kaydedip dönüştürme:

```bash
npm run ilan:sync -- --from-file=sayfa.html
npm run ilan:sync -- --urls=urls.txt
```

## Dosya haritası

| Dosya | Görev |
|---|---|
| `scripts/uzanti/` | Chrome eklentisi (manifest, arka plan, içerik betiği) |
| `scripts/dogrula.mjs` | İndirilenleri doğrular, siteye yerleştirir (`npm run ilan:dogrula`) |
| `scripts/sabah-senkron.bat` | Günlük iş: yerleştir + commit + push |
| `scripts/sabah-senkron-kur.bat` | Zamanlanmış görev kurulumu |
| `scripts/elle-aktar.mjs` | Yedek: kayıtlı HTML/URL listesinden dönüştürme |
| `src/lib/ilanlar.ts` | Tipler, mağaza adresi, fiyat/kategori yardımcıları |
| `src/hooks/useListings.ts` | `/ilanlar.json` okur, 5 dk'da bir tazeler |
| `src/components/ListingsSection.tsx` | Kart ızgarası: arama, filtre, sayfalama, hover + detay penceresi |
| `src/components/ListingModal.tsx` | Cam efektli ilan detay penceresi |
| `public/ilanlar.json` | Önbellek; site burayı okur |
| `public/ilan-images/` | İndirilen ilan fotoğrafları (siteyle birlikte yayınlanır) |

## Notlar

- Fotoğraflar eklentiyle gerçek oturumdan indirilir, `public/ilan-images/`
  altına taşınır; indirilemeyen karede uzak adres korunur.
- Bağlantılar sadeleştirilir (`origin + path`); yalnızca ilan detay adresleri
  kabul edilir.
