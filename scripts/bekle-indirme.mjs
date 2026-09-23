#!/usr/bin/env node
// Eklentinin indirmesini bekler: izlenen dosyanin degisme zamani bu
// betigin baslangicindan yeniyse basariyla cikar, sure dolarsa hata verir.
// Kullanim: node scripts/bekle-indirme.mjs [dakika] [izlenecek-dosya]
import { statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const dakika = Number(process.argv[2] || 12);
const dosya = process.argv[3]
  || join(os.homedir(), 'Downloads', 'toprak-senkron', 'ilanlar.json');
const baslangic = Date.now();
const bitis = baslangic + dakika * 60 * 1000;
const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

for (;;) {
  try {
    if (existsSync(dosya) && statSync(dosya).mtimeMs > baslangic) {
      console.log('OK: yeni dosya geldi.');
      process.exit(0);
    }
  } catch { /* yoksay */ }
  if (Date.now() >= bitis) break;
  await uyu(5000);
}
console.error('Zaman asimi: indirme tamamlanamadi.');
process.exit(2);
