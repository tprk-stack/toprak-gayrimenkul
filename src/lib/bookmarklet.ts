// "Toprak İlan Aktar" yer imi (bookmarklet) — elle aktarım yedeği.
//
// Kullanım: paneldeki "İlan Aktar" bağlantısını
// tarayıcının yer imleri çubuğuna sürükle → mağaza sayfasında tıkla.
// Yer imi sayfanın DOM'undan ilanları okur, window.postMessage ile localhost'taki
// siteye yollar; site /__ilan-sync alıcısına POST eder, ilanlar anında düşer.
//
// Neden bu yöntem? Kaynak sitenin koruması sunucu taraflı çekişi engeller ama
// kullanıcının kendi tarayıcısındaki DOM'a erişimde hiçbir engel yoktur.

export const RECEIVER_ORIGIN = 'http://localhost:8443';

/* eslint-disable */
// Bu fonksiyon yabancı sayfada (ilan portalı) çalışır: bağımsız olmalı,
// dışa ait hiçbir değişkene kapanmamalı, __ORIGIN__ yer tutucusunu kullanmalı.
function bookmarkletMain() {
  var ORIGIN = '__ORIGIN__';
  var abs = function (h: string): string {
    if (!h) return '';
    if (/^https?:/.test(h)) return h;
    if (h.indexOf('//') === 0) return 'https:' + h;
    if (h.charAt(0) === '/') return 'https://www.sahibinden.com' + h;
    return h;
  };
  var items: Array<{ title: string; price: string; location: string; image: string; url: string; area: string }> = [];
  var seen: Record<string, number> = {};
  var clean = function (s: string): string {
    return (s || '').replace(/\s+/g, ' ').trim();
  };
  // Metrekare: "90 m2" / "185 m²" → "90 m²".
  var findArea = function (text: string): string {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*m(2|²)/i);
    return m ? `${m[1]} m²` : '';
  };
  var findPrice = function (root: any): string {
    const t = clean((root.innerText || root.textContent) as string);
    const m = t.match(/(\d[\d.,\s\xa0]*\d)\s*(TL|₺)/i);
    if (!m) return '';
    if (m[1].replace(/\D/g, '').length < 3) return '';
    return m[0].trim();
  };
  // Fotoğraf: adaylar arasından en fotoğraf-benzerini seç (/photos/ öncelikli, logo elenir).
  var findImg = function (root: any): string {
    var imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];
    var best = '';
    var bestScore = -99;
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      var src =
        im.currentSrc ||
        im.src ||
        im.getAttribute('data-src') ||
        im.getAttribute('data-original') ||
        im.getAttribute('data-lazy') ||
        '';
      if (!src) {
        var ss = im.getAttribute('srcset') || im.getAttribute('data-srcset') || '';
        if (ss) src = (ss as string).split(',')[0].trim().split(' ')[0];
      }
      src = abs(src as string);
      if (!src || src.indexOf('data:') === 0) continue;
      if (/placeholder|blank|spacer|loading|pixel|1x1|icon/i.test(src)) continue;
      var score = 0;
      if (/\/photos\//i.test(src)) score += 3;
      if (/\.(jpe?g|avif|webp)(\?|$)/i.test(src)) score += 1;
      if (/logo/i.test(src)) score -= 5;
      if (score > bestScore) {
        bestScore = score;
        best = src;
      }
    }
    return bestScore >= 0 ? best : '';
  };
  // Konum: bilinen seçiciler, yoksa 'Sivas'.
  var findLoc = function (root: any): string {
    var sels = [
      '.searchResultsLocationValue',
      '[class*=ocation]',
      '[class*=onum]',
      '[class*=dres]',
      '[class*=semt]',
      '[class*=ahalle]',
      '[class*=ilce]',
      '[class*=city]',
      '[class*=town]',
      '[class*=sehir]',
      '[class*=koy]',
      '[class*=cadde]',
      '[class*=sokak]',
      '[class*=bulvar]',
      '[class*=district]',
    ];
    for (var i = 0; i < sels.length; i++) {
      var e = root.querySelector ? root.querySelector(sels[i]) : null;
      var t = e ? clean(e.textContent || '') : '';
      if (t.length > 1 && t.length < 100) return t;
    }
    return 'Sivas';
  };
  // Bağlantıyı saran kartı bul: ÖNCE fiyat içeren en küçük kapsayıcı
  // (fiyat genelde fotoğrafın kardeş kutusundadır), yoksa fotoğraflı kapsayıcı.
  var containerFor = function (a: any): any {
    if (a.closest) {
      var tr = a.closest('tr');
      if (tr) return tr;
    }
    var el = a;
    var best = a;
    var imgBox: any = null;
    for (var depth = 0; depth < 6 && el && el.parentElement; depth++) {
      el = el.parentElement;
      if (!/^(DIV|LI|ARTICLE|TD|SECTION|FIGURE|MAIN)$/.test(el.tagName)) continue;
      best = el;
      if (findPrice(el)) return el;
      if (imgBox === null && el.querySelector && el.querySelector('img')) imgBox = el;
      if (el === document.body) break;
    }
    return imgBox || best;
  };
  // Mağaza galeri görünümü: her DIV.classified bir ilandır (foto + p.title + fiyat).
  var cards = document.querySelectorAll('div.classified');
  cards.forEach(function (card) {
    var la = card.querySelector('.gallery-info a[href*="/ilan/"]') || card.querySelector('a[href*="/ilan/"]');
    if (!la) return;
    var uu = abs(la.getAttribute('href') || '');
    if (!uu || seen[uu] || uu.indexOf('/ilan/') < 0) return;
    var pt = card.querySelector('p.title');
    var lat = (la as HTMLAnchorElement).textContent || '';
    var tt = clean(lat).substring(0, 160)
      || clean((la as HTMLAnchorElement).title || '').substring(0, 160)
      || clean((pt && pt.textContent) || '').substring(0, 160);
    if (!tt || tt.length < 8) return;
    seen[uu] = 1;
    var pp = findPrice(card) || 'Fiyat icin ilana bakin';
    var lt = clean(((card as HTMLElement).innerText || card.textContent) as string);
    var lm = lt.match(/Sivas\s*\/\s*([A-Za-zÀ-ɏ]+(?:\s+[A-Za-zÀ-ɏ]+)?)/);
    var ll = lm ? lm[0].trim() : findLoc(card);
    var sr = findImg(card);
    items.push({ title: tt, price: pp, location: ll, image: sr, url: uu, area: findArea(lt) });
  });
  var links = document.querySelectorAll('a[href*="/ilan/"]');
  links.forEach(function (a) {
    var u = abs(a.getAttribute('href') || '');
    if (!u || seen[u] || u.indexOf('/ilan/') < 0) return;
    var box = containerFor(a);
    var t =
      clean(a.getAttribute('title') || '') ||
      clean(a.textContent || '').substring(0, 160);
    if (!t || t.length < 8) {
      var im0 = box.querySelector ? box.querySelector('img') : null;
      t = clean((im0 && im0.getAttribute('alt')) || '').substring(0, 160);
    }
    if (!t || t.length < 8) return;
    if (/^giriş|^üye|yardım|anasayfa|gizlilik|kvkk/i.test(t)) return;
    seen[u] = 1;
    var p = findPrice(box) || 'Fiyat icin ilana bakin';
    var bt = clean(((box as HTMLElement).innerText || box.textContent) as string);
    items.push({ title: t, price: p, location: findLoc(box), image: findImg(box), url: u, area: findArea(bt) });
  });
  if (!items.length) {
    alert('Bu sayfada ilan bulunamadi. Magaza sayfasinda oldugunuzdan emin olun.');
    return;
  }
  var w = window.open(ORIGIN + '/#yonetim');
  if (!w) {
    alert('Acilir pencere engellendi! Adres cubugundaki pencere simgesinden izin verip tekrar tiklayin.');
    return;
  }
  const target: Window = w;
  var tries = 0;
  var iv = window.setInterval(function () {
    tries++;
    try {
      target.postMessage({ type: 'toprak-ilanlar', listings: items, page: location.href }, ORIGIN);
    } catch (e) { /* alıcı henüz hazır değil */ }
    if (tries > 40) window.clearInterval(iv);
  }, 1000);
  window.addEventListener('message', function f(e) {
    if (e.origin !== ORIGIN) return;
    if (e.data && e.data.type === 'toprak-ilanlar-alindi') {
      window.clearInterval(iv);
      window.removeEventListener('message', f);
      alert(e.data.count + ' ilan siteye aktarildi');
      try { target.close(); } catch (_) { /* yoksay */ }
    }
  });
}
/* eslint-enable */

