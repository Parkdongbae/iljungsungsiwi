// 위치 고르기: 앙부일구 3D 앱의 위치 모듈을 그대로 옮김(학교 자료·내장 지도·Leaflet·나이스·OpenStreetMap)
import { GEO, SCHOOLS } from './geo.js';
const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ── 학교 자료 ──
const DB = 'ilseong-3d', ST = 'kv';
const BUILTIN = SCHOOLS.rows.split('\n').map(l => { const [n, k, a, lat, lon] = l.split('|'); return { n, k: SCHOOLS.meta.kinds[+k], a, lat: +lat, lon: +lon } });
let schools = BUILTIN, sMeta = { builtin: true, date: SCHOOLS.meta.date, count: BUILTIN.length };
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) }) }
async function kvGet(k) { try { const d = await idb(); return await new Promise(r => { const g = d.transaction(ST).objectStore(ST).get(k); g.onsuccess = () => r(g.result); g.onerror = () => r(null) }) } catch { return null } }
async function kvPut(k, v) { try { const d = await idb(); await new Promise(r => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put(v, k); t.oncomplete = r; t.onerror = r }); return true } catch { return false } }
async function loadSaved() { const s = await kvGet('schools'); if (s && s.rows) { schools = s.rows.map(r => ({ n: r[0], k: r[1], a: r[2], lat: r[3], lon: r[4] })); sMeta = s.meta } }
async function resetSchools() { schools = BUILTIN; sMeta = { builtin: true, date: SCHOOLS.meta.date, count: BUILTIN.length }; await kvPut('schools', null) }
function decodeText(buf) { try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '') } catch { return new TextDecoder('euc-kr').decode(buf) } }
function parseCSV(s) { const rows = []; let row = [], f = '', inq = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (inq) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else inq = false } else f += c } else if (c === '"') inq = true; else if (c === ',') { row.push(f); f = '' } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' } else if (c !== '\r') f += c } if (f || row.length) { row.push(f); rows.push(row) } return rows }
const col = (keys, ...names) => { for (const n of names) { const i = keys.findIndex(k => k.replace(/\s/g, '').includes(n)); if (i >= 0) return i } return -1 };
async function importFile(file) {
  const txt = decodeText(await file.arrayBuffer()).trim(); let recs = [];
  if (txt[0] === '{' || txt[0] === '[') { const j = JSON.parse(txt); recs = Array.isArray(j) ? j : j.records || j.data || j.items || (j.response && j.response.body && j.response.body.items) || []; if (!Array.isArray(recs)) recs = recs.item || [] }
  else { const rows = parseCSV(txt), head = rows.shift() || []; recs = rows.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]]))) }
  if (!recs.length) throw new Error('자료에서 학교 목록을 찾지 못했습니다.');
  const keys = Object.keys(recs[0]), kn = keys[col(keys, '학교명', 'schoolNm', 'SCHUL_NM')], kla = keys[col(keys, '위도', 'latitude', 'lat')], klo = keys[col(keys, '경도', 'longitude', 'lon', 'lot')], ka = keys[col(keys, '소재지도로명주소', '도로명주소', 'rdnmadr', '소재지지번주소', '주소', 'lnmadr')], kk = keys[col(keys, '학교급구분', '학교급', 'schoolSe')];
  if (!kn || !kla || !klo) throw new Error('「학교명」「위도」「경도」 열이 있는 자료가 아닙니다. 공공데이터포털의 「전국초중등학교위치표준데이터」 파일을 골라 주세요.');
  const rows = [];
  for (const r of recs) { const la = parseFloat(r[kla]), lo = parseFloat(r[klo]); if (la > 32.5 && la < 39 && lo > 124 && lo < 132.5 && r[kn]) rows.push([String(r[kn]).trim(), kk ? String(r[kk] || '').trim() : '', ka ? String(r[ka] || '').trim() : '', Math.round(la * 1e5) / 1e5, Math.round(lo * 1e5) / 1e5]) }
  if (!rows.length) throw new Error('위도·경도가 들어 있는 학교가 없습니다.');
  sMeta = { file: file.name, at: new Date().toISOString().slice(0, 10), count: rows.length };
  schools = rows.map(r => ({ n: r[0], k: r[1], a: r[2], lat: r[3], lon: r[4] }));
  await kvPut('schools', { rows, meta: sMeta }); return rows.length;
}
const nos = s => s.replace(/\s/g, '');
function searchSchools(qs, n = 15) {
  if (!qs) return []; const t = nos(qs), toks = qs.trim().split(/\s+/).filter(Boolean), out = [];
  for (const s of schools) { const nn = nos(s.n), all = nn + ' ' + s.a + ' ' + (s.k || ''); let sc = 0; if (nn === t) sc = 4; else if (nn.startsWith(t)) sc = 3; else if (nn.includes(t)) sc = 2; else if (toks.length > 1 && toks.every(k => all.includes(k))) sc = 1; if (sc) out.push([sc, s]) }
  return out.sort((a, b) => b[0] - a[0] || a[1].n.length - b[1].n.length).slice(0, n).map(([, s]) => ({ n: s.n, sub: [s.k, s.a].filter(Boolean).join(' '), lat: s.lat, lon: s.lon, src: '전국 학교 위치 자료' }));
}
async function neis(name, key) { const r = await fetch('https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=' + (key ? 30 : 5) + '&SCHUL_NM=' + encodeURIComponent(name) + (key ? '&KEY=' + encodeURIComponent(key) : '')); if (!r.ok) throw new Error('NEIS ' + r.status); const j = await r.json(); return ((j.schoolInfo && j.schoolInfo[1] && j.schoolInfo[1].row) || []).map(a => ({ n: a.SCHUL_NM, sub: [a.SCHUL_KND_SC_NM, a.ORG_RDNMA].filter(Boolean).join(' '), addr: a.ORG_RDNMA, src: '나이스', needGeo: true })) }
async function nomi(qs, extra = '') { const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&accept-language=ko&limit=8' + extra + '&q=' + encodeURIComponent(qs)); if (!r.ok) throw new Error('Nominatim ' + r.status); return r.json() }
async function osmSearch(qs) { return (await nomi(qs)).map(t => ({ n: t.name || t.display_name.split(',')[0], sub: t.display_name, lat: +t.lat, lon: +t.lon, src: 'OpenStreetMap', school: t.type === 'school' })).sort((a, b) => b.school - a.school) }
async function geocode(addr, name) { const tries = [addr, addr && addr.replace(/\s*\(.*\)\s*$/, '').replace(/\s\d+(-\d+)?$/, ''), name]; for (const t of tries) if (t) { const r = await nomi(t, '&limit=1'); if (r.length) return { lat: +r[0].lat, lon: +r[0].lon, how: t === name ? '학교 이름' : t === addr ? '도로명 주소' : '도로 이름' }; await new Promise(z => setTimeout(z, 1100)) } return null }

// ── 내장 지도(통계청 2013 시군구 경계) ──
const SVGNS = 'http://www.w3.org/2000/svg', KX = Math.cos(36.3 * Math.PI / 180) * 100;
const mx = lon => (lon - 124) * KX, my = lat => (39 - lat) * 100, ilon = x => x / KX + 124, ilat = y => 39 - y / 100;
const pathD = g => { let d = ''; for (const poly of g) for (const ring of poly) { ring.forEach(([x, y], i) => d += (i ? 'L' : 'M') + mx(x / 1e3).toFixed(2) + ' ' + my(y / 1e3).toFixed(2)); d += 'Z' } return d };
function inPoly(ring, x, y) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c } return c }
export function muniAt(lat, lon) { const x = lon * 1e3, y = lat * 1e3; for (const m of GEO.muni) for (const p of m.g) if (inPoly(p[0], x, y)) return m.n; return null }
export const MUNIS = GEO.muni.map(m => ({ n: m.n, lat: m.lat, lon: m.lon }));
class KMap {
  constructor(host, onPick) {
    this.onPick = onPick; const svg = this.svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'kmap'); svg.setAttribute('role', 'application'); svg.setAttribute('aria-label', '대한민국 지도: 눌러서 위치 고르기');
    const gm = document.createElementNS(SVGNS, 'g'); gm.setAttribute('class', 'muni'); for (const m of GEO.muni) { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', pathD(m.g)); const t = document.createElementNS(SVGNS, 'title'); t.textContent = m.n; p.append(t); gm.append(p) }
    const gp = document.createElementNS(SVGNS, 'g'); gp.setAttribute('class', 'prov'); for (const m of GEO.prov) { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', pathD(m.g)); gp.append(p) }
    this.pin = document.createElementNS(SVGNS, 'g'); this.pin.setAttribute('class', 'pin'); this.pin.innerHTML = '<circle r="9" class="halo"/><circle r="3.6"/>';
    svg.append(gm, gp, this.pin); host.append(svg);
    this.vb = [mx(124.4), my(38.75), mx(131.2) - mx(124.4), my(33) - my(38.75)]; this.full = [...this.vb]; this.apply();
    let st = null; const pts = new Map();
    svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); st = { x: e.clientX, y: e.clientY, vb: [...this.vb], moved: 0, d0: null }; if (pts.size === 2) { const [a, b] = [...pts.values()]; st.d0 = Math.hypot(a[0] - b[0], a[1] - b[1]) } });
    svg.addEventListener('pointermove', e => { if (!st) return; pts.set(e.pointerId, [e.clientX, e.clientY]); const r = svg.getBoundingClientRect(), k = this.vb[2] / r.width; if (pts.size === 2 && st.d0) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); this.zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, st.d0 / d, st.vb); st.moved = 99; return } const dx = e.clientX - st.x, dy = e.clientY - st.y; st.moved = Math.max(st.moved, Math.hypot(dx, dy)); if (st.moved > 4) { this.vb[0] = st.vb[0] - dx * k; this.vb[1] = st.vb[1] - dy * k; this.apply() } });
    svg.addEventListener('pointerup', e => { pts.delete(e.pointerId); if (st && st.moved < 5 && pts.size === 0) { const [x, y] = this.toMap(e.clientX, e.clientY), la = ilat(y), lo = ilon(x); this.onPick(la, lo, muniAt(la, lo)) } if (pts.size === 0) st = null });
    svg.addEventListener('wheel', e => { e.preventDefault(); this.zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * .0015)) }, { passive: false });
  }
  toMap(cx, cy) { const r = this.svg.getBoundingClientRect(), k = Math.max(this.vb[2] / r.width, this.vb[3] / r.height), x0 = this.vb[0] + (this.vb[2] - r.width * k) / 2, y0 = this.vb[1] + (this.vb[3] - r.height * k) / 2; return [x0 + (cx - r.left) * k, y0 + (cy - r.top) * k] }
  zoomAt(cx, cy, f, base) { const v = base ? [...base] : this.vb, [x, y] = this.toMap(cx, cy), w = Math.min(this.full[2] * 1.4, Math.max(8, v[2] * f)), s = w / v[2]; this.vb = [x - (x - v[0]) * s, y - (y - v[1]) * s, w, v[3] * s]; this.apply() }
  zoom(f) { const r = this.svg.getBoundingClientRect(); this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, f) }
  reset() { this.vb = [...this.full]; this.apply() }
  apply() { this.svg.setAttribute('viewBox', this.vb.map(v => v.toFixed(2)).join(' ')); const s = this.vb[2] / 300; this.svg.style.setProperty('--s', s); this.pin.setAttribute('transform', `translate(${this.px ?? -99} ${this.py ?? -99}) scale(${s})`) }
  setPin(lat, lon) { this.px = mx(lon); this.py = my(lat); this.apply() }
}

