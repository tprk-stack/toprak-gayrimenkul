// Arka plan: sabah alarmi + simge tiklamasi sekmeyi acar,
// icerik betiginden gelen indirme isteklerini gerceklestirir.
const MAGAZA = 'https://sivastoprakgayrimenkulsivas.sahibinden.com/#toprak-oto';

function ertesiSabah08() {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('sabah', { when: ertesiSabah08(), periodInMinutes: 24 * 60 });
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'sabah') chrome.tabs.create({ url: MAGAZA });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: MAGAZA });
});

chrome.runtime.onMessage.addListener((m, _s, yant) => {
  (async () => {
    try {
      if (m.t === 'img') {
        const id = await chrome.downloads.download({
          url: m.url,
          filename: 'toprak-senkron/' + m.file,
          conflictAction: 'overwrite',
          saveAs: false,
        });
        yant({ ok: !!id });
      } else if (m.t === 'json') {
        const data = 'data:application/json;base64,'
          + btoa(unescape(encodeURIComponent(m.json)));
        const id = await chrome.downloads.download({
          url: data,
          filename: 'toprak-senkron/ilanlar.json',
          conflictAction: 'overwrite',
          saveAs: false,
        });
        yant({ ok: !!id });
      } else {
        yant({ ok: false });
      }
    } catch (e) {
      yant({ ok: false, hata: String((e && e.message) || e) });
    }
  })();
  return true;
});