export function bookmarkletHref(): string {
  const src = bookmarkletMain
    .toString()
    .split('__ORIGIN__')
    .join(RECEIVER_ORIGIN);
  return `javascript:(${src})()`;
}

export interface IncomingBookmarkletData {
  type: 'toprak-ilanlar';
  listings: Array<{
    title?: string;
    price?: string;
    location?: string;
    image?: string;
    url?: string;
  }>;
  page?: string;
}

/** Yer iminden gelen veriyi sıkı şekilde doğrular (güvenlik). */
export function isValidIncoming(data: unknown): data is IncomingBookmarkletData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.type !== 'toprak-ilanlar' || !Array.isArray(d.listings)) return false;
  if (d.listings.length === 0 || d.listings.length > 500) return false;
  return d.listings.every(
    (l) =>
      l &&
      typeof l === 'object' &&
      typeof (l as { url?: unknown }).url === 'string' &&
      (l as { url: string }).url.includes('sahibinden.com/ilan/'),
  );
}

/**
 * Konsol-kod: magaza sayfasinda F12 -> Konsol'a yapistir -> Enter.
 * Ilanlari DOM'dan okuyup ilanlar.json olarak indirir (pencere/popup yok).
 * ASCII-only yazilmistir; dis bagimliligi yoktur.
 */
