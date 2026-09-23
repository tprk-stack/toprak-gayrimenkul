#!/usr/bin/env node
/**
 * Eklentinin indirdigi dosyalari dogrular ve siteye yerlestirir.
 * Kullanim: node scripts/dogrula.mjs <indirilen-ilanlar.json> <indirilen-klasor>
 * Cikis: public/ilanlar.json + public/ilan-images (yalnizca referansli kareler)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

const [srcJson, srcDir] = process.argv.slice(2);
if (!srcJson || !srcDir) {
  console.error('Kullanim: node scripts/dogrula.mjs <ilanlar.json> <klasor>');
  process.exit(1);
}

const OUT = resolve(process.cwd(), 'public/ilanlar.json');
const IMGDIR = resolve(process.cwd(), 'public/ilan-images');

function num(p) {
  const d = String(p).replace(/[^0-9]/g, '');
  return d ? Number(d) : null;
}
function kat(title) {
  const t = String(title).toLocaleLowerCase('tr');
  if (t.includes('kiralık')) return 'Kiralık';
  if (t.includes('arsa') || t.includes('tarla') || t.includes('bahçe')) return 'Arsa';
  if (t.includes('işyeri') || t.includes('dükkan') || t.includes('ofis')) return 'İşyeri';
  if (t.includes('villa') || t.includes('müstakil')) return 'Villa';
  return 'Satılık';
}
function alan(a) {
  const m = String(a).match(/(\d+(?:[.,]\d+)?)\s*m(2|²)/i);
  return m ? `${m[1]} m²` : '';
}
function ilanNo(url) {
  const groups = (url.match(/\d{6,}/g) ?? []).filter((g) => g.length >= 7);
  return groups.length ? groups[groups.length - 1] : '';
}

let raw;
try {
  raw = JSON.parse(readFileSync(srcJson, 'utf-8'));
} catch (e) {
  console.error('JSON okunamadi:', e.message);
  process.exit(2);
}
const incoming = Array.isArray(raw) ? raw : raw.listings;
if (!Array.isArray(incoming) || incoming.length === 0) {
  console.error('Dosyada ilan yok.');
  process.exit(3);
}

mkdirSync(IMGDIR, { recursive: true });
const listings = [];
for (const [i, l] of incoming.slice(0, 300).entries()) {
  if (!l || typeof l !== 'object') continue;
  let url = String(l.url ?? '');
  try {
    const u = new URL(url);
    url = u.origin + u.pathname;
  } catch { /* eleme asagida */ }
  if (!url.includes('sahibinden.com/ilan/') && !url.includes('/ilan/')) continue;
  const title = String(l.title ?? '').slice(0, 200).trim() || 'Sahibinden İlanı';
  void i;
  const price = String(l.price ?? '').slice(0, 60).trim() || 'Fiyat için ilana bakın';
  listings.push({
    id: `sabah-${i + 1}`,
    title,
    price,
    priceNumeric: num(price),
    location: String(l.location ?? 'Sivas').slice(0, 120),
    category: kat(title),
    image: '',
    url,
    area: alan(l.area),
    photos: [],
    desc: String(l.desc ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
    ilanNo: ilanNo(url),
    _srcImage: typeof l.image === 'string' && l.image.startsWith('/ilan-images/') ? basename(l.image) : '',
    _srcPhotos: Array.isArray(l.photos)
      ? l.photos.filter((u) => typeof u === 'string' && u.startsWith('/ilan-images/')).map((u) => basename(u)).slice(0, 8)
      : [],
  });
}
if (listings.length === 0) {
  console.error('Gecerli ilan yok.');
  process.exit(4);
}
const mevcut = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : { listings: [] };

// Artimli birlestirme: yeniler one gecer, bilinen URL tekrar eklenmez (en fazla 300).
// Ardindan ilan numarasina gore buyukten kucuge siralanir (en guncel en basta).
const byUrl = new Map();
for (const l of listings) byUrl.set(l.url, l);
for (const l of mevcut.listings ?? []) {
  if (l && l.url && !byUrl.has(l.url)) byUrl.set(l.url, l);
}
for (const l of byUrl.values()) {
  if (l && !l.ilanNo) {
    const groups = (String(l.url).match(/\d{6,}/g) ?? []).filter((g) => g.length >= 7);
    if (groups.length) l.ilanNo = groups[groups.length - 1];
  }
}
const merged = [...byUrl.values()]
  .sort((a, b) => Number(b.ilanNo || 0) - Number(a.ilanNo || 0))
  .slice(0, 300);
const yeniSayi = listings.filter((l) => !(mevcut.listings ?? []).some((m) => m && m.url === l.url)).length;
if (yeniSayi === 0) {
  console.log('Yeni ilan yok, dosya degismedi.');
  process.exit(0);
}

// Referansli fotograflari kopyala
let foto = 0;
for (const l of listings) {
  const al = (f) => {
    if (!f) return '';
    const src = join(srcDir, f);
    if (!existsSync(src) || statSync(src).size < 1024) return '';
    copyFileSync(src, join(IMGDIR, f));
    foto++;
    return `/ilan-images/${f}`;
  };
  l.image = al(l._srcImage);
  l.photos = l._srcPhotos.map(al).filter(Boolean);
  delete l._srcImage;
  delete l._srcPhotos;
}

// Referanssiz dosyalari temizle (birlesmis liste baz alinir)
const ref = new Set();
merged.forEach((l) => {
  if (l.image.startsWith('/ilan-images/')) ref.add(basename(l.image));
  l.photos.forEach((p) => ref.add(basename(p)));
});
for (const f of readdirSync(IMGDIR)) {
  if (!ref.has(f)) {
    try { unlinkSync(join(IMGDIR, f)); } catch { /* yoksay */ }
  }
}

writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), source: raw.source ?? '', count: merged.length, listings: merged }, null, 2), 'utf-8');
console.log(`OK ${yeniSayi} yeni + toplam ${merged.length} ilan, ${foto} fotograf yerlesti.`);