export const PRESETS = [{ n: '서울 경복궁', lat: 37.5788, lon: 126.9770 }, { n: '인천', lat: 37.4563, lon: 126.7052 }, { n: '강릉', lat: 37.7519, lon: 128.8761 }, { n: '대전', lat: 36.3504, lon: 127.3845 }, { n: '광주', lat: 35.1595, lon: 126.8526 }, { n: '대구', lat: 35.8714, lon: 128.6014 }, { n: '부산', lat: 35.1796, lon: 129.0756 }, { n: '제주', lat: 33.4996, lon: 126.5312 }, { n: '독도', lat: 37.242, lon: 131.8669 }];
export const GBG = { n: '서울 경복궁(만춘전 터)', lat: 37.5788, lon: 126.9770 };

// setPlace(lat, lon, name, focus)
export function initPlace(S, setPlace) {
  let kmap = null, leaf = null, leafPin = null;
  const hasL = () => typeof window.L !== 'undefined' && typeof window.L.map === 'function';
  kmap = new KMap(q('#mapBox'), (la, lo, nm) => setPlace(la, lo, nm ? nm + ' 부근' : null));
  kmap.setPin(S.lat, S.lon);
  const toBuiltin = msg => { if (leaf) { leaf.remove(); leaf = null; leafPin = null } q('#leafBox').hidden = true; q('#mapBox').hidden = false; q('#mOnline').textContent = '온라인 지도'; q('#mZin').hidden = q('#mZout').hidden = false; if (msg) q('#pmsg').textContent = msg; kmap.apply() };
  const toLeaf = () => {
    if (!hasL()) return toBuiltin('Leaflet을 불러오지 못해 내장 지도를 씁니다. 인터넷 연결을 확인하세요.');
    const L = window.L; q('#leafBox').hidden = false; q('#mapBox').hidden = true; q('#mOnline').textContent = '내장 지도'; q('#mZin').hidden = q('#mZout').hidden = true;
    leaf = L.map('leafBox').setView([S.lat, S.lon], 13);
    // 지도 그림은 Esri → OpenStreetMap 순서로 시도하고, 둘 다 안 되면 내장 지도로 바꾼다.
    const TILES = [
      ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, maxNativeZoom: 13, attribution: '지도 &copy; Esri, HERE, Garmin, &copy; OpenStreetMap 기여자' }],
      ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자' }]];
    let ti = 0, layer = null;
    const nextTiles = () => {
      if (layer) { leaf.removeLayer(layer); layer = null }
      if (ti >= TILES.length) return toBuiltin('이 화면에서는 온라인 지도 그림을 받을 수 없어 내장 지도로 바꿨습니다. 인터넷 연결을 확인하세요.');
      let ok = 0, bad = 0; const [url, opt] = TILES[ti];
      layer = L.tileLayer(url, opt).on('tileload', () => ok++).on('tileerror', () => { bad++; if (bad > 3 && !ok) { ti++; nextTiles() } }).addTo(leaf);
      setTimeout(() => { if (leaf && layer && !ok && ti < TILES.length && TILES[ti][0] === url) { ti++; nextTiles() } }, 6000);
    };
    nextTiles();
    leafPin = L.circleMarker([S.lat, S.lon], { radius: 9, color: '#c4472b', weight: 3, fillColor: '#c4472b', fillOpacity: .35 }).addTo(leaf).bindTooltip('일성정시의를 놓을 곳', { direction: 'top' });
    leaf.on('click', e => { const { lat, lng } = e.latlng; setPlace(lat, lng, (muniAt(lat, lng) || '고른 위치') + ' 부근') });
    setTimeout(() => leaf && leaf.invalidateSize(), 50);
  };
  q('#mOnline').onclick = () => { q('#pmsg').textContent = ''; leaf ? toBuiltin() : toLeaf() };
  q('#mZin').onclick = () => leaf ? leaf.zoomIn() : kmap.zoom(.6); q('#mZout').onclick = () => leaf ? leaf.zoomOut() : kmap.zoom(1.6);
  q('#mReset').onclick = () => leaf ? leaf.setView([36.2, 127.8], 7) : kmap.reset();
  const list = [{ n: GBG.n, lat: GBG.lat, lon: GBG.lon }, ...MUNIS];
  const show = (items, none) => {
    const ul = q('#presults'); if (!items.length) { ul.innerHTML = none ? `<li class="none">${esc(none)}</li>` : ''; return }
    let h = '', last = ''; items.forEach((it, i) => { if (it.src !== last) { h += `<li class="grp">${esc(it.src)}${it.src === '나이스' ? ' (누르면 주소로 위치를 찾습니다)' : ''}</li>`; last = it.src } h += `<li><button type="button" data-i="${i}">${esc(it.n)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</button></li>` });
    ul.innerHTML = h; ul.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => pick(items[+b.dataset.i]));
  };
  async function pick(it) {
    const ul = q('#presults');
    if (!it.needGeo) { setPlace(it.lat, it.lon, it.n, true); ul.innerHTML = ''; q('#psearch').value = ''; q('#pmsg').textContent = it.src === '전국 학교 위치 자료' || it.src === '시·군·구' ? '' : `${it.src}에서 찾은 위치입니다. 지도에서 학교 자리가 맞는지 확인하세요.`; return }
    q('#pmsg').textContent = `「${it.n}」 주소로 위치를 찾는 중…`;
    try {
      const g = await geocode(it.addr, it.n);
      if (g) { setPlace(g.lat, g.lon, it.n, true); q('#pmsg').textContent = `${g.how}(${it.addr || it.n})로 위치를 찾았습니다(OpenStreetMap). 지도에서 학교 건물 위치가 맞는지 확인하고, 다르면 학교 자리를 눌러 바로잡으세요.` }
      else { const m = MUNIS.find(m => it.addr && it.addr.includes(m.n.split(' ').slice(-1)[0]) && it.addr.includes(m.n.split(' ')[0])); if (m) { setPlace(m.lat, m.lon, it.n + ' (시·군·구 중심)', true); q('#pmsg').textContent = `주소의 정확한 위치를 찾지 못해 ${m.n} 중심에 두었습니다. 지도에서 학교 자리를 눌러 바로잡으세요.` } else q('#pmsg').textContent = '주소로 위치를 찾지 못했습니다. 지도에서 학교 자리를 직접 눌러 주세요.' }
      ul.innerHTML = ''; q('#psearch').value = '';
    } catch { q('#pmsg').textContent = '이 화면에서는 인터넷으로 위치를 찾을 수 없습니다. 「전국 학교 위치 자료」를 불러오거나 지도에서 직접 누르세요.' }
  }
  async function online() {
    const s = q('#psearch').value.trim(); if (!s) { q('#pmsg').textContent = '찾을 학교 이름을 넣으세요. 예: 부산동중학교'; return }
    q('#pmsg').textContent = '전국에서 찾는 중…';
    const local = searchSchools(s, 15); let key = ''; try { key = localStorage.getItem('neisKey') || '' } catch { }
    const [a, b] = await Promise.allSettled([neis(s, key), osmSearch(s)]); const out = [...local], seen = new Set(local.map(x => x.n));
    if (a.status === 'fulfilled') for (const x of a.value) if (!seen.has(x.n)) { out.push(x); seen.add(x.n) }
    if (b.status === 'fulfilled') for (const x of b.value) if (!seen.has(x.n)) out.push(x);
    const fail = a.status === 'rejected' && b.status === 'rejected';
    q('#pmsg').textContent = fail ? (local.length ? '인터넷 찾기는 이 화면에서 쓸 수 없어 앱에 들어 있는 전국 학교 위치 자료에서 찾았습니다.' : '앱에 들어 있는 학교 자료에 없는 이름입니다. 정확한 학교 이름을 넣거나 지도에서 학교 자리를 눌러 주세요.') : out.length ? '' : '찾은 학교가 없습니다. 「○○중학교」처럼 정확한 이름을 넣어 보세요.';
    show(out);
  }
  q('#psearchOnline').onclick = online;
  q('#psearch').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = q('#presults button'); b ? b.click() : online() } });
  q('#psearch').addEventListener('input', () => { const s = q('#psearch').value.trim().replace(/\s+/g, ' '); if (!s) { q('#presults').innerHTML = ''; return } const m = list.filter(o => nos(o.n).includes(nos(s))).slice(0, 8).map(o => ({ n: o.n, lat: o.lat, lon: o.lon, src: '시·군·구' })); show([...searchSchools(s, 12), ...m], '찾는 학교·지역이 없습니다. 「○○중학교」처럼 학교 이름을 넣거나 「학교 이름 찾기」로 인터넷에서 찾아 보세요.') });
  q('#pset').onclick = () => { const la = parseFloat(q('#plat').value), lo = parseFloat(q('#plon').value); if (!(la > 30 && la < 45 && lo > 120 && lo < 135)) { q('#pmsg').textContent = '위도 30~45°, 경도 120~135° 사이 값을 넣으세요.'; return } q('#pmsg').textContent = ''; setPlace(la, lo, muniAt(la, lo) ? muniAt(la, lo) + ' 부근' : null, true) };
  q('#pgeo').onclick = () => { if (!navigator.geolocation) { q('#pmsg').textContent = '이 브라우저는 위치 찾기를 지원하지 않습니다.'; return } q('#pmsg').textContent = '위치를 찾는 중…'; navigator.geolocation.getCurrentPosition(p => { q('#pmsg').textContent = ''; const la = p.coords.latitude, lo = p.coords.longitude; setPlace(la, lo, (muniAt(la, lo) || '현재 위치') + ' (기기 위치)', true) }, () => { q('#pmsg').textContent = '위치 권한이 없거나 이 화면에서는 위치를 쓸 수 없습니다. 지도에서 직접 고르세요.' }, { timeout: 8000 }) };
  qa('[data-preset]').forEach(b => b.onclick = () => { const p = PRESETS.find(x => x.n === b.dataset.preset) || GBG; setPlace(p.lat, p.lon, p.n === '서울 경복궁' ? GBG.n : p.n, true) });
  // 학교 자료 파일
  (async () => {
    const stat = () => { q('#sdStatus').textContent = sMeta.builtin ? `(앱에 들어 있음: ${schools.length.toLocaleString()}개 학교, 기준일 ${sMeta.date})` : `(직접 불러온 자료: ${schools.length.toLocaleString()}개 학교, ${sMeta.at} 불러옴)` };
    await loadSaved(); stat();
    q('#sdFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; q('#pmsg').textContent = '자료를 읽는 중…'; try { const n = await importFile(f); q('#pmsg').textContent = `${n.toLocaleString()}개 학교의 위치를 저장했습니다. 이제 학교 이름을 넣으면 바로 찾습니다.`; stat() } catch (er) { q('#pmsg').textContent = er.message } e.target.value = '' };
    q('#sdClear').onclick = async () => { await resetSchools(); stat(); q('#pmsg').textContent = '앱에 들어 있는 기본 학교 자료로 되돌렸습니다.' };
    try { q('#neisKey').value = localStorage.getItem('neisKey') || '' } catch { }
    q('#neisSave').onclick = () => { try { localStorage.setItem('neisKey', q('#neisKey').value.trim()); q('#pmsg').textContent = '나이스 인증키를 이 브라우저에 저장했습니다.' } catch { q('#pmsg').textContent = '이 화면에서는 인증키를 저장할 수 없습니다.' } };
  })();
  toLeaf();
  return { pin(lat, lon) { kmap.setPin(lat, lon); if (leaf) { leaf.setView([lat, lon], Math.max(leaf.getZoom(), 13)); leafPin && leafPin.setLatLng([lat, lon]) } } };
}

