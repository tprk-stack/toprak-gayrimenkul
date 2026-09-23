import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

import siteConfiguration from './.figma/make/site.json'


// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.
  const emitSourcemaps = mode === 'development'

  return {
    // GitHub Pages (proje sayfasi) dahil her yolda calismasi icin goreli taban.
    // Figma Make onizlemesi FIGMA_PUBLIC_URL ile mutlak tabani ezebilir.
    base: process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : './',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
react(),
      tailwindcss(),
      figmaSiteConfiguration(siteConfiguration),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}' }),
      ilanSyncReceiver(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      watch: {
        ignored: [
          '**/.figma/**',
          '**/.browser-profile/**',
          '**/ornek-sayfa.html',
          '**/sayfa.html',
],
      },
    },
    preview: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }
})

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */
function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function replaceHtmlCommentSlot(html: string, slotName: string, content: string): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "Figma Make App"
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitizeHtmlValue(config.language) || 'en'
  const googleAnalyticsId = sanitizeHtmlValue(config.analytics?.googleAnalyticsId)
  const headStart = config.customScripts?.headStart ?? ''
  const headEnd = config.customScripts?.headEnd ?? ''
  const bodyStart = config.customScripts?.bodyStart ?? ''
  const bodyEnd = config.customScripts?.bodyEnd ?? ''
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'figma-site-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, 'figma:lang', language)
        result = replaceHtmlCommentSlot(result, 'figma:title', escapeHtmlText(title))
        result = replaceHtmlCommentSlot(result, 'figma:head-start', headStart)
        result = replaceHtmlCommentSlot(result, 'figma:head-end', headEnd)
        result = replaceHtmlCommentSlot(result, 'figma:body-start', bodyStart)
        result = replaceHtmlCommentSlot(result, 'figma:body-end', bodyEnd)

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
        }
        if (config.robots?.index === false) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        if (favicon) {
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: favicon }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
        }
        if (description) {
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }
        if (socialImage) {
          tags.push(
            { tag: 'meta', attrs: { property: 'og:image', content: socialImage }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:image', content: socialImage }, injectTo: 'head' },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: 'head',
            },
            {
              tag: 'script',
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: 'head',
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'figma-bypass-link', href: '#root' },
              children: 'Skip to content',
              injectTo: 'body-prepend',
            },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */
function figmaErrorOverlayReplay(): Plugin {
  return {
    name: 'figma-error-overlay-replay',
    apply: 'serve',
    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (...args: any[]) => void
      server.ws.send = ((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === 'error') {
            lastError = payload as object
          } else if (type === 'update' || type === 'full-reload') {
            lastError = null
          }
        }
        return origSend(...args)
      }) as typeof server.ws.send

      server.ws.on('connection', (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: 'figma-react-refresh-boundary-fallback',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: 'full-reload', path: '*' })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes('/node_modules/')) return null

      const moduleId = id.split('?')[0] ?? id
      const hasRefreshBoundary = code.includes('registerExportsForReactRefresh')
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */
function figmaMakeKitPlugin(options: { storiesGlob: string | string[] }): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob) ? options.storiesGlob : [options.storiesGlob]
  const ROUTE = '/.figma/make/kit.html'
  const VIRTUAL_ID = 'virtual:figma-stories'
  const RESOLVED_ID = '\0' + VIRTUAL_ID
  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: 'figma-make-kit',
    apply: 'serve',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return STORIES_MODULE
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.split('?')[0] !== ROUTE) return next()

        try {
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}

/**
 * Tek-tıkla ilan aktarımının yerel alıcısı (SADECE dev sunucusu).
 *
 * Akış: kullanıcı mağaza sayfasında "Toprak İlan Aktar" yer imine tıklar →
 * yer imi DOM'dan ilanları okuyup window.postMessage ile bu siteye yollar →
 * site /__ilan-sync'e POST eder → bu middleware public/ilanlar.json'u günceller.
 *
 * Neden böyle? sahibinden Cloudflare koruması sunucu taraflı çekişe izin
 * vermez; ama kullanıcının kendi tarayıcısındaki DOM'a erişimde engel yoktur.
 * Üretim derlemesine dahil edilmez (`apply: 'serve'`).
 */
