import { useState } from 'react'
import ListingsSection from './components/ListingsSection'
import IlanYonetimi from './components/IlanYonetimi'

const NAV_LINKS = ['Projeler', 'Hizmetler', 'Hakkımızda', 'Referanslar', 'İletişim']

const SERVICES = [
  {
    num: '01',
    title: 'Konut Satışı',
    desc: 'Sivas\'ın her mahallesinde daire, villa ve müstakil ev satışlarında uzman kadromuzla yanınızdayız.',
  },
  {
    num: '02',
    title: 'Ticari Gayrimenkul',
    desc: 'İşyeri, dükkan ve arsa alım satımlarında stratejik danışmanlık ve değerleme hizmeti sunuyoruz.',
  },
  {
    num: '03',
    title: 'Yatırım Danışmanlığı',
    desc: 'Sivas gayrimenkul piyasasını en iyi şekilde analiz ederek portföyünüzü büyütmenize destek oluyoruz.',
  },
  {
    num: '04',
    title: 'Kiralama & Yönetim',
    desc: 'Mülkünüzü en doğru kiracıyla buluşturuyor, tüm yönetim süreçlerini sizin adınıza yürütüyoruz.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'Toprak Gayrimenkul sayesinde Sivas\'ta hayalindeki evi bulduk. Profesyonel yaklaşımları ve dürüst danışmanlıkları bizi çok etkiledi.',
    name: 'Mehmet & Ayşe Yıldırım',
    role: 'Konut Alıcısı, Sivas Merkez',
  },
  {
    quote: 'Ticari mülkümün satışında beklentimin çok üzerinde bir fiyat elde ettim. Toprak ekibine güvenmek doğru karardı.',
    name: 'Hasan Çelik',
    role: 'Satıcı, Kızılırmak',
  },
  {
    quote: 'Sivas\'a taşınma sürecimde her adımda yanımda oldular. Hem hızlı hem de güvenilir bir hizmet aldım.',
    name: 'Elif Demir',
    role: 'Kiracı, Esentepe',
  },
]