// 작은 SVG 그래프(앙부일구 앱과 같은 모양)
export function chart(host, o) {
  const el = (t, a = {}, txt) => { const e = document.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e };
  host.innerHTML = ''; const W = o.w || 360, H = o.h || 210, m = { l: 42, r: 12, t: 12, b: 30 };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': o.label || '' });
  const [x0, x1] = o.xr, [y0, y1] = o.yr, X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  for (const v of o.yt || []) { svg.append(el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: v === 0 ? 'axis0' : 'grid' })); svg.append(el('text', { x: m.l - 6, y: Y(v) + 4, class: 'tick', 'text-anchor': 'end' }, (o.yfmt || String)(v))) }
  for (const t of o.xt || []) { svg.append(el('line', { x1: X(t.v), x2: X(t.v), y1: m.t, y2: H - m.b, class: 'grid' })); svg.append(el('text', { x: X(t.v), y: H - m.b + 16, class: 'tick', 'text-anchor': 'middle' }, t.l)) }
  if (o.ylabel) svg.append(el('text', { x: 4, y: m.t + 2, class: 'axl' }, o.ylabel));
  for (const s of o.series) { let d = '', on = false; for (const p of s.pts) { if (!p || p[1] == null || !isFinite(p[1])) { on = false; continue } d += (on ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); on = true } svg.append(el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.w || 2, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round' })) }
  const mk = el('g', { class: 'marker' }); svg.append(mk); host.append(svg);
  if (o.legend) { const d = document.createElement('div'); d.className = 'legend'; d.innerHTML = o.series.filter(s => s.name).map(s => `<span><i style="background:${s.color};${s.dash ? 'opacity:.7' : ''}"></i>${s.name}</span>`).join(''); host.append(d) }
  return { mark(x, ys) { mk.innerHTML = ''; mk.append(el('line', { x1: X(x), x2: X(x), y1: m.t, y2: H - m.b, class: 'nowline' })); for (const [y, c] of ys) mk.append(el('circle', { cx: X(x), cy: Y(y), r: 4, fill: c, class: 'nowdot' })) } };
}