function ilanSyncReceiver(): Plugin {
  const ROUTE = '/__ilan-sync'
  const MAX_BODY = 5_000_000
  const STORE_URL = 'https://sivastoprakgayrimenkulsivas.sahibinden.com/'

  function cacheFile(): string {
    return path.resolve(process.cwd(), 'public/ilanlar.json')
  }

  function readCache(): { updatedAt: string; source: string; count: number; listings: any[] } {
    try {
      const raw = fs.readFileSync(cacheFile(), 'utf-8')
      const data = JSON.parse(raw)
      return {
        updatedAt: data.updatedAt ?? new Date(0).toISOString(),
        source: data.source ?? STORE_URL,
        count: Array.isArray(data.listings) ? data.listings.length : 0,
        listings: Array.isArray(data.listings) ? data.listings : [],
      }
    } catch {
      return { updatedAt: new Date(0).toISOString(), source: STORE_URL, count: 0, listings: [] }
    }
  }

  function sanitize(input: any, index: number): any | null {
    if (!input || typeof input !== 'object') return null
    let url = String(input.url ?? '')
    // İlan bağlantısını kanonik biçime indir: origin + path (takip parametreleri atılır)
    try {
      const u = new URL(url)
      url = u.origin + u.pathname
    } catch {
      /* göreli ya da bozuk URL — aşağıdaki kontrol eler */
    }
    if (!url.includes('sahibinden.com/ilan/')) return null
    const title = String(input.title ?? '').slice(0, 200).trim() || 'Sahibinden İlanı'
    const price = String(input.price ?? '').slice(0, 60).trim() || 'Fiyat için ilana bakın'
    const digits = price.replace(/[^0-9]/g, '')
    const t = title.toLocaleLowerCase('tr')
    const category = t.includes('kiralık') ? 'Kiralık'
      : /arsa|tarla|bahçe/.test(t) ? 'Arsa'
      : /işyeri|dükkan|ofis/.test(t) ? 'İşyeri'
      : /villa|müstakil/.test(t) ? 'Villa'
      : 'Satılık'
    return {
      id: `yerimi-${Date.now().toString(36)}-${index}`,
      title,
      price,
      priceNumeric: digits ? Number(digits) : null,
      location: String(input.location ?? 'Sivas').slice(0, 120),
      category,
      image: String(input.image ?? '').startsWith('http') ? String(input.image).slice(0, 500) : '',
      url,
      area: normalizeArea(input.area),
      photos: normalizePhotos(input.photos),
      desc: String(input.desc ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
      ilanNo: deriveIlanNo(url),
    }
  }

  /** Galeri: en fazla 8 uzak fotoğraf, temizlenmiş. */
  function normalizePhotos(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return input
      .filter((u) => typeof u === 'string' && (u as string).startsWith('http'))
      .map((u) => String(u).slice(0, 500))
      .slice(0, 8);
  }

  /** İlan URL'sindeki sayısal kimlik: ...-firsati-1207562186/detay → 1207562186 */
  function deriveIlanNo(url: string): string {
    const groups = url.match(/\d{6,}/g) ?? [];
    const long = groups.filter((g) => g.length >= 7);
    return long.length > 0 ? long[long.length - 1] : '';
  }

  /** "90 m2" / "185 m²" → "90 m²" biçimine getirir, uymayanı boş bırakır. */
  function normalizeArea(input: unknown): string {
    const raw = String(input ?? '').slice(0, 20).trim();
    const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*m(2|²)$/i);
    return m ? `${m[1]} m²` : '';
  }

  function countLocalImages(listings: any[]): number {
    return listings.filter(
      (l: any) => typeof l?.image === 'string' && (l.image as string).startsWith('/ilan-images/'),
    ).length
  }

  /** Aynı karenin daha önce indirilmiş dosyası varsa onu kullan (tekrar indirme). */
  function existingLocal(url: string, dir: string): string | null {
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)
    try {
      for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(hash)) return `/ilan-images/${f}`
      }
    } catch {
      /* yoksay */
    }
    return null
  }

  function imageFileFor(url: string, contentType: string): string {
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)
    const ct = (contentType || '').toLowerCase()
    let ext = ct.includes('png') ? '.png'
      : ct.includes('webp') ? '.webp'
      : ct.includes('gif') ? '.gif'
      : ct.includes('avif') ? '.avif'
      : ''
    if (!ext) {
      const m = /\.([a-z0-9]{3,4})(?:[?#]|$)/i.exec(url)
      const cand = (m?.[1] || '').toLowerCase()
      ext = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(cand) ? `.${cand}` : '.jpg'
    }
    return `${hash}${ext}`
  }

  /** Uzak fotoğrafı indirir (sahibinden sıcak-bağlantı korumasına Referer ile). */
  async function fetchImage(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: 'https://www.sahibinden.com/',
          'Accept-Language': 'tr-TR,tr;q=0.9',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
      })
      if (!res.ok) return null
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.startsWith('image/')) return null
      const buf = Buffer.from(await res.arrayBuffer())
      // Gerçek fotoğraflar KB'larca olur; 1-2 KB'lık pikseller/ikonlar elenir
      if (buf.length < 4096) return null
      return { buf, contentType }
    } catch {
      return null
    }
  }

  let localizing = false

  /**
   * Önbellekteki uzak fotoğrafları public/ilan-images altına indirir ve
   * ilanları yerel yola çevirir. POST yanıtından SONRA arka planda çalışır;
   * bitince siteyi yeniler. Başarısız olanlar uzak URL'de kalır.
   */
  async function localizeImages(server: { ws: { send: (payload: unknown) => void } }) {
    if (localizing) return
    localizing = true
    try {
      const file = cacheFile()
      let cache: any
      try {
        cache = JSON.parse(fs.readFileSync(file, 'utf-8'))
      } catch {
        return
      }
      const listings = Array.isArray(cache.listings) ? cache.listings : []
      // Kapak + galeri (ilan başına en fazla 3 ek foto) → iş listesi
      type ImgJob = { item: any; get: () => string; set: (v: string) => void };
      const jobs: ImgJob[] = [];
      for (const item of listings) {
        if (typeof item?.image === 'string' && (item.image as string).startsWith('http')) {
          jobs.push({ item, get: () => item.image as string, set: (v) => { item.image = v; } });
        }
        if (Array.isArray(item?.photos)) {
          (item.photos as unknown[]).slice(0, 3).forEach((u, i) => {
            if (typeof u === 'string' && (u as string).startsWith('http')) {
              const idx = i;
              jobs.push({
                item,
                get: () => (item.photos as string[])[idx] as string,
                set: (v) => { (item.photos as string[])[idx] = v; },
              });
            }
          });
        }
        if (jobs.length >= 250) break;
      }
      const pending = jobs.slice(0, 250);
      if (pending.length === 0) return
      const dir = path.resolve(process.cwd(), 'public', 'ilan-images')
      fs.mkdirSync(dir, { recursive: true })
      let ok = 0
      let fail = 0
      let reused = 0
      const take = async (): Promise<void> => {
        for (;;) {
          const job = pending.shift()
          if (!job) return
          const remote = job.get()
          if (!remote || !remote.startsWith('http')) continue
          const already = existingLocal(remote, dir)
          if (already) {
            job.set(already)
            reused++
            continue
          }
          const got = await fetchImage(remote)
          if (!got) {
            fail++
            continue
          }
          try {
            const name = imageFileFor(remote, got.contentType)
            const dest = path.join(dir, name)
            // Aynı karenin eski uzantılı kopyası varsa sil (tek dosya ilkesi)
            const hash = name.slice(0, 16)
            for (const f of fs.readdirSync(dir)) {
              if (f.startsWith(hash) && f !== name) {
                try { fs.unlinkSync(path.join(dir, f)) } catch { /* yoksay */ }
              }
            }
            fs.writeFileSync(dest, got.buf)
            job.set(`/ilan-images/${name}`)
            ok++
          } catch {
            fail++
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, pending.length) }, take))
      fs.writeFileSync(file, JSON.stringify({ ...cache, listings }, null, 2), 'utf-8')
      server.ws.send({ type: 'full-reload', path: '*' })
      console.log(`[ilan-sync] fotoğraf: ${ok} indirildi, ${reused} hazır kullanıldı, ${fail} alınamadı`)
    } finally {
      localizing = false
    }
  }

  return {
    name: 'ilan-sync-receiver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url || '').split('?')[0] !== ROUTE) return next()

        if (req.method === 'GET') {
          const cache = readCache()
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({
            ok: true,
            count: cache.count,
            updatedAt: cache.updatedAt,
            localImages: countLocalImages(cache.listings),
          }))
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
          if (body.length > MAX_BODY) req.destroy()
        })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            const incoming = Array.isArray(data.listings) ? data.listings : []
            if (incoming.length === 0) throw new Error('listings boş')
            const clean = incoming.map(sanitize).filter(Boolean).slice(0, 300)
            if (clean.length === 0) throw new Error('geçerli ilan yok')

            const cache = readCache()
            const byUrl = new Map(cache.listings.map((l: any) => [l.url, l]))
            let added = 0
            for (const item of clean) {
              if (!byUrl.has(item.url)) added++
              byUrl.set(item.url, item)
            }
            const merged = [...byUrl.values()].slice(0, 300)
            const payload = {
              updatedAt: new Date().toISOString(),
              source: STORE_URL,
              count: merged.length,
              listings: merged,
            }
            fs.mkdirSync(path.dirname(cacheFile()), { recursive: true })
            fs.writeFileSync(cacheFile(), JSON.stringify(payload, null, 2), 'utf-8')
            server.ws.send({ type: 'full-reload', path: '*' })
            const withPrice = merged.filter((l: any) => l.priceNumeric).length
            const withImage = merged.filter((l: any) => l.image).length
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true, count: merged.length, added, withPrice, withImage }))
            // Fotoğrafları arka planda siteye indir (yanıtı bekletmez)
            void localizeImages(server).catch(() => { /* günlük zaten yazıldı */ })
          } catch (err) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: (err as Error).message ?? 'hatalı istek' }))
          }
        })
      })
    },
  }
}
