#!/usr/bin/env node
/**
 * OTOMATİK sahibinden senkron motoru — kur bir kez, unut.
 *
 *   npm run ilan:oto
 *
 * Nasıl çalışır?
 *  1) Gerçek Chromium'u kalıcı profille (.browser-profile) açar.
 *  2) Mağaza sayfasına gider, ilan kartlarını DOM'dan okur, public/ilanlar.json yazar.
 *  3) Cloudflare ilk seferde insan doğrulaması isterse tarayıcıyı görünür açar,
 *     siz 10 saniyede kutucuğu işaretlersiniz; "cf_clearance" çerezi aylarca
 *     saklanır, sonraki tüm çalışmalar (zamanlanmış görev dahil) sessizce geçer.
 *
 * Zamanlama: scripts/kur-otomatik.bat dosyasını çift tıklayın →
 * her gün 09:00'da sessizce çalışır.
 */
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/ilanlar.json');
// Profil proje DIŞINDA tutulur: hem git'e karışmaz hem de Vite izleyicisini çökertmez.
const PROFILE = join(
  process.env.LOCALAPPDATA || join(os.homedir(), '.toprak-ilan-sync'),
  'ToprakIlanSync',
  'browser-profile',
);
const STORE_URL = 'https://sivastoprakgayrimenkulsivas.sahibinden.com/';

const SESSIZ = process.argv.includes('--sessiz');
const log = (...a) => {
  if (!SESSIZ) console.log(...a);
};

function absolutize(href) {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `https://www.sahibinden.com${href}`;
  return href;
}

function priceNum(p) {
  const d = String(p).replace(/[^0-9]/g, '');
  return d ? Number(d) : null;
}

function kategori(title) {
  const t = String(title).toLocaleLowerCase('tr');
  if (t.includes('kiralık')) return 'Kiralık';
  if (t.includes('arsa') || t.includes('tarla') || t.includes('bahçe')) return 'Arsa';
  if (t.includes('işyeri') || t.includes('dükkan') || t.includes('ofis')) return 'İşyeri';
  if (t.includes('villa') || t.includes('müstakil')) return 'Villa';
  return 'Satılık';
}

async function challenged(page) {
  const url = page.url();
  const title = await page.title().catch(() => '');
  return (
    url.includes('checkLoading') ||
    /bir dakika lütfen|just a moment/i.test(title)
  );
}