export const CONSOLE_SNIPPET = [
  '(function(){',
  "var abs=function(h){if(!h)return '';if(/^https?:/.test(h))return h;if(h.indexOf('//')===0)return 'https:'+h;if(h.charAt(0)==='/')return 'https://www.sahibinden.com'+h;return h;};",
  "var clean=function(s){return (s||'').replace(/\\s+/g,' ').trim();};",
  "var findPrice=function(r){var t=clean(r.innerText||r.textContent||'');var m=t.match(/(\\d[\\d.,\\s\\xa0]*\\d)\\s*(TL|\\u20BA)/i);if(!m)return '';if(m[1].replace(/\\D/g,'').length<3)return '';return m[0].trim();};",
  "var findArea=function(t){var m=t.match(/(\\d+(?:[.,]\\d+)?)\\s*m(2|\\u00b2)/i);return m?(m[1]+' m\\u00b2'):'';}",
  "var findImg=function(r){var imgs=r.querySelectorAll?r.querySelectorAll('img'):[];var best='';var bs=-99;for(var i=0;i<imgs.length;i++){var im=imgs[i];var src=im.currentSrc||im.src||im.getAttribute('data-src')||im.getAttribute('data-original')||im.getAttribute('data-lazy')||'';if(!src){var ss=im.getAttribute('srcset')||im.getAttribute('data-srcset')||'';if(ss)src=ss.split(',')[0].trim().split(' ')[0];}src=abs(src);if(!src||src.indexOf('data:')===0)continue;if(/placeholder|blank|spacer|loading|pixel|1x1|icon/i.test(src))continue;var sc=0;if(/photos/i.test(src))sc+=3;if(/\\.(jpe?g|avif|webp)/i.test(src))sc+=1;if(/logo/i.test(src))sc-=5;if(sc>bs){bs=sc;best=src;}}return bs>=0?best:'';}",
  "var findLoc=function(r){var sels=['.searchResultsLocationValue','[class*=ocation]','[class*=onum]','[class*=dres]','[class*=semt]','[class*=ahalle]','[class*=ilce]','[class*=city]','[class*=town]','[class*=sehir]','[class*=koy]','[class*=cadde]','[class*=sokak]','[class*=bulvar]','[class*=district]'];for(var i=0;i<sels.length;i++){var e=r.querySelector?r.querySelector(sels[i]):null;var t=e?clean(e.textContent||''):'';if(t.length>1&&t.length<100)return t;}return 'Sivas';};",
  "var boxFor=function(a,bd){if(a.closest){var tr=a.closest('tr');if(tr)return tr;}var el=a;var best=a;var imgBox=null;for(var d=0;d<6&&el&&el.parentElement;d++){el=el.parentElement;if(!/^(DIV|LI|ARTICLE|TD|SECTION|FIGURE|MAIN)$/.test(el.tagName))continue;best=el;if(findPrice(el))return el;if(imgBox===null&&el.querySelector&&el.querySelector('img'))imgBox=el;if(el===bd)break;}return imgBox||best;};",
  "var seen={};var items=[];",
  "var harvest=function(d,base,bd){",
  "var cards=d.querySelectorAll('div.classified');",
  "for(var c=0;c<cards.length;c++){var card=cards[c];var la=card.querySelector('.gallery-info a[href*=\"/ilan/\"]')||card.querySelector('a[href*=\"/ilan/\"]');if(!la)continue;var uu=abs(la.getAttribute('href')||'');if(!uu||seen[uu]||uu.indexOf('/ilan/')<0)continue;var pt=card.querySelector('p.title');var tt=clean(la.textContent||'').substring(0,160)||clean(la.getAttribute('title')||'').substring(0,160)||clean((pt&&pt.textContent)||'').substring(0,160);if(!tt||tt.length<8)continue;seen[uu]=1;var pp=findPrice(card);var lt=clean(card.innerText||card.textContent||'');var lm=lt.match(/Sivas\\s*\\/\\s*([A-Za-z\\u00c0-\\u024f]+(?:\\s+[A-Za-z\\u00c0-\\u024f]+)?)/);var ll=lm?lm[0].trim():'Sivas';var sr=findImg(card);items.push({id:'aktar-'+(items.length+1),title:tt,price:pp||'Fiyat icin ilana bakin',priceNumeric:null,location:ll,category:'Satilik',image:sr,url:uu,area:findArea(lt)});}",
  "var links=d.querySelectorAll('a[href*=\"/ilan/\"]');",
  "for(var k=0;k<links.length;k++){var a=links[k];var u=abs(a.getAttribute('href')||'');if(!u||seen[u]||u.indexOf('/ilan/')<0)continue;var box=boxFor(a,bd);var t=clean(a.getAttribute('title')||'')||clean(a.textContent||'').substring(0,160);if(!t||t.length<8){var im0=box.querySelector?box.querySelector('img'):null;t=clean((im0&&im0.getAttribute('alt'))||'').substring(0,160);}if(!t||t.length<8)continue;seen[u]=1;var p=findPrice(box);var bt=clean(box.innerText||box.textContent||'');items.push({id:'aktar-'+(items.length+1),title:t,price:p||'Fiyat icin ilana bakin',priceNumeric:null,location:findLoc(box),category:'Satilik',image:findImg(box),url:u,area:findArea(bt)});}",
  "};",
  "var resolve=function(base,h){try{return new URL(h,base).href.split('#')[0];}catch(e){return '';}};",
  "var absUrl=function(base,h){if(!h)return '';if(/^https?:/.test(h))return h;if(h.indexOf('//')===0)return 'https:'+h;try{return new URL(h,base).href.split('#')[0];}catch(e){return '';}};",
  "var nextUrl=function(d,base){var r=d.querySelector('a[rel=\"next\"]');if(r&&r.getAttribute('href')){var u0=resolve(base,r.getAttribute('href'));if(u0&&u0!==base)return u0;}var as=d.querySelectorAll('a');for(var i=0;i<as.length;i++){var et=clean(as[i].textContent||'');if(/^sonraki[^a-z]*$/i.test(et)){var h=as[i].getAttribute('href');if(h){var u1=resolve(base,h);if(u1&&u1!==base)return u1;}}}return '';};",
  "var seenP={};var queue=[location.href];var pages=0;var MAXP=10;var limited=false;",
  "var badge=document.createElement('div');badge.setAttribute('style','position:fixed;bottom:12px;right:12px;z-index:999999;background:#111;color:#fff;padding:10px 14px;font:13px sans-serif;border-radius:6px;');document.body.appendChild(badge);",
  "function setBadge(t){badge.textContent=t;}",
  "function finish(){if(!items.length){try{badge.remove();}catch(e){}alert('Ilan bulunamadi. Magaza sayfasinda oldugunuzdan emin olun.');return;}startDetails();}",
  "var detailIdx=0;var detailList=[];var detailLimited=false;",
  "function parseDetail(h,base){var t=h.replace(/<script[\\s\\S]*?<\\/script>/gi,' ').replace(/<style[\\s\\S]*?<\\/style>/gi,' ');var out={area:'',photos:[],desc:''};var tx=t.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ');var ps=[/m\\u00b2\\s*\\(?\\s*br.t\\s*\\)?[^0-9]{0,20}(\\d[\\d.,]*)/i,/m\\u00b2\\s*\\(?\\s*net\\s*\\)?[^0-9]{0,20}(\\d[\\d.,]*)/i,/(\\d[\\d.,]*)\\s*m\\u00b2/i];for(var pi=0;pi<ps.length;pi++){var dm=tx.match(ps[pi]);if(dm&&dm[1]){var nn=dm[1].replace(/\\s+/g,'');if(nn.replace(/\\D/g,'').length>=1){out.area=nn+' m\\u00b2';break;}}}var dg=t.match(/<meta[^>]+name=\"description\"[^>]+content=\"([^\"]{20,500})\"/i)||t.match(/<meta[^>]+content=\"([^\"]{20,500})\"[^>]+name=\"description\"/i);if(dg)out.desc=dg[1].replace(/\\s+/g,' ').trim().substring(0,300);var seen={};var imRe=/<img[^>]+(?:data-src|src)=\"([^\"]+)\"/gi;var m2;while((m2=imRe.exec(t))&&out.photos.length<8){var u=absUrl(base,m2[1]);if(!u||seen[u])continue;if(u.indexOf('data:')===0)continue;if(/placeholder|blank|spacer|loading|pixel|1x1|icon|logo/i.test(u))continue;seen[u]=1;out.photos.push(u);}out.photos.sort(function(a,b){var sa=/photos/i.test(a)?0:1;var sb=/photos/i.test(b)?0:1;return sa-sb;});return out;}",
  "function startDetails(){detailList=items.filter(function(x){return !x.area;}).slice(0,40);if(!detailList.length){download();return;}detailIdx=0;setBadge('Toprak: ilan detaylari okunuyor 0/'+detailList.length+'...');setTimeout(detailStep,1500);}",
  "function detailStep(){if(detailIdx>=detailList.length){download();return;}var it=detailList[detailIdx];setBadge('Toprak: ilan detaylari okunuyor '+(detailIdx+1)+'/'+detailList.length+'...');fetch(it.url,{credentials:'same-origin',headers:{'Accept':'text/html'}}).then(function(r){if(r.status===429){detailLimited=true;throw new Error('limit');}var ru=r.url||'';if(/giris|login|uyeol/i.test(ru)){detailLimited=true;throw new Error('login');}if(!r.ok)throw new Error('h');return r.text();}).then(function(h){var dd=parseDetail(h,it.url);if(dd.area)it.area=dd.area;it.photos=dd.photos;it.desc=dd.desc;detailIdx++;setTimeout(detailStep,1800+Math.floor(Math.random()*900));}).catch(function(){if(detailLimited)detailList.length=0;detailIdx++;setTimeout(detailStep,1500);});}",
  "function download(){try{badge.remove();}catch(e){}var payload={updatedAt:new Date().toISOString(),source:'https://sivastoprakgayrimenkulsivas.sahibinden.com/',count:items.length,pages:pages,listings:items};var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});var dl=document.createElement('a');dl.href=URL.createObjectURL(blob);dl.download='ilanlar.json';document.body.appendChild(dl);dl.click();setTimeout(function(){URL.revokeObjectURL(dl.href);dl.remove();},2000);var f=0,g=0,ar=0;for(var j=0;j<items.length;j++){if(items[j].price&&items[j].price.indexOf('TL')>=0)f++;if(items[j].image)g++;if(items[j].area)ar++;}var warn=(limited||detailLimited)?' [DIKKAT: erisim limiti - NORMAL sekmede GIRIS yapip tekrar calistirin]':'';alert(pages+' sayfadan '+items.length+' ilan indirildi: ilanlar.json ('+f+' fiyatli, '+g+' fotografli, '+ar+' metrekareli)'+warn);}",
  "function step(){if(!queue.length||pages>=MAXP){finish();return;}var url=queue.shift();if(seenP[url]){step();return;}seenP[url]=1;pages++;setBadge('Toprak ilanlar okunuyor: sayfa '+pages+'...');if(pages===1){harvest(document,location.href,document.body);var nx=nextUrl(document,location.href);if(nx&&!seenP[nx])queue.push(nx);setTimeout(step,1500);return;}setTimeout(function(){fetch(url,{credentials:'same-origin',headers:{'Accept':'text/html'}}).then(function(r){if(r.status===429){limited=true;throw new Error('limit');}var ru=r.url||'';if(/giris|login|uyeol/i.test(ru)){limited=true;throw new Error('login');}if(!r.ok)throw new Error('http');return r.text();}).then(function(h){var doc=new DOMParser().parseFromString(h,'text/html');harvest(doc,url,doc.body);var nx2=nextUrl(doc,url);if(nx2&&!seenP[nx2])queue.push(nx2);setTimeout(step,1500+Math.floor(Math.random()*1000));}).catch(function(){if(limited)queue.length=0;setTimeout(step,1500);});},1500);}",
  "step();",
  '})();',
].join('\n');

