// Sahibinden mağaza ilan altyapısı — tipler, sabitler ve HTML ayrıştırıcılar.
//
// Neden direkt fetch yok?
// sivastoprakgayrimenkulsivas.sahibinden.com Cloudflare bot koruması arkasında.
// Tarayıcıdan veya sunucudan çıplak fetch → HTTP 403 ("Just a moment...").
// Bu yüzden altyapı 3 katmanlıdır:
//   1) `public/ilanlar.json` → sitenin okuduğu önbellek (hızlı, SEO dostu)
//   2) `scripts/sync-sahibinden.mjs` → önbelleği güncelleyen senkron betiği
//   3) `useListings` + `ListingsSection` → önbelleği ekrana basan UI
//
// Otomatikleştirme seçenekleri SAHIBINDEN_ENTEGRASYON.md dosyasında anlatılıyor.

export const STORE_URL =
  'https://sivastoprakgayrimenkulsivas.sahibinden.com/';

export const STORE_SEARCH_URL =
  'https://www.sahibinden.com/emlak?query_text_mf=sivastoprakgayrimenkulsivas&query_text=sivastoprakgayrimenkulsivas';

export interface Listing {
  id: string;
  title: string;
  price: string;
  priceNumeric: number | null;
  location: string;
  category: string;
  image: string;
  url: string;
  date?: string;
  brutto?: string;
  oda?: string;
  area?: string;
  photos?: string[];
  desc?: string;
  ilanNo?: string;
}

export interface ListingsCache {
  updatedAt: string;
  source: string;
  count: number;
  listings: Listing[];
  note?: string;
}

/** Kök-göreli varlık yolunu derleme tabanına uydurur (GitHub Pages proje yolu). */
export function assetUrl(u: string): string {
  if (!u) return u;
  if (u.startsWith('/')) return `${import.meta.env.BASE_URL}${u.slice(1)}`;
  return u;
}

export const FALLBACK_LISTINGS: Listing[] = [
  {
    id: 'fallback-1',
    title: 'Esentepe Mahallesi, No. 14 — Satılık Daire',
    price: '₺4.850.000',
    priceNumeric: 4850000,
    location: 'Sivas Merkez',
    category: 'Satılık',
    image:
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=560&fit=crop&auto=format',
    url: STORE_URL,
  },
  {
    id: 'fallback-2',
    title: 'Kızılırmak Caddesi, No. 7 — Yeni Proje',
    price: '₺7.200.000',
    priceNumeric: 7200000,
    location: 'Sivas Merkez',
    category: 'Yeni Proje',
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=560&fit=crop&auto=format',
    url: STORE_URL,
  },
  {
    id: 'fallback-3',
    title: 'Bağlarbaşı Sokak, No. 22 — Özel Portföy',
    price: '₺11.500.000',
    priceNumeric: 11500000,
    location: 'Sivas Merkez',
    category: 'Özel Portföy',
    image:
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=560&fit=crop&auto=format',
    url: STORE_URL,
  },
];

/** "₺4.850.000" → 4850000 */
export function parsePriceToNumber(price: string): number | null {
  const digits = price.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Başlıktan kaba kategori tahmini (Satılık / Kiralık / Arsa / İşyeri / Konut). */
export function guessCategory(title: string): string {
  const t = title.toLocaleLowerCase('tr');
  if (t.includes('kiralık')) return 'Kiralık';
  if (t.includes('arsa') || t.includes('tarla') || t.includes('bahçe')) return 'Arsa';
  if (t.includes('işyeri') || t.includes('dükkan') || t.includes('ofis')) return 'İşyeri';
  if (t.includes('villa') || t.includes('müstakil')) return 'Villa';
  return 'Satılık';
}

/** Göreli sahibinden URL'sini mutlak URL'ye çevirir. */
export function absolutize(href: string): string {
  if (!href) return STORE_URL;
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `https://www.sahibinden.com${href}`;
  return href;
}

/**
 * Mağaza / arama sayfası HTML'inden ilanları çıkarır.
 * Bağımlılık gerektirmez; regex tabanlıdır ve sahibinden'in klasik
 * `searchResultsRowClass` satır yapısı + genel `<a href="/ilan/...">` yedeğini dener.
 */
export function parseListingsFromHtml(html: string): Listing[] {
  const out: Listing[] = [];
  const seen = new Set<string>();

  const push = (l: Listing) => {
    if (!l.url || seen.has(l.url)) return;
    // sahibinden dışı linkleri ele
    if (!l.url.includes('sahibinden.com')) return;
    seen.add(l.url);
    out.push(l);
  };

  // 1) Klasik arama satırları: <tr class="searchResultsRowClass ..."> ... </tr>
  const rowRe =
    /<tr[^>]*searchResultsRowClass[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null && out.length < 200) {
    const body = row[1] ?? '';
    const hrefM = body.match(/href="(\/ilan\/[^"]+)/);
    if (!hrefM) continue;
    const url = absolutize(hrefM[1]);
    const titleM =
      body.match(/title="([^"]{5,200})"/) ||
      body.match(/class="[^"]*searchResultsTitleValue[^"]*"[^>]*>([^<]{5,200})</);
    const priceM = body.match(
      /searchResultsPriceValue[^>]*>[\s\S]*?([0-9][0-9.\s]*\s*TL)/i,
    );
    const imgM = body.match(/(?:data-src|src)="(https?:\/\/[^"]+|[^"]*\.jpg[^"]*)"/i);
    const locM = body.match(
      /searchResultsLocationValue[^>]*>([^<]{2,120})</i,
    );
    const title = (titleM?.[1] ?? 'Sahibinden İlanı').trim();
    const price = (priceM?.[1] ?? 'Fiyat sorunuz').replace(/\s+/g, ' ').trim();
    const image = imgM
      ? absolutize(imgM[1].replace(/&amp;/g, '&'))
      : '';
    push({
      id: `sh-${out.length + 1}`,
      title,
      price,
      priceNumeric: parsePriceToNumber(price),
      location: (locM?.[1] ?? 'Sivas').replace(/\s+/g, ' ').trim(),
      category: guessCategory(title),
      image,
      url,
    });
  }

  // 2) Yedek: sayfadaki tüm /ilan/ linkleri
  if (out.length === 0) {
    const linkRe = /<a[^>]+href="(\/ilan\/[^"]+)"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html)) !== null && out.length < 200) {
      const url = absolutize(m[1]);
      const text = m[2]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);
      if (text.length < 8) continue;
      push({
        id: `sh-${out.length + 1}`,
        title: text,
        price: 'Fiyat için ilana bakın',
        priceNumeric: null,
        location: 'Sivas',
        category: guessCategory(text),
        image: '',
        url,
      });
    }
  }

  return out;
}

/** Önbellek yaşını "2 saat önce" gibi okunabilir metne çevirir. */
export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'bilinmiyor';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'az önce';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}
