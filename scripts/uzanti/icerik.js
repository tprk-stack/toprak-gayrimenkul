// Icerik betigi: yalnizca adres cubugunda #toprak-oto varsa calisir
// (normal ziyaretlerde sessiz kalir). Gercek tarayici oturumunu kullandigi
// icin koruma duvarina takilmaz: sayfalari gezer, detaylari okur,
// fotograflari + JSON dosyasini arka plana indirtir.
(async function () {
  if (!location.hash || location.hash.indexOf('toprak-oto') < 0) return;

  var clean = function (s) { return (s || '').replace(/\s+/g, ' ').trim(); };
  var abs = function (h) {
    if (!h) return '';
    if (/^https?:/.test(h)) return h;
    if (h.indexOf('//') === 0) return 'https:' + h;
    if (h.charAt(0) === '/') return 'https://www.sahibinden.com' + h;
    return h;
  };
  var absUrl = function (base, h) {
    if (!h) return '';
    if (/^https?:/.test(h)) return h;
    if (h.indexOf('//') === 0) return 'https:' + h;
    try { return new URL(h, base).href.split('#')[0]; } catch (e) { return ''; }
  };
  var findPrice = function (r) {
    var t = clean(r.innerText || r.textContent || '');
    var m = t.match(/(\d[\d.,\s\xa0]*\d)\s*(TL|\u00ba)/i);
    if (!m) return '';
    if (m[1].replace(/\D/g, '').length < 3) return '';
    return m[0].trim();
  };
  var findImg = function (r) {
    var imgs = r.querySelectorAll ? r.querySelectorAll('img') : [];
    var best = '';
    var bs = -99;
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      var src = im.currentSrc || im.src || im.getAttribute('data-src') || im.getAttribute('data-original') || im.getAttribute('data-lazy') || '';
      if (!src) {
        var ss = im.getAttribute('srcset') || im.getAttribute('data-srcset') || '';
        if (ss) src = ss.split(',')[0].trim().split(' ')[0];
      }
      src = abs(src);
      if (!src || src.indexOf('data:') === 0) continue;
      if (/placeholder|blank|spacer|loading|pixel|1x1|icon/i.test(src)) continue;
      var sc = 0;
      if (/photos/i.test(src)) sc += 3;
      if (/\.(jpe?g|avif|webp)/i.test(src)) sc += 1;
      if (/logo/i.test(src)) sc -= 5;
      if (sc > bs) { bs = sc; best = src; }
    }
    return bs >= 0 ? best : '';
  };
  var findArea = function (t) {
    var m = t.match(/(\d+(?:[.,]\d+)?)\s*m(2|\u00b2)/i);
    return m ? (m[1] + ' m\u00b2') : '';
  };
  var boxFor = function (a, bd) {
    if (a.closest) { var tr = a.closest('tr'); if (tr) return tr; }
    var el = a, best = a, imgBox = null;
    for (var d = 0; d < 6 && el && el.parentElement; d++) {
      el = el.parentElement;
      if (!/^(DIV|LI|ARTICLE|TD|SECTION|FIGURE|MAIN)$/.test(el.tagName)) continue;
      best = el;
      if (findPrice(el)) return el;
      if (imgBox === null && el.querySelector && el.querySelector('img')) imgBox = el;
      if (el === bd) break;
    }
    return imgBox || best;
  };
  var locOf = function (card) {
    var lt = clean(card.innerText || card.textContent || '');
    var lm = lt.match(/Sivas\s*\/\s*([A-Za-z\u00c0-\u024f]+(?:\s+[A-Za-z\u00c0-\u024f]+)?)/);
    return lm ? lm[0].trim() : 'Sivas';
  };

  var seen = {};
  var items = [];

  function harvest(d, base, bd) {
    var cards = d.querySelectorAll('div.classified');
    for (var c = 0; c < cards.length; c++) {
      var card = cards[c];
      var la = card.querySelector('.gallery-info a[href*="/ilan/"]') || card.querySelector('a[href*="/ilan/"]');
      if (!la) continue;
      var uu = abs(la.getAttribute('href') || '');
      if (!uu || seen[uu] || uu.indexOf('/ilan/') < 0) continue;
      var pt = card.querySelector('p.title');
      var tt = clean(la.textContent || '').substring(0, 160)
        || clean(la.getAttribute('title') || '').substring(0, 160)
        || clean((pt && pt.textContent) || '').substring(0, 160);
      if (!tt || tt.length < 8) continue;
      seen[uu] = 1;
      items.push({
        title: tt,
        price: findPrice(card) || 'Fiyat icin ilana bakin',
        location: locOf(card),
        image: findImg(card),
        url: uu,
        area: findArea(clean(card.innerText || card.textContent || '')),
        photos: [],
        desc: '',
      });
    }
    var links = d.querySelectorAll('a[href*="/ilan/"]');
    for (var k = 0; k < links.length; k++) {
      var a = links[k];
      var u = abs(a.getAttribute('href') || '');
      if (!u || seen[u] || u.indexOf('/ilan/') < 0) continue;
      var box = boxFor(a, bd);
      var t = clean(a.getAttribute('title') || '') || clean(a.textContent || '').substring(0, 160);
      if (!t || t.length < 8) continue;
      seen[u] = 1;
      var bt = clean(box.innerText || box.textContent || '');
      items.push({
        title: t,
        price: findPrice(box) || 'Fiyat icin ilana bakin',
        location: 'Sivas',
        image: findImg(box),
        url: u,
        area: findArea(bt),
        photos: [],
        desc: '',
      });
    }
  }

  function nextUrl(d, base) {
    var r = d.querySelector('a[rel="next"]');
    if (r && r.getAttribute('href')) {
      var u0 = absUrl(base, r.getAttribute('href'));
      if (u0 && u0 !== base) return u0;
    }
    var as = d.querySelectorAll('a');
    for (var i = 0; i < as.length; i++) {
      var et = clean(as[i].textContent || '');
      if (/^sonraki[^a-z]*$/i.test(et)) {
        var h = as[i].getAttribute('href');
        if (h) {
          var u1 = absUrl(base, h);
          if (u1 && u1 !== base) return u1;
        }
      }
    }
    return '';
  }

  function parseDetail(h, base) {
    var t = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    var out = { area: '', photos: [], desc: '' };
    var tx = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    var ps = [
      /m\u00b2\s*\(?\s*br.t\s*\)?[^0-9]{0,20}(\d[\d.,]*)/i,
      /m\u00b2\s*\(?\s*net\s*\)?[^0-9]{0,20}(\d[\d.,]*)/i,
      /(\d[\d.,]*)\s*m\u00b2/i,
    ];
    for (var pi = 0; pi < ps.length; pi++) {
      var dm = tx.match(ps[pi]);
      if (dm && dm[1] && dm[1].replace(/\D/g, '').length >= 1) {
        out.area = dm[1].replace(/\s+/g, '') + ' m\u00b2';
        break;
      }
    }
    var dg = t.match(/<meta[^>]+name="description"[^>]+content="([^"]{20,500})"/i)
      || t.match(/<meta[^>]+content="([^"]{20,500})"[^>]+name="description"/i);
    if (dg) out.desc = dg[1].replace(/\s+/g, ' ').trim().substring(0, 300);
    var seenI = {};
    var imRe = /<img[^>]+(?:data-src|src)="([^"]+)"/gi;
    var m2;
    while ((m2 = imRe.exec(t)) && out.photos.length < 8) {
      var u = absUrl(base, m2[1]);
      if (!u || seenI[u]) continue;
      if (u.indexOf('data:') === 0) continue;
      if (/placeholder|blank|spacer|loading|pixel|1x1|icon|logo/i.test(u)) continue;
      seenI[u] = 1;
      out.photos.push(u);
    }
    out.photos.sort(function (a, b) {
      return (/photos/i.test(a) ? 0 : 1) - (/photos/i.test(b) ? 0 : 1);
    });
    return out;
  }

  function fileOf(u) {
    var base = u.split('?')[0].split('#')[0].split('/').pop() || 'foto.jpg';
    return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  }

  function gonder(m) {
    try {
      var r = chrome.runtime.sendMessage(m);
      if (r && r.then) return r.catch(function () { return { ok: false }; });
    } catch (e) { /* dusme */ }
    return Promise.resolve({ ok: false });
  }
  function bekle(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var badge = document.createElement('div');
  badge.setAttribute('style', 'position:fixed;bottom:12px;right:12px;z-index:999999;background:#111;color:#fff;padding:10px 14px;font:13px sans-serif;border-radius:6px;');
  document.body.appendChild(badge);
  function rozet(t) { try { badge.textContent = t; } catch (e) {} }
  function bitir(not) {
    try {
      var f = 0, g = 0, ar = 0;
      for (var j = 0; j < items.length; j++) {
        if (items[j].price && items[j].price.indexOf('TL') >= 0) f++;
        if (items[j].image) g++;
        if (items[j].area) ar++;
      }
      var payload = {
        updatedAt: new Date().toISOString(),
        source: 'https://sivastoprakgayrimenkulsivas.sahibinden.com/',
        count: items.length,
        pages: pages,
        listings: items.map(function (x, i) {
          return {
            id: 'uzanti-' + (i + 1),
            title: x.title,
            price: x.price,
            priceNumeric: null,
            location: x.location,
            category: 'Satilik',
            image: x.image,
            url: x.url,
            area: x.area,
            photos: x.photos,
            desc: x.desc,
          };
        }),
      };
      gonder({ t: 'json', json: JSON.stringify(payload) }).then(function () {
        rozet(items.length + ' ilan aktarıldı' + (not ? ' ' + not : '') + ' — bu sekme kapatılabilir.');
      });
    } catch (e) {
      rozet('Hata: ' + String((e && e.message) || e));
    }
  }

  var seenP = {};
  var queue = [location.href.split('#')[0]];
  var pages = 0;
  var MAXP = 10;
  var limited = false;

  async function adim() {
    if (!queue.length || pages >= MAXP) return detayBasla();
    var url = queue.shift();
    if (seenP[url]) return adim();
    seenP[url] = 1;
    pages++;
    rozet('Toprak: sayfa ' + pages + ' okunuyor...');
    if (pages === 1) {
      harvest(document, location.href, document.body);
      var nx = nextUrl(document, location.href);
      if (nx && !seenP[nx]) queue.push(nx);
      await bekle(1500);
      return adim();
    }
    await bekle(1500 + Math.floor(Math.random() * 1000));
    var h = '';
    try {
      var r = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
      if (r.status === 429) { limited = true; throw new Error('limit'); }
      var ru = r.url || '';
      if (/giris|login|uyeol/i.test(ru)) { limited = true; throw new Error('login'); }
      if (!r.ok) throw new Error('http');
      h = await r.text();
    } catch (e) {
      if (limited) queue.length = 0;
      return adim();
    }
    var doc = new DOMParser().parseFromString(h, 'text/html');
    harvest(doc, url, doc.body);
    var nx2 = nextUrl(doc, url);
    if (nx2 && !seenP[nx2]) queue.push(nx2);
    return adim();
  }

  var detailIdx = 0;
  var detailList = [];
  async function detayBasla() {
    detailList = items.filter(function (x) { return !x.area; }).slice(0, 40);
    if (!detailList.length) return fotoBasla('');
    detailIdx = 0;
    var not = limited ? '[sayfa limiti]' : '';
    rozet('Toprak: detaylar okunuyor 0/' + detailList.length + '...' + not);
    await bekle(1200);
    return detayAdim(not);
  }
  async function detayAdim(not) {
    if (detailIdx >= detailList.length) return fotoBasla(not);
    var it = detailList[detailIdx];
    rozet('Toprak: detaylar okunuyor ' + (detailIdx + 1) + '/' + detailList.length + '...');
    try {
      var r = await fetch(it.url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
      if (r.status === 429) throw new Error('limit');
      if (!r.ok) throw new Error('http');
      var h = await r.text();
      var dd = parseDetail(h, it.url);
      if (dd.area) it.area = dd.area;
      it.photos = dd.photos;
      it.desc = dd.desc;
    } catch (e) { /* siradaki */ }
    detailIdx++;
    await bekle(1800 + Math.floor(Math.random() * 900));
    return detayAdim(not);
  }

  async function fotoBasla(not) {
    var jobs = [];
    for (var i = 0; i < items.length && jobs.length < 250; i++) {
      var it = items[i];
      var aday = [];
      if (it.image) aday.push(it.image);
      for (var k = 0; k < Math.min(3, it.photos.length); k++) aday.push(it.photos[k]);
      for (var q = 0; q < aday.length; q++) {
        jobs.push({ it: it, url: aday[q], ana: q === 0 });
      }
    }
    var n = 0;
    for (var j = 0; j < jobs.length; j++) {
      var jb = jobs[j];
      var dosya = fileOf(jb.url);
      rozet('Toprak: fotograflar indiriliyor ' + (j + 1) + '/' + jobs.length + '...');
      var r = await gonder({ t: 'img', url: jb.url, file: dosya });
      if (!r || !r.ok) continue;
      var yerel = '/ilan-images/' + dosya;
      if (jb.ana) jb.it.image = yerel;
      else {
        var ix = jb.it.photos.indexOf(jb.url);
        if (ix >= 0) jb.it.photos[ix] = yerel;
      }
      n++;
      await bekle(250);
    }
    bitir((not ? not + ' ' : '') + '(' + n + ' fotograf)');
  }

  adim();
})();
