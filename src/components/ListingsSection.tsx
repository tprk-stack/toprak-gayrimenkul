import { useEffect, useMemo, useRef, useState } from 'react';
import { STORE_URL, timeAgo, assetUrl, type Listing } from '../lib/ilanlar';
import { useListings } from '../hooks/useListings';
import ListingModal, { type ListingModalHandle } from './ListingModal';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=560&fit=crop&auto=format';

const PAGE_SIZE = 18;

export default function ListingsSection() {
  const { listings, status, refresh } = useListings();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tümü');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const pendingOrigin = useRef<{ x: number; y: number } | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const modalHover = useRef(false);
  const modalRef = useRef<ListingModalHandle | null>(null);

  function cancelTimers() {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openFrom(el: HTMLElement | null, l: Listing) {
    if (el) {
      const r = el.getBoundingClientRect();
      setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    } else {
      setOrigin(null);
    }
    cancelTimers();
    setSelected(l);
  }

  function scheduleOpen(l: Listing, el: HTMLElement | null) {
    // Dokunmatik cihazlarda hover ile açma; dokunma (tıklama) açar
    if (window.matchMedia?.('(hover: none)').matches) return;
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (selected?.id === l.id) return;
    if (el) {
      const r = el.getBoundingClientRect();
      pendingOrigin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    } else {
      pendingOrigin.current = null;
    }
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      setOrigin(pendingOrigin.current);
      setSelected(l);
    }, 450);
  }

  function requestModalClose() {
    if (modalRef.current) modalRef.current.beginClose();
    else setSelected(null);
  }

  function scheduleClose() {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    // Karta-pencere arası boşluğu geçmeye zaman tanı (hızlı geçişlerde kapanmasın)
    closeTimer.current = window.setTimeout(() => {
      if (!modalHover.current) requestModalClose();
    }, 700);
  }

  // Kapanışta zamanlayıcıları temizle
  useEffect(() => () => cancelTimers(), []);

  const categories = useMemo(() => {
    const set = new Set(listings.map((l) => l.category).filter(Boolean));
    return ['Tümü', ...Array.from(set)];
  }, [listings]);

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase('tr');
    return listings.filter((l) => {
      const okCat = category === 'Tümü' || l.category === category;
      const okQ =
        !q ||
        l.title.toLocaleLowerCase('tr').includes(q) ||
        l.location.toLocaleLowerCase('tr').includes(q);
      return okCat && okQ;
    });
  }, [listings, query, category]);

  // Filtre/veri değişince ilk sayfaya dön
  useEffect(() => {
    setPage(1);
  }, [query, category, listings.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function goPage(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages));
    document.getElementById('projeler')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <section id="projeler" className="py-24 px-8 md:px-16 lg:px-24 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#c8a96e' }}>
            Güncel İlanlar
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight" style={{ color: '#f0ece4' }}>
            Öne Çıkan<br /><span className="italic">Projeler</span>
          </h2>
          <div className="mt-4 flex items-center gap-3 text-xs" style={{ color: '#8a8478' }}>
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background:
                  status.state === 'live' ? '#4ade80' : status.state === 'loading' ? '#fbbf24' : '#f87171',
              }}
            />
            {status.state === 'live' && (
              <span>
                {status.count} ilan · {timeAgo(status.updatedAt)} senkron ·{' '}
                <a href={STORE_URL} target="_blank" rel="noreferrer" className="underline" style={{ color: '#c8a96e' }}>
                  sahibinden mağazası
                </a>
              </span>
            )}
            {status.state === 'fallback' && <span>Örnek ilanlar · {status.reason}</span>}
            {status.state === 'loading' && <span>İlanlar yükleniyor…</span>}
            <button
              onClick={onRefresh}
              className="ml-2 px-3 py-1 text-xs tracking-widest uppercase"
              style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#c8a96e' }}
            >
              {refreshing ? 'Yenileniyor…' : 'Yenile'}
            </button>
          </div>
        </div>
        <a
          href={STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs tracking-widest uppercase self-start md:self-auto pb-px"
          style={{ color: '#c8a96e', borderBottom: '1px solid rgba(200,169,110,0.4)', letterSpacing: '0.12em' }}
        >
          Mağazadaki Tüm İlanlar →
        </a>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-10">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ara: mahalle, başlık… (örn. Esentepe)"
          className="flex-1 px-4 py-3 text-sm outline-none"
          style={{ background: '#1a1916', border: '1px solid rgba(200,169,110,0.2)', color: '#f0ece4' }}
        />
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-4 py-2 text-xs tracking-widest uppercase"
              style={{
                background: category === c ? '#c8a96e' : 'transparent',
                color: category === c ? '#0f0e0d' : '#8a8478',
                border: '1px solid rgba(200,169,110,0.4)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-sm" style={{ background: '#1a1916', color: '#8a8478' }}>
          Aramanıza uygun ilan bulunamadı. Tüm ilanları{' '}
          <a href={STORE_URL} target="_blank" rel="noreferrer" className="underline" style={{ color: '#c8a96e' }}>
            sahibinden mağazasında
          </a>{' '}
          görüntüleyin.
        </div>
      ) : (
        <>
        <div className="text-xs mb-6" style={{ color: '#8a8478' }}>
          {filtered.length} ilan · sayfa {safePage}/{totalPages}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pageItems.map((l, i) => (
            <article
              key={l.id}
              role="button"
              tabIndex={0}
              onClick={(e) => openFrom(e.currentTarget, l)}
              onMouseEnter={(e) => scheduleOpen(l, e.currentTarget)}
              onMouseLeave={() => scheduleClose()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openFrom(e.currentTarget as HTMLElement, l);
                }
              }}
              className="group cursor-pointer block outline-none relative"
              style={{ background: '#1a1916' }}
            >
              <div className="relative overflow-hidden" style={{ height: 280 }}>
                <img
                  src={assetUrl(l.image) || PLACEHOLDER}
                  alt={l.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                  }}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,14,13,0.6) 0%, transparent 60%)' }} />
                <span
                  className="absolute top-4 left-4 text-xs tracking-widest uppercase px-3 py-1"
                  style={{
                    background: i === 2 ? '#c8a96e' : '#0f0e0d',
                    color: i === 2 ? '#0f0e0d' : '#c8a96e',
                    border: i === 2 ? 'none' : '1px solid #c8a96e',
                    letterSpacing: '0.1em',
                  }}
                >
                  {l.category}
                </span>
              </div>
              <div className="p-6">
                <div className="text-xs tracking-widest uppercase mb-1" style={{ color: '#8a8478', letterSpacing: '0.12em' }}>
                  {l.location}
                </div>
                <h3 className="font-display text-xl font-light mb-3 line-clamp-2" style={{ color: '#f0ece4' }}>
                  {l.title}
                </h3>
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div className="text-2xl font-display font-light" style={{ color: '#c8a96e' }}>
                    {l.price}
                  </div>
                  {l.area && (
                    <span
                      className="text-xs px-2.5 py-1.5 tracking-widest uppercase flex-shrink-0"
                      style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#c8a96e', letterSpacing: '0.1em' }}
                    >
                      {l.area}
                    </span>
                  )}
                </div>
                <div className="text-xs tracking-widest uppercase" style={{ color: '#8a8478' }}>
                  Detayı görüntüle →
                </div>
              </div>
            </article>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => goPage(safePage - 1)}
              disabled={safePage === 1}
              className="px-4 py-2 text-xs tracking-widest uppercase"
              style={{
                border: '1px solid rgba(200,169,110,0.4)',
                color: safePage === 1 ? '#4a463d' : '#c8a96e',
                cursor: safePage === 1 ? 'default' : 'pointer',
              }}
            >
              ← Önceki
            </button>
            {Array.from({ length: totalPages }, (_, n) => n + 1).map((n) => (
              <button
                key={n}
                onClick={() => goPage(n)}
                className="w-9 h-9 text-xs"
                style={{
                  background: n === safePage ? '#c8a96e' : 'transparent',
                  color: n === safePage ? '#0f0e0d' : '#8a8478',
                  border: '1px solid rgba(200,169,110,0.4)',
                  fontWeight: n === safePage ? 600 : 400,
                }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => goPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="px-4 py-2 text-xs tracking-widest uppercase"
              style={{
                border: '1px solid rgba(200,169,110,0.4)',
                color: safePage === totalPages ? '#4a463d' : '#c8a96e',
                cursor: safePage === totalPages ? 'default' : 'pointer',
              }}
            >
              Sonraki →
            </button>
          </div>
        )}
        </>
      )}
      <ListingModal
        ref={modalRef}
        listing={selected}
        origin={origin}
        onClose={() => {
          cancelTimers();
          setSelected(null);
        }}
        onHoverChange={(v) => {
          modalHover.current = v;
          if (!v) scheduleClose();
          else if (closeTimer.current) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
          }
        }}
      />
    </section>
  );
}
