import { useEffect, useMemo, useState } from 'react';
import type { Listing } from '../lib/ilanlar';
import { assetUrl } from '../lib/ilanlar';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=560&fit=crop&auto=format';

const GLASS: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(34,31,27,0.82), rgba(14,12,10,0.92))',
  backdropFilter: 'blur(26px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(26px) saturate(1.6)',
  border: '1px solid rgba(200,169,110,0.38)',
  borderRadius: 20,
  boxShadow: '0 32px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.14)',
};

export default function ListingModal({
  listing,
  onClose,
  onHoverChange,
}: {
  listing: Listing | null;
  onClose: () => void;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    setPhotoIdx(0);
    if (!listing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [listing, onClose]);

  const photos = useMemo(() => {
    if (!listing) return [];
    const all = [listing.image, ...(listing.photos ?? [])].filter(Boolean).map(assetUrl);
    return [...new Set(all)];
  }, [listing]);

  if (!listing) return null;

  const rows: Array<[string, string]> = [
    ['Fiyat', listing.price],
    ...(listing.area ? [['Metrekare', listing.area] as [string, string]] : []),
    ['Konum', listing.location],
    ['Kategori', listing.category],
    ...(listing.ilanNo ? [['İlan No', listing.ilanNo] as [string, string]] : []),
    ['Kaynak', 'sahibinden.com'],
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: 'rgba(8,7,6,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={listing.title}
    >
      <div
        className="w-full sm:max-w-3xl lg:max-w-4xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-[20px]"
        style={GLASS}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Galeri */}
          <div className="relative" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <img
              src={photos[photoIdx] || PLACEHOLDER}
              alt={listing.title}
              className="w-full h-56 sm:h-72 md:h-full md:min-h-[420px] object-cover md:rounded-l-[20px] rounded-t-3xl sm:rounded-t-[20px] md:rounded-tr-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
              }}
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(10,9,8,0.45), transparent 45%)' }} />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                  aria-label="Önceki fotoğraf"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 text-xl"
                  style={{ background: 'rgba(15,14,13,0.65)', backdropFilter: 'blur(8px)', color: '#c8a96e', border: '1px solid rgba(200,169,110,0.4)', borderRadius: '50%' }}
                >
                  ‹
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                  aria-label="Sonraki fotoğraf"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 text-xl"
                  style={{ background: 'rgba(15,14,13,0.65)', backdropFilter: 'blur(8px)', color: '#c8a96e', border: '1px solid rgba(200,169,110,0.4)', borderRadius: '50%' }}
                >
                  ›
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-2.5 py-1"
                  style={{ background: 'rgba(15,14,13,0.65)', backdropFilter: 'blur(8px)', color: '#f0ece4', borderRadius: 20 }}>
                  {photoIdx + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          {/* Bilgiler */}
          <div className="p-5 sm:p-7 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="text-xs tracking-widest uppercase" style={{ color: '#8a8478', letterSpacing: '0.12em' }}>
                {listing.location} · {listing.category}
              </div>
              <button
                onClick={onClose}
                aria-label="Kapat"
                className="w-8 h-8 flex-shrink-0 text-lg leading-none"
                style={{ background: 'rgba(15,14,13,0.6)', color: '#f0ece4', border: '1px solid rgba(200,169,110,0.4)', borderRadius: '50%' }}
              >
                ×
              </button>
            </div>
            <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-light mb-3" style={{ color: '#f0ece4' }}>
              {listing.title}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-2xl sm:text-3xl font-display font-light" style={{ color: '#c8a96e' }}>
                {listing.price}
              </div>
              {listing.area && (
                <span
                  className="text-xs px-2.5 py-1.5 tracking-widest uppercase"
                  style={{ border: '1px solid rgba(200,169,110,0.4)', color: '#c8a96e', letterSpacing: '0.1em', borderRadius: 8 }}
                >
                  {listing.area}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-px mb-4 rounded-xl overflow-hidden" style={{ background: 'rgba(200,169,110,0.18)' }}>
              {rows.map(([k, v]) => (
                <div key={k} className="p-2.5 sm:p-3" style={{ background: 'rgba(20,18,15,0.72)' }}>
                  <div className="text-xs tracking-widest uppercase mb-0.5" style={{ color: '#8a8478' }}>{k}</div>
                  <div className="text-sm" style={{ color: '#f0ece4' }}>{v}</div>
                </div>
              ))}
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <button key={p + i} onClick={() => setPhotoIdx(i)} className="flex-shrink-0">
                    <img
                      src={p}
                      alt=""
                      className="w-16 h-12 sm:w-20 sm:h-14 object-cover rounded-lg"
                      style={{
                        opacity: i === photoIdx ? 1 : 0.5,
                        border: i === photoIdx ? '1px solid #c8a96e' : '1px solid transparent',
                      }}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {listing.desc && (
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#c4bfb5', lineHeight: 1.75 }}>
                {listing.desc}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <a
                href={listing.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 px-6 py-3.5 text-sm tracking-widest uppercase rounded-xl"
                style={{ background: '#c8a96e', color: '#0f0e0d', fontWeight: 600 }}
              >
                sahibinden.com'da Aç →
              </a>
              <button
                onClick={onClose}
                className="px-6 py-3.5 text-sm tracking-widest uppercase rounded-xl"
                style={{ border: '1px solid rgba(240,236,228,0.3)', color: '#f0ece4' }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