const STATS = [
  { value: '₺1.2M', label: '2025\'te Gerçekleşen Satış' },
  { value: '520+', label: 'Tamamlanan İşlem' },
  { value: '%97', label: 'Müşteri Memnuniyeti' },
  { value: '18 yıl', label: 'Sivas\'ta Deneyim' },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [formState, setFormState] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f0e0d', color: '#f0ece4' }}>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ backdropFilter: 'blur(12px)', background: 'rgba(15,14,13,0.85)', borderBottom: '1px solid rgba(200,169,110,0.12)' }}>
        <a href="#" className="font-display text-xl tracking-widest uppercase" style={{ color: '#f0ece4', letterSpacing: '0.28em' }}>
          Toprak
        </a>
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map(link => (
            <a key={link} href={`#${link.toLowerCase()}`}
              className="text-sm tracking-widest uppercase transition-colors duration-200 hover:text-[#c8a96e]"
              style={{ color: '#8a8478', letterSpacing: '0.12em', fontWeight: 400 }}>
              {link}
            </a>
          ))}
        </div>
        <a href="#i̇letişim"
          className="hidden md:inline-flex items-center gap-2 text-xs tracking-widest uppercase px-5 py-2.5 transition-colors duration-200"
          style={{ border: '1px solid #c8a96e', color: '#c8a96e', letterSpacing: '0.12em' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#c8a96e'; (e.currentTarget as HTMLElement).style.color = '#0f0e0d' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#c8a96e' }}>
          Randevu Al
        </a>
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} style={{ color: '#f0ece4' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 8h18M3 16h18" />}
          </svg>
        </button>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 md:hidden"
          style={{ background: '#0f0e0d' }}>
          {NAV_LINKS.map(link => (
            <a key={link} href={`#${link.toLowerCase()}`}
              className="font-display text-3xl italic"
              style={{ color: '#f0ece4' }}
              onClick={() => setMenuOpen(false)}>
              {link}
            </a>
          ))}
        </div>
      )}

      {/* HERO */}
      <section className="relative h-screen flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0 bg-[#1a1916]">
          <img
            src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1800&h=1200&fit=crop&auto=format"
            alt="Sivas'ta lüks konut"
            className="w-full h-full object-cover"
            style={{ opacity: 0.5 }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0f0e0d 0%, rgba(15,14,13,0.4) 50%, rgba(15,14,13,0.2) 100%)' }} />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 pb-20 max-w-5xl">
          <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: '#c8a96e' }}>
            Sivas'ın Güvenilir Gayrimenkul Markası · Kur. 2006
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-light leading-[1.05] mb-4"
            style={{ color: '#f0ece4' }}>
            Hayalinizdeki Ev,<br />
            <span className="italic" style={{ color: '#c8a96e' }}>Değerine Değer</span><br />
            Katan Arsalar
          </h1>
          <p className="font-display italic text-lg md:text-xl font-light mb-8 tracking-widest" style={{ color: '#8a8478', letterSpacing: '0.18em' }}>
            — Toprak Gayrimenkul Sivas
          </p>
          <p className="text-base md:text-lg max-w-xl mb-10" style={{ color: '#c4bfb5', fontWeight: 300, lineHeight: 1.7 }}>
            On sekiz yıllık Sivas deneyimiyle doğru mülkü, doğru fiyata, doğru zamanda sunuyoruz. Güven, şeffaflık ve sonuç odaklı hizmet.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#projeler"
              className="inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-widest uppercase transition-all duration-200"
              style={{ background: '#c8a96e', color: '#0f0e0d', fontWeight: 500, letterSpacing: '0.12em' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#d4b87a'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#c8a96e'}>
              Projeleri Gör
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
            <a href="#i̇letişim"
              className="inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-widest uppercase transition-colors duration-200"
              style={{ border: '1px solid rgba(240,236,228,0.3)', color: '#f0ece4', letterSpacing: '0.12em' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#c8a96e'; (e.currentTarget as HTMLElement).style.color = '#c8a96e' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,236,228,0.3)'; (e.currentTarget as HTMLElement).style.color = '#f0ece4' }}>
              Danışman ile Görüş
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 right-10 hidden md:flex flex-col items-center gap-2" style={{ color: '#8a8478' }}>
          <span className="text-xs tracking-[0.2em] uppercase" style={{ writingMode: 'vertical-rl' }}>Kaydır</span>
          <div className="w-px h-12" style={{ background: 'linear-gradient(to bottom, #8a8478, transparent)' }} />
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: '#1a1916', borderTop: '1px solid rgba(200,169,110,0.15)', borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
        <div className="max-w-6xl mx-auto px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x">
          {STATS.map(s => (
            <div key={s.label} className="px-6 text-center md:text-left">
              <div className="font-display text-4xl md:text-5xl font-light mb-2" style={{ color: '#c8a96e' }}>{s.value}</div>
              <div className="text-xs tracking-widest uppercase" style={{ color: '#8a8478', letterSpacing: '0.12em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PROPERTIES — sahibinden önbelleğinden canlı okur (public/ilanlar.json) */}
      <ListingsSection />

      {/* FULL-WIDTH BANNER */}
      <section className="relative overflow-hidden" style={{ height: 400 }}>
        <img
          src="https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=1800&h=600&fit=crop&auto=format"
          alt="Sivas'ta yaşam"
          className="w-full h-full object-cover"
          style={{ opacity: 0.4 }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-center px-8"
          style={{ background: 'rgba(15,14,13,0.65)' }}>
          <div>
            <p className="font-display italic text-2xl md:text-4xl font-light mb-5" style={{ color: '#f0ece4' }}>
              "Her evin bir hikâyesi vardır.<br />Biz o hikâyeyi doğru kişiyle buluştururuz."
            </p>
            <div className="w-12 h-px mx-auto" style={{ background: '#c8a96e' }} />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="hizmetler" className="py-24 px-8 md:px-16 lg:px-24 max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#c8a96e' }}>Ne Yapıyoruz</p>
          <h2 className="font-display text-4xl md:text-5xl font-light" style={{ color: '#f0ece4' }}>
            <span className="italic">Hizmetlerimiz</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {SERVICES.map((s, i) => (
            <div key={s.num}
              className="group p-8 md:p-10 transition-colors duration-300 cursor-pointer"
              style={{
                borderTop: '1px solid rgba(200,169,110,0.15)',
                borderRight: i % 2 === 0 ? '1px solid rgba(200,169,110,0.15)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1a1916'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <div className="font-display text-5xl font-light mb-6" style={{ color: 'rgba(200,169,110,0.2)' }}>
                {s.num}
              </div>
              <h3 className="font-display text-xl font-light mb-3" style={{ color: '#f0ece4' }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#8a8478', lineHeight: 1.75 }}>{s.desc}</p>
            </div>
          ))}
          <div className="md:col-span-2" style={{ borderTop: '1px solid rgba(200,169,110,0.15)' }} />
        </div>
      </section>

      {/* ABOUT */}
      <section id="hakkımızda" className="py-24 px-8 md:px-16 lg:px-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="overflow-hidden" style={{ height: 520 }}>
              <img
                src="https://images.unsplash.com/photo-1724582586529-62622e50c0b3?w=700&h=700&fit=crop&auto=format"
                alt="Modern Sivas konut iç mekan"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 p-6 hidden md:block" style={{ background: '#1a1916', border: '1px solid rgba(200,169,110,0.2)' }}>
              <div className="font-display text-3xl font-light" style={{ color: '#c8a96e' }}>18</div>
              <div className="text-xs tracking-widest uppercase mt-1" style={{ color: '#8a8478' }}>Yıllık<br />Deneyim</div>
            </div>
          </div>
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#c8a96e' }}>Toprak Gayrimenkul</p>
            <h2 className="font-display text-4xl font-light leading-snug mb-6" style={{ color: '#f0ece4' }}>
              Sivas'a Kök Salmış,<br /><span className="italic">Size Adanmış</span>
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#c4bfb5', lineHeight: 1.8 }}>
              2006 yılında Sivas'ta kurulan Toprak Gayrimenkul, kentle birlikte büyüdü. Kentin her mahallesini, her caddesini, her değer değişimini yakından takip eden bir ekiple çalışıyoruz. Sivas'ı siz kadar seviyoruz; belki biraz daha.
            </p>
            <p className="text-sm leading-relaxed mb-8" style={{ color: '#c4bfb5', lineHeight: 1.8 }}>
              Her işlemi bir vaat olarak görüyoruz: doğru fiyat, dürüst süreç, zamanında sonuç. Müşterilerimizin %97'si bize ikinci kez dönüyor; bu rakam bizi en çok gururlandıran başarımızdır.
            </p>
            <div className="flex flex-col gap-3">
              {['Her işlemde kıdemli danışman desteği', '400+ aktif alıcıdan oluşan özel ağ', 'Ortalama liste fiyatının %9 üzerinde satış'].map(f => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-4 h-px flex-shrink-0" style={{ background: '#c8a96e' }} />
                  <span className="text-sm" style={{ color: '#c4bfb5' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="referanslar" style={{ background: '#1a1916', borderTop: '1px solid rgba(200,169,110,0.15)', borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-24">
          <div className="mb-14">
            <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#c8a96e' }}>Müşteri Görüşleri</p>
            <h2 className="font-display text-4xl md:text-5xl font-light" style={{ color: '#f0ece4' }}>
              Onların <span className="italic">Sözleriyle</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="flex flex-col" style={{ borderTop: '1px solid rgba(200,169,110,0.25)', paddingTop: 28 }}>
                <div className="font-display text-4xl mb-4" style={{ color: 'rgba(200,169,110,0.35)' }}>"</div>
                <p className="font-display italic text-lg font-light leading-relaxed flex-1 mb-6" style={{ color: '#f0ece4', lineHeight: 1.65 }}>
                  {t.quote}
                </p>
                <div>
                  <div className="text-sm font-medium" style={{ color: '#c8a96e' }}>{t.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8a8478' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="i̇letişim" className="py-24 px-8 md:px-16 lg:px-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: '#c8a96e' }}>Bize Ulaşın</p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-snug mb-6" style={{ color: '#f0ece4' }}>
              Konuşmaya<br /><span className="italic">Başlayalım</span>
            </h2>
            <p className="text-sm leading-relaxed mb-10" style={{ color: '#8a8478', lineHeight: 1.8 }}>
              Satmayı, almayı ya da kiralamayı düşünüyor musunuz? Sivas gayrimenkul piyasası hakkında merak ettiğiniz her şeyi danışmanlarımızla konuşabilirsiniz. İlk görüşme tamamen ücretsizdir.
            </p>
            <div className="flex flex-col gap-6">
              {[
                { label: 'Telefon', value: '+90 (346) 224 08 12' },
                { label: 'E-posta', value: 'info@toprakgayrimenkul.com.tr' },
                { label: 'Adres', value: 'Kızılırmak Cad. No. 47/A, Sivas Merkez, 58000' },
                { label: 'Çalışma Saatleri', value: 'Pzt – Cum 09:00 – 18:30 · Cmt randevuyla' },
              ].map(c => (
                <div key={c.label}>
                  <div className="text-xs tracking-widest uppercase mb-1" style={{ color: '#8a8478', letterSpacing: '0.12em' }}>{c.label}</div>
                  <div className="text-sm" style={{ color: '#f0ece4' }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            {submitted ? (
              <div className="h-full flex flex-col items-start justify-center gap-4 py-16">
                <div className="w-10 h-px" style={{ background: '#c8a96e' }} />
                <h3 className="font-display text-3xl font-light italic" style={{ color: '#f0ece4' }}>Teşekkürler.</h3>
                <p className="text-sm" style={{ color: '#8a8478' }}>Danışmanımız en kısa sürede sizinle iletişime geçecek.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {[
                  { id: 'name', label: 'Ad Soyad', type: 'text', placeholder: 'Ahmet Yılmaz' },
                  { id: 'email', label: 'E-posta Adresi', type: 'email', placeholder: 'ahmet@example.com' },
                ].map(f => (
                  <div key={f.id}>
                    <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#8a8478', letterSpacing: '0.12em' }}>{f.label}</label>
                    <input
                      type={f.type}
                      id={f.id}
                      required
                      placeholder={f.placeholder}
                      value={formState[f.id as keyof typeof formState]}
                      onChange={e => setFormState(s => ({ ...s, [f.id]: e.target.value }))}
                      className="w-full px-4 py-3 text-sm outline-none transition-colors duration-200"
                      style={{ background: '#1a1916', border: '1px solid rgba(200,169,110,0.2)', color: '#f0ece4' }}
                      onFocus={e => (e.target as HTMLElement).style.borderColor = '#c8a96e'}
                      onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(200,169,110,0.2)'}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#8a8478', letterSpacing: '0.12em' }}>Mesajınız</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Gayrimenkul ihtiyacınızı bize anlatın…"
                    value={formState.message}
                    onChange={e => setFormState(s => ({ ...s, message: e.target.value }))}
                    className="w-full px-4 py-3 text-sm outline-none resize-none transition-colors duration-200"
                    style={{ background: '#1a1916', border: '1px solid rgba(200,169,110,0.2)', color: '#f0ece4' }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = '#c8a96e'}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = 'rgba(200,169,110,0.2)'}
                  />
                </div>
                <button type="submit"
                  className="mt-2 w-full py-4 text-sm tracking-widest uppercase transition-all duration-200"
                  style={{ background: '#c8a96e', color: '#0f0e0d', fontWeight: 500, letterSpacing: '0.15em' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#d4b87a'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#c8a96e'}>
                  Mesaj Gönder
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <IlanYonetimi />
      <footer style={{ background: '#111009', borderTop: '1px solid rgba(200,169,110,0.12)' }}>
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="font-display text-lg tracking-widest uppercase mb-2" style={{ color: '#f0ece4', letterSpacing: '0.25em' }}>Toprak</div>
            <div className="text-xs" style={{ color: '#8a8478' }}>Sivas Gayrimenkul · Kur. 2006</div>
          </div>
          <div className="flex flex-wrap gap-6">
            {['Gizlilik Politikası', 'Çerez Politikası', 'KVKK', 'TÜGAYDER Üyesi'].map(l => (
              <a key={l} href="#" className="text-xs transition-colors duration-200" style={{ color: '#8a8478', letterSpacing: '0.05em' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#c8a96e'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#8a8478'}>
                {l}
              </a>
            ))}
          </div>
          <div className="text-xs" style={{ color: '#8a8478' }}>
            © 2026 Toprak Gayrimenkul Ltd. Şti. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  )
}