/**
 * Tani kodu: magaza sayfasinda F12 -> Konsol'a yapistir -> Enter.
 * Sayfada kopyalanabilir bir rapor kutusu acar (pano izni gerekmez:
 * kutudan secip kopyalayin). Cikti bana yapistirilirsa seciciler
 * sayfaya birebir uydurulur. ASCII-only.
 */
export const DIAG_SNIPPET = [
  '(function(){',
  "var clean=function(s){return (s||'').replace(/\\s+/g,' ').trim();};",
  "var cls=function(e){var c=e.className;if(typeof c!=='string')c='';return clean(c).split(' ').slice(0,3).join('.');};",
  "var out=[];",
  "out.push('LINK SAYISI: '+document.querySelectorAll('a[href*=\\\"/ilan/\\\"]').length);",
  "var links=document.querySelectorAll('a[href*=\\\"/ilan/\\\"]');",
  'for(var k=0;k<Math.min(links.length,3);k++){',
  'var a=links[k];',
  "out.push('--- ILAN '+(k+1)+' ---');",
  "out.push('HREF: '+a.getAttribute('href'));",
  "out.push('TITLE: '+clean(a.getAttribute('title')||'').substring(0,120));",
  "out.push('TEXT: '+clean(a.textContent||'').substring(0,120));",
  'var el=a;var chain=[];',
  "for(var d=0;d<4&&el&&el.parentElement;d++){el=el.parentElement;chain.push(el.tagName+'.'+cls(el));}",
  "out.push('CHAIN: '+chain.join(' < '));",
  'var box=a.parentElement;var e2=a;',
  "for(var d2=0;d2<6&&e2&&e2.parentElement;d2++){e2=e2.parentElement;if(/^(DIV|LI|ARTICLE|TD|SECTION|MAIN)$/.test(e2.tagName))box=e2;}",
  "out.push('BOX: '+box.tagName+'.'+cls(box));",
  "out.push('BOXTEXT: '+clean(box.innerText||box.textContent||'').substring(0,300));",
  "var imgs=box.querySelectorAll?box.querySelectorAll('img'):[];",
  "for(var i=0;i<Math.min(imgs.length,2);i++){out.push('IMG'+i+': src='+((imgs[i].getAttribute('src')||'').substring(0,80))+' data-src='+((imgs[i].getAttribute('data-src')||'').substring(0,80)));}",
  '}',
  "var tlCount=0;for(var q=0;q<Math.min(links.length,20);q++){var aq=links[q];var eq=aq;var bq=aq.parentElement;for(var dq=0;dq<6&&eq&&eq.parentElement;dq++){eq=eq.parentElement;if(/^(DIV|LI|ARTICLE|TD|SECTION|MAIN)$/.test(eq.tagName))bq=eq;}var bt=clean(bq.innerText||bq.textContent||'');if(/(\\d[\\d.,\\s\\xa0]*\\d)\\s*(TL|\\u20BA)/i.test(bt))tlCount++;}",
  "var txt=out.join('\\n');console.log(txt);",
  "var wrap=document.createElement('div');",
  "wrap.setAttribute('style','position:fixed;top:12px;right:12px;z-index:999999;background:#fff;color:#111;padding:12px;border:2px solid #333;max-width:520px;font:12px sans-serif;');",
  "wrap.innerHTML='<b>Toprak Tani Raporu</b> ('+tlCount+' kutuda fiyat deseni)<br>Asagidaki metni secip kopyalayin (Ctrl+A, Ctrl+C) ve gonderin.<br><textarea rows=\\'12\\' cols=\\'64\\'></textarea><br><button>Kopyala</button> <button>Kapat</button>';",
  "var ta=wrap.querySelector('textarea');ta.value=txt;",
  "var btns=wrap.querySelectorAll('button');",
  "btns[0].onclick=function(){ta.select();try{document.execCommand('copy');}catch(e){}try{if(navigator.clipboard)navigator.clipboard.writeText(txt);}catch(e){}};",
  "btns[1].onclick=function(){if(wrap.remove)wrap.remove();};",
  'document.body.appendChild(wrap);ta.select();',
  '})();',
].join('\n');
