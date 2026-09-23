import { useEffect, useState } from 'react';
import {
  STORE_URL,
  parseListingsFromHtml,
  type Listing,
} from '../lib/sahibinden';
import {
  RECEIVER_ORIGIN,
  CONSOLE_SNIPPET,
  DIAG_SNIPPET,
  bookmarkletHref,
  isValidIncoming,
} from '../lib/bookmarklet';

/**
 * Ekip paneli — #yonetim hash'i ile açılır.
 * ÖNERİLEN: "Tek tıkla aktar" yer imi (1 dk kurulum, sonra her aktarım 1 tık).
 * YEDEK: HTML yapıştır / URL listesi → JSON indir.
 */
export default function IlanYonetimi() {
  const [open, setOpen] = useState(() => window.location.hash === '#yonetim');
  const [html, setHtml] = useState('');
  const [urls, setUrls] = useState('');
  const [result, setResult] = useState<Listing[]>([]);
  const [msg, setMsg] = useState('');
  const [receiver, setReceiver] = useState<'bilinmiyor' | 'açık' | 'kapalı'>('bilinmiyor');
  const [localImages, setLocalImages] = useState<number | null>(null);
  const [receivedAt, setReceivedAt] = useState('');
  const [copied, setCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [diagCopied, setDiagCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // NOT: React 19, href içindeki "javascript:" adreslerini engelleyip
  // "throw new Error('React has blocked...')" ile değiştirir. Bu yüzden yer imi
  // bağlantısı ham HTML olarak basılır ( penny: sürükle-bırak yine çalışır).
  const bookmarkletHTML =
    `<a href="${bookmarkletHref().replace(/"/g, '&quot;')}" onclick="return false"` +
    ` title="Beni yer imleri çubuğuna SÜRÜKLEYİN (tıklamayın)"` +
    ` style="display:inline-block;background:#c8a96e;color:#0f0e0d;font-weight:600;padding:12px 24px;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;cursor:grab">` +
    `⤵ Toprak İlan Aktar</a>`;

  async function copyBookmarklet() {
    const code = bookmarkletHref();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  }

  async function copySnippet() {
    await copyText(CONSOLE_SNIPPET);
    setSnippetCopied(true);
    window.setTimeout(() => setSnippetCopied(false), 3000);
  }

  async function copyDiag() {
    await copyText(DIAG_SNIPPET);
    setDiagCopied(true);
    window.setTimeout(() => setDiagCopied(false), 3000);
  }

  async function copyText(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  async function ingestFile(f: File) {
    try {
      const data = JSON.parse(await f.text());
      const listings = Array.isArray(data) ? data : data.listings;
      if (!Array.isArray(listings) || listings.length === 0) {
        throw new Error('dosyada ilan bulunamadı');
      }
      const res = await fetch('/__ilan-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listings }),
      });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error ?? 'alıcı hatası');
      setReceivedAt(new Date().toLocaleTimeString('tr-TR'));
      setMsg(
        `✓ ${f.name} aktarıldı (sitede toplam ${out.count} · ` +
          `${out.withPrice ?? '?'} fiyatlı · ${out.withImage ?? '?'} fotoğraflı).`,
      );
    } catch (err) {
      setMsg(`✕ Dosya aktarılamadı: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`);
    }
  }

  // Yer iminden gelen veriyi karşıla → alıcıya POST et → onay dön
  useEffect(() => {
    if (!open) return;
    checkReceiver();
    async function onMessage(e: MessageEvent) {
      if (!isValidIncoming(e.data)) return;
      setMsg(`${e.data.listings.length} ilan alındı, siteye işleniyor…`);
      try {
        const res = await fetch('/__ilan-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listings: e.data.listings }),
        });
        const out = await res.json();
        if (!out.ok) throw new Error(out.error ?? 'alıcı hatası');
        setReceivedAt(new Date().toLocaleTimeString('tr-TR'));
        setMsg(
          `✓ ${e.data.listings.length} ilan aktarıldı (sitede toplam ${out.count} · ` +
            `${out.withPrice ?? '?'} fiyatlı · ${out.withImage ?? '?'} fotoğraflı). ` +
            'Sayfa otomatik yenilenecek; yenilenmezse "Projeler"deki Yenile düğmesine basın.',
        );
        try {
          (e.source as Window | null)?.postMessage(
            { type: 'toprak-ilanlar-alindi', count: out.count },
            { targetOrigin: e.origin },
          );
        } catch {
          /* kaynak kapanmış olabilir */
        }
      } catch (err) {
        setMsg(`✕ Aktarım başarısız: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open ]);

  async function checkReceiver() {
    try {
      const res = await fetch('/__ilan-sync');
      const out = await res.json();
      setReceiver(out.ok ? 'açık' : 'kapalı');
      setLocalImages(typeof out.localImages === 'number' ? out.localImages : null);
    } catch {
      setReceiver('kapalı');
    }
  }

  if (!open) {
    return (
      <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 pb-10">
        <button
          onClick={() => {
            setOpen(true);
            window.location.hash = 'yonetim';
          }}
          className="text-xs tracking-widest uppercase"
          style={{ color: '#8a8478' }}
        >
          İlan yönetimi (ekip girişi)
        </button>
      </div>
    );
  }

  function fromHtml() {
    try {
      const items = parseListingsFromHtml(html);
      setResult(items);
      setMsg(items.length > 0 ? `${items.length} ilan bulundu.` : 'HTML içinde ilan bulunamadı. Sayfa kaynağını tam yapıştırdığınızdan emin olun.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ayrıştırma hatası');
    }
  }

  function fromUrls() {
    const lines = urls.split('\n').map((s) => s.trim()).filter(Boolean);
    const items: Listing[] = lines.map((u, i) => {
      const url = u.startsWith('http') ? u : `https://www.sahibinden.com${u.startsWith('/') ? '' : '/'}${u}`;
      const id = url.match(/\/(\d+)(?:\/|$)/)?.[1] ?? `manuel-${i + 1}`;
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
    setResult(items);
    setMsg(items.length > 0 ? `${items.length} ilan hazırlandı. Başlık/fiyatı düzenleyip JSON'u indirin.` : 'URL girilmedi.');
  }

  function downloadJson() {
    const payload = {
      updatedAt: new Date().toISOString(),
      source: STORE_URL,
      count: result.length,
      listings: result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ilanlar.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('ilanlar.json indirildi → projedeki public/ilanlar.json dosyasının üzerine yazın ve siteyi yeniden yayınlayın.');
  }

  return (
    <section className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 pb-24">
      <div className="p-8" style={{ background: '#1a1916', border: '1px solid rgba(200,169,110,0.25)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-light" style={{ color: '#f0ece4' }}>
            İlan Yönetimi <span className="italic" style={{ color: '#c8a96e' }}>— otomatik senkron</span>
          </h2>
          <button
            onClick={() => {
              setOpen(false);
              window.location.hash = '';
            }}
            className="text-xs uppercase tracking-widest"
            style={{ color: '#8a8478' }}
          >
            Kapat
          </button>
        </div>

        {/* KONSOL + DOSYA BIRAKMA (en saglam yol) */}
        <div className="p-6 mb-6" style={{ background: '#0f0e0d', border: '1px solid rgba(200,169,110,0.4)' }}>
          <div className="text-xs tracking-widest uppercase mb-2" style={{ color: '#c8a96e' }}>
            ★ Yöntem A — Konsol + dosya bırakma (önerilen, takılmaz)
          </div>
          <ol className="text-sm mb-4 space-y-1" style={{ color: '#c4bfb5', lineHeight: 1.7 }}>
            <li>1. Mağazayı <b>NORMAL sekmede (gizli sekme değil)</b>, <b>giriş yapmışken</b> açın — misafir taramada site çabuk limit koyuyor.</li>
            <li>2. Mağaza sayfasında <b>F12</b> → <b>Konsol (Console)</b> sekmesi → aşağıdaki kodu yapıştır → <b>Enter</b>.</li>
            <li>3. Kod sayfaları <b>yavaşça</b> gezer (limit yememek için beklemeli) ve tek <code>ilanlar.json</code> indirir. Limit uyarısı gelirse giriş yapıp tekrar çalıştırın.</li>
            <li>4. İnen dosyayı aşağıdaki kutuya <b>sürükle-bırak</b> → ilanlar siteye düşer.</li>
          </ol>
          <div className="flex flex-wrap gap-3 mb-3">
            <button
              onClick={copySnippet}
              className="px-5 py-2.5 text-xs tracking-widest uppercase"
              style={{ background: '#c8a96e', color: '#0f0e0d' }}
            >
              {snippetCopied ? '✓ Kod kopyalandı' : 'Konsol kodunu kopyala'}
            </button>
          </div>
          <pre
            className="p-3 mb-2 text-xs overflow-auto"
            style={{ background: '#1a1916', border: '1px solid rgba(200,169,110,0.2)', color: '#8a8478', maxHeight: 120 }}
          >
            {CONSOLE_SNIPPET.slice(0, 400) + '… (tamamı kopyalanır)'}
          </pre>
          <details className="mb-4 text-xs" style={{ color: '#8a8478' }}>
            <summary className="cursor-pointer underline">Kopyalama çalışmazsa buraya tıklayın</summary>
            <textarea
              readOnly
              value={CONSOLE_SNIPPET}
              rows={6}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.currentTarget.select()}
              className="w-full mt-2 p-2 text-xs"
              style={{ background: '#0f0e0d', border: '1px solid rgba(200,169,110,0.2)', color: '#c4bfb5' }}
            />
            <div>Kutuya tıklayınca tüm kod seçilir → Ctrl+C ile kopyalayın.</div>
          </details>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) ingestFile(f);
            }}
            className="p-8 text-center text-sm cursor-pointer"
            style={{
              border: `1px dashed ${dragOver ? '#c8a96e' : 'rgba(200,169,110,0.4)'}`,
              background: dragOver ? '#1a1916' : 'transparent',
              color: '#8a8478',
            }}
            onClick={() => document.getElementById('ilan-dosya')?.click()}
          >
            ilanlar.json dosyasını buraya sürükleyin veya tıklayıp seçin
            <input
              id="ilan-dosya"
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) ingestFile(f);
                e.target.value = '';
              }}
            />
          </div>
          <div className="mt-4 p-4 text-xs" style={{ background: '#1a1916', border: '1px solid rgba(200,169,110,0.2)', color: '#8a8478', lineHeight: 1.7 }}>
            <span style={{ color: '#c8a96e' }}>Fiyatlar gelmiyorsa:</span> mağaza sayfasında konsola aşağıdaki tanı kodunu
            yapıştırın, çıkan raporu bana gönderin — seçicileri sayfanıza birebir uydurayım.
            <div className="mt-2">
              <button
                onClick={copyDiag}
                className="px-4 py-2 text-xs tracking-widest uppercase"
                style={{ border: '1px solid #c8a96e', color: '#c8a96e' }}
              >
                {diagCopied ? '✓ Tanı kodu kopyalandı' : 'Tanı kodunu kopyala'}
              </button>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer underline">Kopyalama çalışmazsa buraya tıklayın</summary>
              <textarea
                readOnly
                value={DIAG_SNIPPET}
                rows={6}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.currentTarget.select()}
                className="w-full mt-2 p-2 text-xs"
                style={{ background: '#0f0e0d', border: '1px solid rgba(200,169,110,0.2)', color: '#c4bfb5' }}
              />
              <div>Kutuya tıklayınca tüm kod seçilir → Ctrl+C ile kopyalayın → mağaza konsoluna yapıştırın.</div>
            </details>
          </div>
        </div>

        {/* TEK TIKLA AKTAR */}
        <div className="p-6 mb-6" style={{ background: '#0f0e0d', border: '1px solid rgba(200,169,110,0.25)' }}>
          <div className="text-xs tracking-widest uppercase mb-2" style={{ color: '#8a8478' }}>
            Yöntem B — Tek tıkla yer imi {receiver === 'açık' && receivedAt && <span>· son aktarım {receivedAt}</span>}
          </div>
          <ol className="text-sm mb-4 space-y-1" style={{ color: '#c4bfb5', lineHeight: 1.7 }}>
            <li>1. Şu düğmeyi yer imleri çubuğunuza <b>sürükleyin</b>:</li>
          </ol>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span dangerouslySetInnerHTML={{ __html: bookmarkletHTML }} />
            <button
              onClick={copyBookmarklet}
              className="px-5 py-3 text-xs tracking-widest uppercase"
              style={{ border: '1px solid #c8a96e', color: '#c8a96e' }}
            >
              {copied ? '✓ Kopyalandı' : 'Kodu kopyala'}
            </button>
          </div>
          <div className="text-xs mb-4" style={{ color: '#8a8478', lineHeight: 1.7 }}>
            Sürükleme olmazsa: "Kodu kopyala" → yer imleri çubuğuna sağ tık → "Yeni yer imi" →
            URL alanına yapıştırın. (Düğmeye tıklamak bir şey yapmaz; sürüklemeniz gerekir.)
          </div>
          <ol className="text-sm space-y-1" style={{ color: '#c4bfb5', lineHeight: 1.7 }} start={2}>
            <li>2. Mağazayı normal tarayıcınızda açın: <a href={STORE_URL} target="_blank" rel="noreferrer" className="underline" style={{ color: '#c8a96e' }}>mağaza →</a></li>
            <li>3. Yer imine <b>tıklayın</b> — ilanlar bu siteye anında düşer. Hepsi bu.</li>
          </ol>
          <div className="mt-3 text-xs" style={{ color: '#8a8478' }}>
            Yerel alıcı ({RECEIVER_ORIGIN}/__ilan-sync):{' '}
            <span style={{ color: receiver === 'açık' ? '#4ade80' : '#f87171', fontWeight: 600 }}>
              {receiver === 'açık' ? '● açık' : receiver === 'kapalı' ? '● kapalı (dev sunucusunu başlatın: npm run dev)' : '…'}
            </span>
            {localImages !== null && (
              <span> · sitede {localImages} fotoğraf kayıtlı (uzak fotoğraflar aktarımdan sonra otomatik indirilir)</span>
            )}{' '}
            <button onClick={checkReceiver} className="underline ml-2">tekrar dene</button>
          </div>
        </div>

        <p className="text-sm mb-6" style={{ color: '#8a8478', lineHeight: 1.7 }}>
          Yedek yöntemler (yer imi yoksa): mağaza sayfasının HTML'ini aşağıya yapıştırın
          veya ilan URL'lerini listeleyin. Mağaza:{' '}
          <a href={STORE_URL} target="_blank" rel="noreferrer" className="underline" style={{ color: '#c8a96e' }}>{STORE_URL}</a>
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#8a8478' }}>
              Yöntem B — Mağaza sayfası HTML'i
            </label>
            <textarea
              rows={8}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<html>… mağaza sayfasının kaynak kodunu buraya yapıştırın …"
              className="w-full px-4 py-3 text-xs outline-none resize-y"
              style={{ background: '#0f0e0d', border: '1px solid rgba(200,169,110,0.2)', color: '#f0ece4' }}
            />
            <button
              onClick={fromHtml}
              className="mt-3 px-5 py-2.5 text-xs tracking-widest uppercase"
              style={{ background: '#c8a96e', color: '#0f0e0d' }}
            >
              HTML'den Dönüştür
            </button>
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#8a8478' }}>
              Yöntem C — İlan URL listesi (satır başına bir link)
            </label>
            <textarea
              rows={8}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={'https://www.sahibinden.com/ilan/…\nhttps://www.sahibinden.com/ilan/…'}
              className="w-full px-4 py-3 text-xs outline-none resize-y"
              style={{ background: '#0f0e0d', border: '1px solid rgba(200,169,110,0.2)', color: '#f0ece4' }}
            />
            <button
              onClick={fromUrls}
              className="mt-3 px-5 py-2.5 text-xs tracking-widest uppercase"
              style={{ border: '1px solid #c8a96e', color: '#c8a96e' }}
            >
              URL'lerden Üret
            </button>
          </div>
        </div>

        {msg && <div className="text-sm mb-4" style={{ color: '#c8a96e' }}>{msg}</div>}

        {result.length > 0 && (
          <>
            <div className="text-xs mb-2" style={{ color: '#8a8478' }}>
              Önizleme (ilk 5):
            </div>
            <ul className="text-xs mb-4 space-y-1" style={{ color: '#c4bfb5' }}>
              {result.slice(0, 5).map((r) => (
                <li key={r.id}>
                  • {r.title} — {r.price} — {r.url}
                </li>
              ))}
              {result.length > 5 && <li>… ve {result.length - 5} ilan daha</li>}
            </ul>
            <button
              onClick={downloadJson}
              className="px-6 py-3 text-sm tracking-widest uppercase"
              style={{ background: '#c8a96e', color: '#0f0e0d' }}
            >
              ilanlar.json İndir ({result.length} ilan)
            </button>
          </>
        )}
      </div>
    </section>
  );
}