/** Sayfadaki ilanları DOM'dan çıkarır (klasik satır yapısı + genel yedek). */
async function extract(page) {
  return await page.evaluate(() => {
    const abs = (h) => {
      if (!h) return '';
      if (/^https?:/.test(h)) return h;
      if (h.startsWith('//')) return 'https:' + h;
      if (h.startsWith('/')) return 'https://www.sahibinden.com' + h;
      return h;
    };
    const out = [];
    const seen = new Set();
    const push = (l) => {
      if (!l.url || seen.has(l.url) || !l.url.includes('sahibinden.com')) return;
      seen.add(l.url);
      out.push(l);
    };
    // 1) Klasik arama/vitrin satırları
    document.querySelectorAll('tr.searchResultsRowClass').forEach((tr) => {
      const a = tr.querySelector('a[href*="/ilan/"]');
      if (!a) return;
      const url = abs(a.getAttribute('href'));
      const title =
        (a.getAttribute('title') || a.textContent || '').trim().slice(0, 160) ||
        'Sahibinden İlanı';
      const price = (tr.querySelector('.searchResultsPriceValue')?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      const loc = (tr.querySelector('.searchResultsLocationValue')?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      const img =
        tr.querySelector('img')?.getAttribute('data-src') ||
        tr.querySelector('img')?.getAttribute('src') ||
        '';
      push({ title, price: price || 'Fiyat için ilana bakın', location: loc || 'Sivas', image: abs(img), url });
    });
    // 2) Vitrin kartları (mağaza ön yüzü farklı markup kullanabilir)
    document.querySelectorAll('a[href*="/ilan/"]').forEach((a) => {
      const url = abs(a.getAttribute('href'));
      if (seen.has(url)) return;
      const card = a.closest('div,li,td') || a;
      const text = (a.getAttribute('title') || card.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);
      if (text.length < 10 || /giriş|üye|yardım|anasayfa/i.test(text)) return;
      const img = card.querySelector?.('img');
      const src = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
      const priceM = (card.textContent || '').match(/[\d.]{4,}\s*TL/);
      push({
        title: text,
        price: priceM ? priceM[0] : 'Fiyat için ilana bakın',
        location: 'Sivas',
        image: abs(src),
        url,
      });
    });
    return out;
  });
}

async function launch(persistent, headless) {
  mkdirSync(PROFILE, { recursive: true });
  return await chromium.launchPersistentContext(PROFILE, {
    headless,
    locale: 'tr-TR',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });

  // 1) Önce sessiz (headless) dene
  let ctx = await launch(true, true);
  let page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(STORE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);

  // 2) Korumaya takıldıysa görünür tarayıcı + tek seferlik insan onayı
  if (await challenged(page)) {
    log('! Cloudflare doğrulaması gerekti — görünür tarayıcı açılıyor.');
    await ctx.close();
    ctx = await launch(true, false);
    page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(STORE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    log('→ Açılan pencerede "İnsan olduğunuzu doğrulayın" kutucuğu varsa işaretleyin.');
    log('  Sayfa kendiliğinden mağazaya dönünce betik devam eder (en fazla 3 dk bekler).');
    try {
      await page.waitForFunction(
        () =>
          !location.href.includes('checkLoading') &&
          !/bir dakika lütfen|just a moment/i.test(document.title),
        { timeout: 180000, polling: 2000 },
      );
    } catch {
      console.error('✕ Doğrulama tamamlanamadı. Tarayıcıda kutucuğu işaretleyip tekrar çalıştırın.');
      await ctx.close();
      process.exit(2);
    }
    log('✓ Doğrulama geçildi, çerez saklandı. Bundan sonra sessiz çalışır.');
    await page.waitForTimeout(3000);
  }

  // 3) İlanları topla (sayfalama varsa ilk 5 sayfa)
  const all = [];
  for (let p = 1; p <= 5; p++) {
    const items = await extract(page);
    for (const it of items) {
      if (!all.some((x) => x.url === it.url)) all.push(it);
    }
    log(`  sayfa ${p}: ${items.length} kart (${all.length} benzersiz)`);
    // Sonraki sayfa var mı?
    const next = await page
      .$('a[rel="next"], a:has-text("Sonraki")')
      .catch(() => null);
    const href = next ? await next.getAttribute('href').catch(() => null) : null;
    if (!next || !href || p === 5) break;
    await Promise.all([
      page.waitForLoadState('domcontentloaded').catch(() => {}),
      next.click().catch(() => {}),
    ]);
    await page.waitForTimeout(4000);
    if (await challenged(page)) break;
  }

  await ctx.close();

  if (all.length === 0) {
    console.error('✕ Sayfa açıldı ama ilan çıkarılamadı (markup değişmiş olabilir). Önbellek korunuyor.');
    process.exit(3);
  }

  const listings = all.slice(0, 150).map((l, i) => ({
    id: `oto-${i + 1}`,
    title: l.title,
    price: l.price,
    priceNumeric: priceNum(l.price),
    location: l.location,
    category: kategori(l.title),
    image: l.image,
    url: l.url,
  }));

  writeFileSync(
    OUT,
    JSON.stringify(
      { updatedAt: new Date().toISOString(), source: STORE_URL, count: listings.length, listings },
      null,
      2,
    ),
    'utf-8',
  );
  console.log(`✓ ${listings.length} ilan → public/ilanlar.json`);
}

main().catch((e) => {
  console.error('Hata:', e.message);
  process.exit(1);
});
