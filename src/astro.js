// 천문 계산: 앙부일구 앱과 같은 식(Meeus 1998, NOAA 태양 계산기 식 + 장동·대기 굴절)
// 별: J2000 → IAU 1976 세차(Lieske) 후 그 날의 시간각
export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const DT = 69.2; // ΔT(초)
const S = Math.sin, C = Math.cos;
export const mod = (a, n) => ((a % n) + n) % n;
export const wrap180 = a => mod(a + 180, 360) - 180;
export const jd = ms => ms / 864e5 + 2440587.5;
export const KST = 9 * 36e5;

// 한국 표준시 날짜·시각 → ms
export const kst = (y, mo, d, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi);
export const parts = ms => { const t = new Date(ms + KST); return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() } };
export const dayStart = ms => { const p = parts(ms); return Date.UTC(p.y, p.mo - 1, p.d) - KST };
export const hhmm = ms => { const p = parts(ms); return String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0') };
export const hstr = h => { const m = Math.round(mod(h, 24) * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') };
export const dstr = ms => { const p = parts(ms); return `${p.y}년 ${p.mo}월 ${p.d}일` };

// 태양(겉보기 적경·적위, 그리니치 겉보기 항성시)
export function sunEq(ms) {
  const J = jd(ms), Je = J + DT / 86400, T = (Je - 2451545) / 36525;
  const L0 = mod(280.46646 + 36000.76983 * T + 0.0003032 * T * T, 360);
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const Mr = M * D2R;
  const Cc = S(Mr) * (1.914602 - 0.004817 * T - 0.000014 * T * T) + S(2 * Mr) * (0.019993 - 0.000101 * T) + S(3 * Mr) * 0.000289;
  const lamT = L0 + Cc;
  const om = (125.04 - 1934.136 * T) * D2R;
  const lam = lamT - 0.00569 - 0.00478 * S(om);
  const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * C(om);
  const ra = mod(Math.atan2(C(eps * D2R) * S(lam * D2R), C(lam * D2R)) * R2D, 360);
  const dec = Math.asin(S(eps * D2R) * S(lam * D2R)) * R2D;
  const Tu = (J - 2451545) / 36525;
  const gmst = mod(280.46061837 + 360.98564736629 * (J - 2451545) + 0.000387933 * Tu * Tu - Tu ** 3 / 38710000, 360);
  const dpsi = (-17.2 * S(om) - 1.32 * S(2 * L0 * D2R)) / 3600;
  const gast = gmst + dpsi * C(eps * D2R);
  return { ra, dec, lam: mod(lam, 360), eps, gast, gmst, M: mod(M, 360), L0, e };
}
// 시간각·적위 → 지평 좌표(동, 북, 위)
export function hdToENU(Hdeg, dec, lat) {
  const h = Hdeg * D2R, d = dec * D2R, p = lat * D2R;
  return [-C(d) * S(h), C(p) * S(d) - S(p) * C(d) * C(h), S(p) * S(d) + C(p) * C(d) * C(h)];
}
export function refr(alt) { if (alt < -1.5) return 0; const a = Math.max(alt, -1.5); return 1.02 / Math.tan((a + 10.3 / (a + 5.11)) * D2R) / 60 }
function applyRefr(v) {
  const alt = Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D, az = Math.atan2(v[0], v[1]);
  const a2 = (alt + refr(alt)) * D2R;
  return { alt, altApp: alt + refr(alt), az: mod(az * R2D, 360), vApp: [C(a2) * S(az), C(a2) * C(az), S(a2)] };
}
export function sunAt(ms, lat, lon) {
  const s = sunEq(ms), H = wrap180(s.gast + lon - s.ra);
  const v = hdToENU(H, s.dec, lat), r = applyRefr(v);
  const ast = mod(12 + H / 15, 24); // 진태양시(지방)
  const lmt = mod(mod(ms / 36e5, 24) + lon / 15, 24); // 평균태양시(지방)
  const eot = wrap180((ast - lmt) * 15) / 15 * 60; // 균시차(분)
  return { ...s, H, v, ...r, ast, lmt, eot };
}
// 세차(J2000 → 그 해의 평균 적도)
export function precess(ra, dec, year) {
  const T = (year - 2000) / 100, as = D2R / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) * as;
  const ze = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) * as;
  const th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) * as;
  const a = ra * D2R, d = dec * D2R;
  const A = C(d) * S(a + ze), B = C(th) * C(d) * C(a + ze) - S(th) * S(d), Cc = S(th) * C(d) * C(a + ze) + C(th) * S(d);
  return [mod((Math.atan2(A, B) + z) * R2D, 360), Math.asin(Cc) * R2D];
}
export const yearOf = ms => 1970 + ms / (365.2425 * 864e5);
export function starAt(ra, dec, ms, lat, lon, epoch) {
  const [r, d] = precess(ra, dec, epoch ?? yearOf(ms));
  const s = sunEq(ms), H = wrap180(s.gast + lon - r);
  const v = hdToENU(H, d, lat), x = applyRefr(v);
  return { ra: r, dec: d, H, ...x };
}
// 남중 시각(진태양시 12시) 찾기
export function noonOf(ms, lon) { let t = ms; for (let i = 0; i < 4; i++) { const s = sunAt(t, 0, lon); t -= s.H / 360.9856 * 864e5 } return t }
export function riseSet(day0, lat, lon) {
  const f = t => sunAt(t, lat, lon).alt + 0.833; const o = { rise: null, set: null }; let a = f(day0), ta = day0;
  for (let i = 1; i <= 144; i++) {
    const tb = day0 + i * 6e5, b = f(tb);
    if ((a < 0) !== (b < 0)) { let lo = ta, hi = tb, fl = a; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, fm = f(m); if ((fl < 0) === (fm < 0)) { lo = m; fl = fm } else hi = m } if (a < 0) o.rise = (lo + hi) / 2; else o.set = (lo + hi) / 2 }
    a = b; ta = tb;
  }
  return o;
}
// 24절기(태양 황경 15° 간격, 춘분 = 0)
export const TERM_H = ['春分', '淸明', '穀雨', '立夏', '小滿', '芒種', '夏至', '小暑', '大暑', '立秋', '處暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '驚蟄'];
export const TERM_K = ['춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지', '소한', '대한', '입춘', '우수', '경칩'];
export function termTime(year, k) { // k: 0=춘분 … 18=동지
  const tgt = k * 15; let t = Date.UTC(year, 2, 20) + k * 15.22 * 864e5;
  for (let i = 0; i < 8; i++) { const l = sunEq(t).lam; t += wrap180(tgt - l) / 0.98565 * 864e5 }
  return t;
}
// ms 이전 가장 가까운 동지의 「동짓날 자정」(지방 평균태양시 0시)
export function lastDongji(ms, lon) {
  // 동지가 든 날(지방평균시)의 자정 → 그 날 0시
  const lmtOff = lon / 15 * 36e5;
  const of = yy => { const t = termTime(yy, 18); return { term: t, midnight: Math.floor((t + lmtOff) / 864e5) * 864e5 - lmtOff } };
  // 동짓날 0시부터 동지 순간 사이도 그해 동짓날로 친다(동지 순간이 아니라 그날 자정과 견준다)
  const y = parts(ms).y; let r = of(y); if (r.midnight > ms) r = of(y - 1);
  return r;
}

// ── 세종 때 12시 100각 ──
// 하루 100각, 1시(2시간) = 8⅓각, 초·정 각 4⅙각 = 초각·1각·2각·3각(각 6분) + 4각(1분), 1각 = 6분(分)
export const SHI_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const SHI_K = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const NUM_H = ['初', '一', '二', '三', '四', '五'];
export function baekgak(T) { // T: 시각(시, 0~24)
  const x = mod(T + 1, 24), si = Math.floor(x / 2), half = (x % 2) < 1 ? 0 : 1;
  const min = (x % 1) * 60; // 반시진 안에서 지난 분(현대)
  // 반시진 = 25분(分): 초각·1각·2각·3각(각 6분) + 4각(1분)  — 출토 백각환(민병희 외 2023)
  const b = Math.min(24.999, min / 2.4);
  const gak = b < 24 ? Math.floor(b / 6) : 4, bun = gak < 4 ? Math.floor(b - 6 * gak) : 0;
  const hanja = SHI_H[si] + (half ? '正' : '初') + (gak === 0 ? '初刻' : NUM_H[gak] + '刻' + (bun ? NUM_H[bun].replace('初', '') + '分' : ''));
  const hangul = SHI_K[si] + (half ? '정 ' : '초 ') + (gak === 0 ? '초각' : gak + '각' + (bun ? ' ' + bun + '분' : ''));
  const gakTotal = mod(T, 24) / 24 * 100; // 자정부터 센 각
  return { si, half, gak, bun, hanja, hangul, shi: SHI_H[si] + '時', shiK: SHI_K[si] + '시', gakTotal };
}
