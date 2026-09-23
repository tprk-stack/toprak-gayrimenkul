#!/usr/bin/env node
/**
 * Magaza senkron betigi (yedek/elle kullanim) — bagimlilik gerektirmez (yalnizca Node 18+).
 *
 * Kullanim:
 *   npm run ilan:sync                                  → canli cekmeyi dener (koruma cogunlukla engeller, eski onbellek korunur)
 *   npm run ilan:sync -- --from-file=sayfa.html        → kaydedilmis magaza HTML'inden ayristirir (ONERILEN manuel adim)
 *   npm run ilan:sync -- --from-file=sayfa.html --out=public/ilanlar.json
 *   npm run ilan:sync -- --urls=urls.txt               → satir satir ilan linklerinden kart uretir
 *
 * Neden --from-file?
 * Kaynak site bot korumasi arkasinda; ciplak fetch cogu zaman engellenir.
 * Guvenilir akis: tarayicida magazayi ac → Ctrl+S (Web sayfasi, yalnizca HTML) → bu betige ver.
 * Otomatik akis icin ILAN-SENKRONIZASYON.md dosyasina bakin.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const STORE_URL = 'https://sivastoprakgayrimenkulsivas.sahibinden.com/';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : ['_', a];
  }),
);

const OUT = resolve(process.cwd(), String(args.out ?? 'public/ilanlar.json'));

function absolutize(href) {
  if (!href) return STORE_URL;
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `https://www.sahibinden.com${href}`;
  return href;
}

function parsePriceToNumber(price) {
  const digits = String(price).replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}

function guessCategory(title) {
  const t = String(title).toLocaleLowerCase('tr');
  if (t.includes('kiralık')) return 'Kiralık';
  if (t.includes('arsa') || t.includes('tarla') || t.includes('bahçe')) return 'Arsa';
  if (t.includes('işyeri') || t.includes('dükkan') || t.includes('ofis')) return 'İşyeri';
  if (t.includes('villa') || t.includes('müstakil')) return 'Villa';
  return 'Satılık';
}

function parseListingsFromHtml(html) {
  const out = [];
  const seen = new Set();
  const push = (l) => {
    if (!l.url || seen.has(l.url)) return;
    if (!l.url.includes('sahibinden.com')) return;
    seen.add(l.url);
    out.push(l);
  };

  const rowRe = /<tr[^>]*searchResultsRowClass[^>]*>([\s\S]*?)<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(html)) !== null && out.length < 200) {
    const body = row[1] ?? '';
    const hrefM = body.match(/href="(\/ilan\/[^"]+)/);
    if (!hrefM) continue;
    const url = absolutize(hrefM[1]);
    const titleM =
      body.match(/title="([^"]{5,200})"/) ||
      body.match(/class="[^"]*searchResultsTitleValue[^"]*"[^>]*>([^<]{5,200})</);
    const priceM = body.match(/searchResultsPriceValue[^>]*>[\s\S]*?([0-9][0-9.\s]*\s*TL)/i);
    const imgM = body.match(/(?:data-src|src)="(https?:\/\/[^"]+|[^"]*\.jpg[^"]*)"/i);
    const locM = body.match(/searchResultsLocationValue[^>]*>([^<]{2,120})</i);
    const title = (titleM?.[1] ?? 'Sahibinden İlanı').trim();
    const price = (priceM?.[1] ?? 'Fiyat sorunuz').replace(/\s+/g, ' ').trim();
    push({
      id: `sh-${out.length + 1}`,
      title,
      price,
      priceNumeric: parsePriceToNumber(price),
      location: (locM?.[1] ?? 'Sivas').replace(/\s+/g, ' ').trim(),
      category: guessCategory(title),
      image: imgM ? absolutize(imgM[1].replace(/&amp;/g, '&')) : '',
      url,
    });
  }

  if (out.length === 0) {
    const linkRe = /<a[^>]+href="(\/ilan\/[^"]+)"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null && out.length < 200) {
      const url = absolutize(m[1]);
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
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

function parseUrlsFile(text) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((u, i) => {
      const url = u.startsWith('http') ? u : `https://www.sahibinden.com${u.startsWith('/') ? '' : '/'}${u}`;
      const id = url.match(/\/(\d+)(?:\/|$)/)?.[1] ?? `${i + 1}`;
      return {
        id: `manuel-${id}`,
        title: `Sahibinden İlanı ${id}`,
        price: 'Fiyat için ilana bakın',
        priceNumeric: null,
        location: 'Sivas',
        category: 'Satılık',
        image: '',
        url,
      };
    });
}

function writeCache(listings) {
  const payload = {
    updatedAt: new Date().toISOString(),
    source: STORE_URL,
    count: listings.length,
    listings,
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`✓ ${listings.length} ilan → ${OUT}`);
}

async function tryLiveFetch() {
  console.log(`Canlı çekiş deneniyor: ${STORE_URL}`);
  const res = await fetch(STORE_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  console.log(`HTTP ${res.status}`);
  if (res.status === 403) {
    console.log(
      '✕ Cloudflare bot koruması (403). Canlı otomatik çekiş bu ortamdan yapılamıyor.\n' +
        '  Çözüm: mağaza sayfasını tarayıcıda açıp Ctrl+S ile kaydedin, sonra:\n' +
        '  npm run ilan:sync -- --from-file=sayfa.html',
    );
    return null;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseListingsFromHtml(html);
}

async function main() {
  if (args['from-file']) {
    const file = resolve(process.cwd(), String(args['from-file']));
    if (!existsSync(file)) throw new Error(`Dosya bulunamadı: ${file}`);
    const html = readFileSync(file, 'utf-8');
    const listings = parseListingsFromHtml(html);
    if (listings.length === 0) {
      console.log('✕ HTML içinde ilan bulunamadı. Sayfa kaynağını eksiksiz kaydettiğinizden emin olun.');
      process.exitCode = 2;
      return;
    }
    writeCache(listings);
    return;
  }
  if (args.urls) {
    const file = resolve(process.cwd(), String(args.urls));
    const listings = parseUrlsFile(readFileSync(file, 'utf-8'));
    writeCache(listings);
    return;
  }
  const listings = await tryLiveFetch();
  if (listings && listings.length > 0) writeCache(listings);
  else {
    console.log('Önbellek değiştirilmedi (mevcut public/ilanlar.json korunuyor).');
    process.exitCode = 3;
  }
}

main().catch((e) => {
  console.error('Hata:', e.message);
  process.exitCode = 1;
});
