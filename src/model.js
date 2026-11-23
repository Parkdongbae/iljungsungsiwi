// 일성정시의 3D 모델
// 기준: ① 세 환 = 2021 인사동 출토 유물 실측(민병희 외 2023, 『고궁문화』 16, 표 1)
//       ② 나머지 = 『세종실록』 77권 세종 19년 4월 15일 「일성정시의 명병서」, 주척 1척 = 207mm
//       ③ 원문에 없는 것 = ASSUME(가정값, 출처 표시)
// 좌표: three.js 세계 x = 동, y = 위, z = 남(북은 −z). 단위 mm.
// 기기 좌표: X = 서, Y = 적도면 위 남쪽 위(午正 쪽 반대 — 자루는 −Y), Z = 하늘의 북극. θ = Y에서 X 쪽(북극 쪽에서 보면 시계 방향)
import * as THREE from 'three';

export const CHEOK = 207;
const c = (chuk, chon = 0, bun = 0, ri = 0) => (chuk + chon / 10 + bun / 100 + ri / 1000) * CHEOK;
export const DIM = {
  wheelD: c(2), wheelT: c(0, 0, 4), wheelW: c(0, 3), crossW: c(0, 1, 5),
  axisL: c(0, 0, 5.5), axisD: c(0, 2), // 실록 국역은 「지름 2척」이나 2촌의 잘못(표 2, 민병희 외 2023)
  handleT: c(0, 1, 8), handleIn: c(1, 1), handleOut: c(0, 3, 6),
  daeW: c(2), daeL: c(3, 2),
  hengL: c(2, 1), hengW: c(0, 3), hengT: c(0, 0, 5), winL: c(0, 2, 2), winW: c(0, 1, 8),
  dragonL: c(1),
  jgOutD: c(0, 2, 3), jgOutW: c(0, 0, 3), jgInD: c(0, 1, 4.5), jgInW: c(0, 0, 0, 4), jgT: c(0, 0, 2),
  // 원문(실록) 세 환 — 비교용
  docJuD: c(2), docIlD: c(1, 8, 4), docSgD: c(1, 6, 8), docRingT: c(0, 0, 3), docRingW: c(0, 0, 8),
};
// 출토 유물 실측(표 1): 앞면 외경·내경, 뒷면 외경·내경, 두께
export const ARTI = {
  ju: { fo: 420.0, fi: 385.0, bo: 420.0, bi: 374.2, t: 6.1 },
  il: { fo: 385.0, fi: 350.0, bo: 374.2, bi: 357.2, t: 5.9 },
  sg: { fo: 350.0, fi: 315.0, bo: 357.2, bi: 315.0, t: 6.2 },
};
export const ASSUME = {
  stoneH: 890, // 평방석 높이: 경복궁 아미산 일성정시의 평방석 890mm(전상운 등 1984, 김상혁 박사논문 표 3-2)
  colD: 60, colH: 560, // 반룡 속 심대 지름(가정), 대 위로 자루 끝까지 높이(가정: 영릉 복원품 사진 비례)
  pondD: 140, // 못 지름(가정, 한국표준연구소 1989 복원은 북쪽 가운데 둥근 못)
  handleWidth: 41.4, // 자루 너비(가정)
  pin: 1.0, cavity: 30, // 축의 겨자씨 구멍 지름, 축 북쪽 면을 판 구멍 지름(가정)
  eyeToJG: 229, // 축 구멍에서 정극환 중심까지(가정: 1437년 천추성이 안 고리 안, 구진대성이 두 고리 사이에 보이게)
  step: .5, // 환 단차 높이 비율
  hengHole: 10, // 계형 가운데 구멍(가정)
};
export const HANYANG = 37 + 37 / 60 + 2 / 3600; // 한양 북극고 「三十八度小弱」(주천도) = 37°37′02″ (민병희 외 2023 각주 33)
const R = DIM.wheelD / 2;
const RT = Math.max(ARTI.ju.t, ARTI.il.t, ARTI.sg.t);
export const Z = { wheelTop: DIM.wheelT, ringTop: DIM.wheelT + 6.1, hengBot: DIM.wheelT + 6.1, hengTop: DIM.wheelT + 6.1 + DIM.hengT };
export const RING = { ju: [ARTI.ju.fi / 2, ARTI.ju.fo / 2], il: [ARTI.il.fi / 2, ARTI.il.fo / 2], sg: [ARTI.sg.fi / 2, ARTI.sg.fo / 2] };
export const RMAX = ARTI.ju.fo / 2;
export const JG_Z = ASSUME.eyeToJG;
export const WIN = { r0: RMAX - 1 - DIM.winL, r1: RMAX - 1 }; // 계형 창(머리 네모 구멍)의 반지름 범위

// ── 도형 도우미 ──
export function annulus(r0, r1, h, seg = 256) {
  const s = new THREE.Shape(); s.absarc(0, 0, r1, 0, Math.PI * 2, false);
  if (r0 > 0) { const hole = new THREE.Path(); hole.absarc(0, 0, r0, 0, Math.PI * 2, true); s.holes.push(hole) }
  return new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: seg });
}
function planarUV(g, Rr) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * Rr) + .5, p.getY(i) / (2 * Rr) + .5); uv.needsUpdate = true }
function box(w, d, h, x = 0, y = 0, z = 0) { const g = new THREE.BoxGeometry(w, d, h); g.translate(x, y, z); return g }
export function sweep(pts, radius, radial = 18, closed = false) {
  // 평행 이동 틀(parallel transport)로 단면을 옮겨 관이 비틀리거나 납작해지지 않게 함
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  const n = Math.max(32, pts.length * 16), T = [], Nn = [], Bn = [];
  for (let i = 0; i <= n; i++) T.push(curve.getTangentAt(i / n).normalize());
  let ref = Math.abs(T[0].y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  Nn.push(new THREE.Vector3().crossVectors(T[0], ref).normalize()); Bn.push(new THREE.Vector3().crossVectors(T[0], Nn[0]).normalize());
  for (let i = 1; i <= n; i++) { const q = new THREE.Quaternion().setFromUnitVectors(T[i - 1], T[i]); const N = Nn[i - 1].clone().applyQuaternion(q).normalize(); Nn.push(N); Bn.push(new THREE.Vector3().crossVectors(T[i], N).normalize()) }
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) { const u = i / n, P = curve.getPointAt(u), N = Nn[i], B = Bn[i], r = radius(u); for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2; pos.push(P.x + r * (Math.cos(a) * N.x + Math.sin(a) * B.x), P.y + r * (Math.cos(a) * N.y + Math.sin(a) * B.y), P.z + r * (Math.cos(a) * N.z + Math.sin(a) * B.z)) } }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const caps = []; for (const i of [0, n]) { const P = curve.getPointAt(i / n); const s = new THREE.SphereGeometry(radius(i / n) * .98, radial, 10); s.translate(P.x, P.y, P.z); caps.push(s) }
  const out = merge([g, ...caps]); out.userData.curve = curve; return out;
}
// 관 + UV(u: 길이, v: 둘레) — up(P,T)가 주면 단면의 v=0 쪽을 그 방향(등)에 맞춤
export function sweepUV(pts, radius, radial = 18, up = null, uRep = 1) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = Math.max(32, pts.length * 16), Ts = [], Ns = [];
  for (let i = 0; i <= n; i++) Ts.push(curve.getTangentAt(i / n).normalize());
  let N0 = up ? up(curve.getPointAt(0), Ts[0]) : new THREE.Vector3().crossVectors(Ts[0], Math.abs(Ts[0].y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize(); Ns.push(N0);
  for (let i = 1; i <= n; i++) { if (up) { Ns.push(up(curve.getPointAt(i / n), Ts[i])) } else { const q = new THREE.Quaternion().setFromUnitVectors(Ts[i - 1], Ts[i]); Ns.push(Ns[i - 1].clone().applyQuaternion(q).normalize()) } }
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) { const u = i / n, P = curve.getPointAt(u), N = Ns[i], B = new THREE.Vector3().crossVectors(Ts[i], N).normalize(), r = radius(u); for (let j = 0; j <= radial; j++) { const a = j / radial * Math.PI * 2; pos.push(P.x + r * (Math.cos(a) * N.x + Math.sin(a) * B.x), P.y + r * (Math.cos(a) * N.y + Math.sin(a) * B.y), P.z + r * (Math.cos(a) * N.z + Math.sin(a) * B.z)); uv.push(u * uRep, j / radial) } }
  for (let i = 0; i < n; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const caps = []; for (const i of [0, n]) { const P = curve.getPointAt(i / n); const s = new THREE.SphereGeometry(radius(i / n) * .98, radial, 10); s.translate(P.x, P.y, P.z); caps.push(s) }
  return { geo: merge([g, ...caps]), curve, raw: g };
}
// 용 비늘 그림: v 0~0.62 등 비늘(겹친 반달), 0.62~1 배 비늘(가로 띠)
export function drawScaleSkin() {
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#9a7848'; g.fillRect(0, 0, W, H);
  const belly0 = H * .62;
  const s = 34; for (let row = 0; row * s * .55 < belly0 + s; row++) for (let col = -1; col * s < W + s; col++) { const x = col * s + (row % 2 ? s / 2 : 0), y = row * s * .55; const gr = g.createRadialGradient(x, y - 3, 2, x, y, s * .62); gr.addColorStop(0, '#c9a46a'); gr.addColorStop(.75, '#8c6a3c'); gr.addColorStop(1, '#5e4526'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s * .58, 0, Math.PI); g.fill() }
  g.fillStyle = '#b8955c'; g.fillRect(0, belly0, W, H - belly0);
  g.strokeStyle = '#6a4f2c'; g.lineWidth = 3; for (let x = 0; x < W; x += 14) { g.beginPath(); g.moveTo(x, belly0); g.lineTo(x, H); g.stroke() }
  g.fillStyle = '#5e4526'; g.fillRect(0, belly0 - 2, W, 3);
  return cv;
}
export function merge(list) {
  const gs = list.map(g => { let x = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv'].includes(k)) x.deleteAttribute(k); if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); if (!x.attributes.normal) x.computeVertexNormals(); return x });
  let n = 0; for (const g of gs) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0;
  for (const g of gs) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return g;
}
// 여의두문 귀: 출토 유물(민병희 외 2023 도 2·3)의 두 소용돌이 모양을 단순화
function ruyiShape(w, h) {
  const s = new THREE.Shape(), hw = w / 2;
  s.moveTo(-hw * .3, 0); s.lineTo(-hw * .3, h * .22);
  s.bezierCurveTo(-hw * 1.1, h * .12, -hw * 1.15, h * .9, -hw * .45, h * .86);
  s.bezierCurveTo(-hw * .25, h * 1.12, hw * .25, h * 1.12, hw * .45, h * .86);
  s.bezierCurveTo(hw * 1.15, h * .9, hw * 1.1, h * .12, hw * .3, h * .22);
  s.lineTo(hw * .3, 0); s.lineTo(-hw * .3, 0);
  for (const sg of [-1, 1]) { const p = new THREE.Path(); p.absarc(sg * hw * .42, h * .52, h * .14, 0, Math.PI * 2, true); s.holes.push(p) }
  return s;
}
function ruyi(w, h, t, rBase, theta, outward, z0) {
  const g = new THREE.ExtrudeGeometry(ruyiShape(w, h), { depth: t, bevelEnabled: true, bevelThickness: .5, bevelSize: .5, bevelSegments: 2, curveSegments: 16 });
  if (!outward) g.rotateZ(Math.PI); g.translate(0, rBase, z0); g.rotateZ(-theta * Math.PI / 180); return g;
}

// ── 눈금(은입사) ──
// 유물: 환 너비를 동심원 3개로 4층으로 나눔. 바깥(1층)부터 분 → 각 → 반시진(초·정) → 시 글자(4층). 글자 머리는 환 중심을 향함.
// 주천도분환: 1층 ¼도(1,461분), 2층 도, 3층 십도, 4층 십도 글자(初, 一十 … 九十, 一百, 一十 …, 二百, …, 三百, 一十 … 六十)
// 백각환 글자 각 ψ = 15·T(T = 시각, 0 = 子正): 午正이 자루 쪽(아래)에 옴(소일영과 같음, 민병희 외 2023)
const SHI_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const D10 = ['初', '一十', '二十', '三十', '四十', '五十', '六十', '七十', '八十', '九十'];
export function drawScales(size = 4096) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
  const k = size / (2 * RMAX);
  const base = '#7d6440', silver = '#fbf8ef';
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  const P = (r, th) => [cx + r * k * Math.sin(th * Math.PI / 180), cy - r * k * Math.cos(th * Math.PI / 180)];
  const tick = (r0, r1, th, w) => { g.lineWidth = w * k; const a = P(r0, th), b = P(r1, th); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke() };
  const circ = (r, w) => { g.lineWidth = w * k; g.beginPath(); g.arc(cx, cy, r * k, 0, Math.PI * 2); g.stroke() };
  // 글자: 머리가 중심 쪽 → 글자 위쪽이 안쪽을 향하게
  const text = (s, r, th, fs) => { g.save(); const [x, y] = P(r, th); g.translate(x, y); g.rotate(th * Math.PI / 180 + Math.PI); g.fillStyle = silver; g.font = `700 ${fs * k}px "Noto Serif KR","Noto Serif CJK KR","Noto Sans CJK KR",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; const ch = [...s]; ch.forEach((c2, i) => g.fillText(c2, 0, (i - (ch.length - 1) / 2) * fs * k * 1.0)); g.restore() };
  g.strokeStyle = silver; g.lineCap = 'butt';
  const layers = key => { const [a, b] = RING[key]; const w = b - a; return { a, b, l1: b - w * .18, l2: b - w * .36, l3: b - w * .54 } };
  // 주천도분환
  { const L = layers('ju'); for (const r of [L.l1, L.l2, L.l3]) circ(r, .22);
    const step = 360 / 365.25;
    for (let q = 0; q <= 1461; q++) { const th = q * step / 4; const deg = q / 4; tick(L.b - .4, L.l1, th, .15); if (q % 4 === 0) { tick(L.l1, L.l2, th, .2); if (deg % 10 === 0) tick(L.l2, L.l3, th, .24) } }
    tick(L.b - .4, L.l3, 365.25 * step, .2); // 끝의 ¼도
    for (let d = 0; d <= 360; d += 10) { const lab = d === 0 ? '初' : d % 100 === 0 ? ['', '一百', '二百', '三百'][d / 100] : D10[(d % 100) / 10]; text(lab, (L.l3 + L.a) / 2 + .2, (d + 5) * step, lab.length > 1 ? 3.0 : 3.6) }
  }
  // 백각환(일구·성구 같음): 반시진 = 25분 = 초각·1각·2각·3각(각 6분) + 4각(1분)
  const gak = key => {
    const L = layers(key); for (const r of [L.l1, L.l2, L.l3]) circ(r, .22);
    const per = 360 / 600; // 1분 = 0.6°
    for (let h = 0; h < 24; h++) { // h=0: 子初(T = 23)
      const T0 = h - 1, th0 = 15 * T0;
      for (let b = 0; b <= 25; b++) { const th = th0 + b * per; tick(L.b - .4, L.l1, th, .16); if (b === 0 || b === 6 || b === 12 || b === 18 || b === 24 || b === 25) tick(L.l1, L.l2, th, .18); if (b === 0) tick(L.l2, L.l3, th, .24); if (b === 0 && h % 2 === 0) tick(L.l3, L.a + .4, th, .28) }
    }
    for (let si = 0; si < 12; si++) text(SHI_H[si], (L.l3 + L.a) / 2, 30 * si, 4.4); // 시 글자는 正의 시작(=시의 가운데)에
    // 일구백각환의 리벳(매 시 초의 초각 4분)
    if (key === 'il') { g.fillStyle = '#9a8a6a'; for (let si = 0; si < 12; si++) { const [x, y] = P((L.l2 + L.l1) / 2, 15 * (2 * si - 1) + 4 * per); g.beginPath(); g.arc(x, y, 1.1 * k, 0, Math.PI * 2); g.fill() } g.fillStyle = silver }
  };
  gak('il'); gak('sg');
  return cv;
}

export function makeMaterials(tex) {
  return {
    bronze: new THREE.MeshStandardMaterial({ color: 0xb08a52, roughness: .42, metalness: .45, envMapIntensity: 1 }),
    bronzeDark: new THREE.MeshStandardMaterial({ color: 0x8f6f42, roughness: .48, metalness: .4, envMapIntensity: 1 }),
    scale: new THREE.MeshStandardMaterial({ map: tex, roughness: .5, metalness: .25, color: 0xffffff, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .12 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xa4a196, roughness: .88, metalness: 0, envMapIntensity: .35 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3f8fce, roughness: .12, metalness: .1, transparent: true, opacity: .78 }),
    cord: new THREE.MeshStandardMaterial({ color: 0xc9332a, roughness: .7, metalness: 0 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc89b3c, roughness: .35, metalness: .85 }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xbfa26c, roughness: .45, metalness: .4, envMapIntensity: 1 }),
    dragonSkin: (() => { const t = new THREE.CanvasTexture(drawScaleSkin()); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 2.2, roughness: .5, metalness: .35, envMapIntensity: 1 }) })(),
    horn: new THREE.MeshStandardMaterial({ color: 0x9c7c4c, roughness: .55, metalness: .35 }),
    ivory: new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: .5, metalness: .1 }),
    dragonTongue: new THREE.MeshStandardMaterial({ color: 0xa0523a, roughness: .6, metalness: .1 }),
  };
}

export function buildModel(M) {
  const parts = [];
  const add = (parent, id, name, step, geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; const grp = new THREE.Group(); grp.add(m); grp.name = id; parent.add(grp); const p = { id, name, step, obj: grp, mesh: m }; parts.push(p); return grp };
  const root = new THREE.Group();
  const H = ASSUME.stoneH, yT = H, W = DIM.daeW, L = DIM.daeL;
  const zCol = 190, zPond = -170; // 운룡주는 남쪽, 못은 북쪽(한국표준연구소 1989 복원과 같은 배치)
  // 1. 대(臺) = 평방석: 윗면에 도랑(渠)과 못(池)
  {
    const gw = 14, gd = 12, ins = 20, list = [];
    list.push(box(W, H - gd, L, 0, (H - gd) / 2, 0));
    const y = H - gd / 2; // 윗면 층(도랑 깊이만큼)
    list.push(box(W, gd, ins, 0, y, -L / 2 + ins / 2), box(W, gd, ins, 0, y, L / 2 - ins / 2), box(ins, gd, L - 2 * ins, -W / 2 + ins / 2, y, 0), box(ins, gd, L - 2 * ins, W / 2 - ins / 2, y, 0));
    // 안쪽 섬: 못 자리를 둥글게 비움
    const iw = W - 2 * (ins + gw), il = L - 2 * (ins + gw);
    const s = new THREE.Shape(); s.moveTo(-iw / 2, -il / 2); s.lineTo(iw / 2, -il / 2); s.lineTo(iw / 2, il / 2); s.lineTo(-iw / 2, il / 2); s.lineTo(-iw / 2, -il / 2);
    const ph = new THREE.Path(); ph.absarc(0, -zPond, ASSUME.pondD / 2, 0, Math.PI * 2, true); s.holes.push(ph);
    const isl = new THREE.ExtrudeGeometry(s, { depth: gd, bevelEnabled: false, curveSegments: 48 }); isl.rotateX(-Math.PI / 2); isl.translate(0, H - gd, 0);
    // 못과 도랑을 잇는 물길
    const isl2 = isl; list.push(isl2);
    add(root, 'dae', '대(臺): 평방석, 도랑(渠)과 못(池)으로 수평 잡기', 0, merge(list), M.stone);
    const wl = [], wy = H - gd + 7;
    wl.push(box(W - 2 * ins, 1, gw, 0, wy, -L / 2 + ins + gw / 2), box(W - 2 * ins, 1, gw, 0, wy, L / 2 - ins - gw / 2), box(gw, 1, L - 2 * ins, -W / 2 + ins + gw / 2, wy, 0), box(gw, 1, L - 2 * ins, W / 2 - ins - gw / 2, wy, 0));
    const pd = new THREE.CylinderGeometry(ASSUME.pondD / 2, ASSUME.pondD / 2, 1, 48); pd.translate(0, wy, zPond); wl.push(pd);
    add(root, 'daeWater', '도랑과 못의 물: 물높이로 수평 맞추기', 0, merge(wl), M.water);
  }
  // 2. 기기(적도면) 묶음
  const instr = new THREE.Group(); instr.name = 'instr'; root.add(instr);
  {
    const t = DIM.wheelT, rc = ASSUME.cavity / 2;
    const rim = annulus(R - DIM.wheelW, R, t);
    const inner = R - DIM.wheelW + 4, cw = DIM.crossW, arm = inner - rc;
    const cross = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cross.push(box(dx ? arm : cw, dy ? arm : cw, t, dx * (rc + arm / 2), dy * (rc + arm / 2), t / 2));
    const hub = annulus(rc, DIM.axisD / 2, t, 48);
    add(instr, 'wheel', '바퀴(輪)와 십자거(十字距)', 2, merge([rim, ...cross, hub]), M.bronze);
    // 축: 지름 2촌, 십자 위로 5분반. 북쪽 면을 파고 가운데 1리 두께만 남겨 겨자씨만 한 구멍(별을 살피는 구멍)
    const ax = annulus(rc, DIM.axisD / 2, DIM.axisL, 64); ax.translate(0, 0, t);
    const web = annulus(ASSUME.pin / 2, rc + .5, .21, 64);
    add(instr, 'axis', '축(軸): 계형을 꿰고, 가운데 겨자씨 구멍으로 별을 살핌', 2, merge([ax, web]), M.bronzeDark);
    const hw = ASSUME.handleWidth, Lh = DIM.handleOut + DIM.handleIn, zt = t, zb = t - DIM.handleT;
    const hs = new THREE.Shape(); hs.moveTo(-hw / 2 - 10, -R + 8); hs.quadraticCurveTo(-hw / 2, -R - 2, -hw / 2, -R - 14); hs.lineTo(-hw / 2, -R - Lh); hs.lineTo(hw / 2, -R - Lh); hs.lineTo(hw / 2, -R - 14); hs.quadraticCurveTo(hw / 2, -R - 2, hw / 2 + 10, -R + 8); hs.lineTo(-hw / 2 - 10, -R + 8);
    const hg = new THREE.ExtrudeGeometry(hs, { depth: zt - zb, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5, bevelSegments: 2 }); hg.translate(0, 0, zb);
    add(instr, 'handle', '자루(柄): 두께 1촌8분, 용 입에 1척1촌', 2, hg, M.bronze);
  }
  // 세 환: 앞면(윗부분) + 뒷면(아랫부분) 단차로 서로 맞물림(민병희 외 2023 도 5)
  const ring = (key, id, name, step, parent) => {
    const a = ARTI[key], z0 = Z.wheelTop, h = a.t, hb = h * ASSUME.step;
    const top = annulus(a.fi / 2, a.fo / 2, h - hb, 360); planarUV(top, RMAX); top.translate(0, 0, z0 + hb);
    const bot = annulus(a.bi / 2, a.bo / 2, hb, 360); bot.translate(0, 0, z0);
    const g = new THREE.Group(); parent.add(g); g.name = id;
    const m1 = new THREE.Mesh(top, [M.scale, M.bronze]), m2 = new THREE.Mesh(bot, M.bronze); m1.castShadow = m1.receiveShadow = m2.castShadow = m2.receiveShadow = true; g.add(m1, m2);
    const p = { id, name, step, obj: g, mesh: m1 }; parts.push(p); return g;
  };
  const ju = new THREE.Group(); ju.name = 'juG'; instr.add(ju);
  ring('ju', 'ju', '주천도분환(周天度分環): 바깥, 돌아감, 365¼도 — 출토 유물 외경 420mm', 3, ju);
  // 귀: 初度에서 좌우 91.3도(= 약 90°)
  add(ju, 'juEar', '주천도분환의 귀(耳): 여의두문, 初度에서 좌우 91.3도', 3, merge([ruyi(30, 22, ARTI.ju.t, RING.ju[1] - 1.5, 91.3 * 360 / 365.25, true, Z.wheelTop), ruyi(30, 22, ARTI.ju.t, RING.ju[1] - 1.5, -91.3 * 360 / 365.25, true, Z.wheelTop)]), M.bronze);
  const il = new THREE.Group(); il.name = 'ilG'; instr.add(il);
  ring('il', 'il', '일구백각환(日晷百刻環): 가운데, 리벳으로 고정, 낮 시각', 4, il);
  const sg = new THREE.Group(); sg.name = 'sgG'; instr.add(sg);
  ring('sg', 'sg', '성구백각환(星晷百刻環): 안쪽, 돌아감, 밤 시각', 5, sg);
  add(sg, 'sgEar', '성구백각환의 귀(耳): 卯正과 酉正 자리', 5, merge([ruyi(24, 18, ARTI.sg.t, RING.sg[0] + 1.5, 90, false, Z.wheelTop), ruyi(24, 18, ARTI.sg.t, RING.sg[0] + 1.5, 270, false, Z.wheelTop)]), M.bronze);
  // 계형: 기기 X축을 따라 놓임
  const heng = new THREE.Group(); heng.name = 'hengG'; instr.add(heng);
  {
    const L2 = DIM.hengL / 2, W2 = DIM.hengW / 2, T = DIM.hengT, z0 = Z.hengBot;
    const mk = (holeR, d, zz) => {
      const s = new THREE.Shape(); s.moveTo(-L2, -W2); s.lineTo(L2, -W2); s.lineTo(L2, W2); s.lineTo(-L2, W2); s.lineTo(-L2, -W2);
      const h = new THREE.Path(); h.absarc(0, 0, holeR, 0, Math.PI * 2, true); s.holes.push(h);
      for (const sgn of [-1, 1]) { const p = new THREE.Path(), x0 = sgn > 0 ? WIN.r0 : -WIN.r1, x1 = sgn > 0 ? WIN.r1 : -WIN.r0, w = DIM.winW / 2; p.moveTo(x0, -w); p.lineTo(x0, w); p.lineTo(x1, w); p.lineTo(x1, -w); p.lineTo(x0, -w); s.holes.push(p) }
      const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 40 }); g.translate(0, 0, zz); return g;
    };
    const bottom = mk(DIM.axisD / 2 + .5, 5, z0), top = mk(ASSUME.hengHole / 2, T - 5, z0 + 5); // 뒷면에 축이 들어가는 홈(지름 42, 깊이 5: 한국표준연구소 1989)
    add(heng, 'heng', '계형(界衡): 길이 2척1촌, 양 머리에 네모 창(2촌2분 × 1촌8분)', 6, merge([bottom, top]), M.bronze);
    // 정극환을 받드는 두 용(길이 1척): 축을 끼고 계형 허리 좌우에
    const zj = JG_Z, dr = [], rr = DIM.jgOutD / 2 + 2;
    for (const sgn of [-1, 1]) {
      const pts = [[0, sgn * 26, z0 + T + 1], [7, sgn * 30, z0 + T + 40], [-7, sgn * 34, 85], [7, sgn * 34, 130], [-5, sgn * 31, 175], [0, sgn * (rr + 4), zj - 12]].map(p => new THREE.Vector3(...p));
      dr.push(sweepUV(pts, u => 4 + 3.6 * Math.sin(Math.PI * Math.min(1, u * 1.1)), 14, null, 1.2).geo);
      const head = new THREE.SphereGeometry(6.5, 16, 12); head.scale(1.6, 1, 1); head.translate(0, sgn * (rr + 5), zj - 3); dr.push(head);
      const foot = new THREE.CylinderGeometry(8, 10, 3, 20); foot.rotateX(Math.PI / 2); foot.translate(0, sgn * 26, z0 + T + 1.5); dr.push(foot);
      { const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); for (const u of [.3, .5, .7]) { const P = cv.getPointAt(u); const f = new THREE.ConeGeometry(2.6, 9, 6); f.rotateX(Math.PI / 2); f.translate(P.x, P.y + sgn * 4, P.z); dr.push(f) } } // 등지느러미: 몸통에 붙임
    }
    add(heng, 'jgDragon', '정극환을 받드는 두 용(길이 1척): 쌍룡이 축을 끼고', 7, merge(dr), M.dragonSkin);
    // 정극환: 「바깥 고리와 안 고리가 약간 서로 대여서 십자와 같다」 → 네 다리로 이음
    const go = annulus(DIM.jgOutD / 2 - DIM.jgOutW, DIM.jgOutD / 2, DIM.jgT, 96); go.translate(0, 0, zj - DIM.jgT / 2);
    const gi = annulus(DIM.jgInD / 2 - DIM.jgInW, DIM.jgInD / 2, DIM.jgT, 96); gi.translate(0, 0, zj - DIM.jgT / 2);
    const rIn = DIM.jgInD / 2, rOut = DIM.jgOutD / 2 - DIM.jgOutW, br = [];
    for (const a of [45, 135, 225, 315]) { const b = box(rOut - rIn + 1, 1.2, DIM.jgT, (rOut + rIn) / 2, 0, zj); b.rotateZ(a * Math.PI / 180); br.push(b) }
    add(heng, 'jg', '정극환(定極環): 바깥 고리와 안 고리', 8, merge([go, gi, ...br]), M.gold);
    // 노끈: 정극환 바깥 고리 양쪽 구멍 → 계형 양 머리 창의 안쪽 구멍 → 창을 가로질러 바깥 구멍(구멍 6개)
    const zc = z0 + T / 2, J = DIM.jgOutD / 2 - DIM.jgOutW / 2;
    const P = [new THREE.Vector3(-(WIN.r1 + 3), 0, zc), new THREE.Vector3(-WIN.r0, 0, zc), new THREE.Vector3(-J, 0, zj), new THREE.Vector3(J, 0, zj), new THREE.Vector3(WIN.r0, 0, zc), new THREE.Vector3(WIN.r1 + 3, 0, zc)];
    const seg = (p, q) => { const d = q.clone().sub(p), l = d.length(); const g = new THREE.CylinderGeometry(.6, .6, l, 8); g.translate(0, l / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(p.x, p.y, p.z); return g };
    const segs = []; for (let i = 0; i < P.length - 1; i++) segs.push(seg(P[i], P[i + 1]));
    add(heng, 'cord', '가는 노끈(삼각 실표): 정극환에서 계형 양 머리 창을 가로지름', 9, merge(segs), M.cord);
    heng.userData.cord = P;
  }
  // 3. 운룡주(雲龍柱): 구름 속을 오르는 용이 감긴 기둥, 용이 바퀴 자루를 묾
  const dragon = new THREE.Group(); dragon.name = 'dragonG'; root.add(dragon);
  parts.push({ id: 'dragon', name: '반룡(蟠龍): 서린 용이 바퀴 자루를 물고 있음', step: 1, obj: dragon });

  function frame(phi) {
    const p = phi * Math.PI / 180, cp = Math.cos(p), sp = Math.sin(p);
    const X = new THREE.Vector3(-1, 0, 0), Y = new THREE.Vector3(0, cp, sp), Zz = new THREE.Vector3(0, sp, -cp);
    const handleLen = R + DIM.handleOut + DIM.handleIn, zMid = DIM.wheelT - DIM.handleT / 2;
    const E = new THREE.Vector3(0, yT + ASSUME.colH + 40, zCol); // 자루 끝(용 머리 속)
    const Cc = E.clone().add(Y.clone().multiplyScalar(handleLen)).add(Zz.clone().multiplyScalar(-zMid));
    const m = new THREE.Matrix4().makeBasis(X, Y, Zz); m.setPosition(Cc);
    instr.matrixAutoUpdate = false; instr.matrix.copy(m); instr.matrixWorldNeedsUpdate = true;
    dragon.clear();
    const Mo = Cc.clone().add(Y.clone().multiplyScalar(-(R + DIM.handleOut))).add(Zz.clone().multiplyScalar(zMid));
    const mkm = (g, mat) => { const me = new THREE.Mesh(g, mat); me.castShadow = me.receiveShadow = true; dragon.add(me); return me };
    // ── 반룡(蟠龍): 영릉 복원품(유튜브 「일성정시의」, 과학문화해설사 영상)처럼 굵은 비늘 몸통이 가는 심대를 감고 S자로 올라가 자루를 묾 ──
    const cx = 0, cz = zCol, rr0 = ASSUME.colD / 2; // 심대(속 기둥)
    const head0 = E.clone().add(Y.clone().multiplyScalar(-70)); // 목이 머리로 이어지는 곳
    { const hc = (head0.y - yT) * .55; const g = new THREE.CylinderGeometry(rr0 * .8, rr0, hc, 24); g.translate(cx, yT + hc / 2, cz); mkm(g, M.bronzeDark) } // 심대(몸통 속에 거의 가려짐)
    // 몸통 길: 꼬리는 대 위에서 한 번 말리고, 몸은 심대를 1¼바퀴 크게 감아 오른 뒤 목이 자루 축으로 들어감
    const body = [];
    const H0 = yT, Htop = head0.y;
    body.push(new THREE.Vector3(cx + 150, H0 + 14, cz + 40)); // 꼬리 끝(대 위)
    body.push(new THREE.Vector3(cx + 120, H0 + 18, cz + 110), new THREE.Vector3(cx + 40, H0 + 26, cz + 135), new THREE.Vector3(cx - 50, H0 + 40, cz + 110)); // 대 위를 휘감는 꼬리
    const turns = 1.25, n1 = 16;
    for (let k = 1; k <= n1; k++) { const u = k / n1, a = Math.PI * .75 + u * turns * Math.PI * 2, r = rr0 + 52 - 18 * u + 18 * Math.sin(u * Math.PI * 2.5); body.push(new THREE.Vector3(cx + Math.cos(a) * r, H0 + 60 + (Htop - H0 - 150) * Math.pow(u, .9), cz + Math.sin(a) * r)) }
    const neckDir = Y.clone();
    body.push(head0.clone().add(neckDir.clone().multiplyScalar(-60)).add(new THREE.Vector3(0, -20, 10)), head0.clone(), E.clone().add(neckDir.clone().multiplyScalar(40)), E.clone().add(neckDir.clone().multiplyScalar(95))); // 목은 자루를 감싸고 머리까지
    const bodyR = u => u < .12 ? 10 + 22 * (u / .12) : u < .7 ? 32 + 12 * Math.sin((u - .12) / .58 * Math.PI) : 32 - 4 * (u - .7) / .3;
    const outward = (P, T) => { let d = new THREE.Vector3(P.x - cx, 0, P.z - cz); if (d.length() < 1e-3 || P.y > Htop - 90) d = new THREE.Vector3(0, 1, 0).sub(T.clone().multiplyScalar(T.y)); d.sub(T.clone().multiplyScalar(d.dot(T))); return d.normalize() };
    const dg = sweepUV(body, bodyR, 28, outward, 3);
    mkm(dg.geo, M.dragonSkin);
    // 등지느러미(갈기): 몸통 등줄기(바깥쪽)를 따라 납작한 세모
    for (let k = 4; k < 120; k += 3) { const u = k / 128, P = dg.curve.getPointAt(u), T = dg.curve.getTangentAt(u), Nn = outward(P, T), r = bodyR(u);
      const s = new THREE.Shape(); s.moveTo(-10, 0); s.quadraticCurveTo(-3, 14, 9, 22); s.lineTo(6, 0); s.lineTo(-10, 0);
      const f = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: true, bevelSize: .8, bevelThickness: .8, bevelSegments: 1 }); f.translate(0, 0, -1.5);
      const B = new THREE.Vector3().crossVectors(T, Nn); f.applyMatrix4(new THREE.Matrix4().makeBasis(T.clone().negate(), Nn, B)); const b = P.clone().add(Nn.clone().multiplyScalar(r * .82)); f.translate(b.x, b.y, b.z); mkm(f, M.bronze) }
    // 네 다리: 몸통 옆구리에서 나와 무릎을 굽히고, 발톱 넷으로 움켜쥠
    const legAt = (u, sd) => { const P = dg.curve.getPointAt(u), T = dg.curve.getTangentAt(u), Nn = outward(P, T), S = new THREE.Vector3().crossVectors(T, Nn).normalize().multiplyScalar(sd), r = bodyR(u), down = new THREE.Vector3(0, -1, 0);
      const root = P.clone().add(S.clone().multiplyScalar(r * .6)).sub(Nn.clone().multiplyScalar(r * .3));
      const knee = root.clone().add(S.clone().multiplyScalar(42)).add(Nn.clone().multiplyScalar(18)).add(new THREE.Vector3(0, 14, 0));
      const foot = knee.clone().add(S.clone().multiplyScalar(14)).add(T.clone().multiplyScalar(-22)).add(down.clone().multiplyScalar(34));
      mkm(sweepUV([root, root.clone().lerp(knee, .5).add(new THREE.Vector3(0, 6, 0)), knee, foot], t => 15 - 7 * t, 14).geo, M.dragonSkin);
      { const g = new THREE.SphereGeometry(10, 12, 10); g.scale(1.2, .7, 1.2); g.translate(foot.x, foot.y, foot.z); mkm(g, M.bronze) }
      for (let c2 = 0; c2 < 4; c2++) { const a = (c2 - 1.5) * .6; const fw = S.clone().normalize().multiplyScalar(Math.cos(a)).add(T.clone().multiplyScalar(Math.sin(a))).normalize(); if (c2 === 0) fw.copy(S.clone().normalize().negate());
        const mid = foot.clone().add(fw.clone().multiplyScalar(14)).add(new THREE.Vector3(0, 2, 0)), tip = foot.clone().add(fw.clone().multiplyScalar(24)).add(new THREE.Vector3(0, -10, 0));
        mkm(sweepUV([foot, mid, tip], t => 4.2 - 3.4 * t, 8).geo, M.gold) } };
    legAt(.2, 1); legAt(.24, -1); legAt(.6, 1); legAt(.64, -1);
    // 머리: 자루 축을 따라 E~Mo. 위턱·아래턱이 자루를 위아래로 물고, 뿔·갈기·수염·눈
    const head = new THREE.Group(); dragon.add(head);
    head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Zz)); head.position.copy(E);
    const hm = (g, mat = M.bronze) => { const me = new THREE.Mesh(g, mat); me.castShadow = me.receiveShadow = true; head.add(me); return me };
    const HL = Mo.distanceTo(E), zt = DIM.handleT / 2; // 머리 좌표: y = 자루 축(0 = 자루 끝, HL = 입 끝), z = 기기 Z(바퀴 윗면 쪽)
    // 머리(영릉·국립고궁박물관 복원품 사진 참고): 주둥이가 자루를 따라 위로 향하고, 입을 크게 벌려 자루를 묾.
    // 머리 좌표: y = 자루 축(0 = 자루 끝, HL = 입 끝), z+ = 위턱·등 쪽, x = 좌우
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const ell = (rx, ry, rz, x, y, z, rot = 0, mat) => { const g = new THREE.SphereGeometry(1, 32, 20); g.scale(rx, ry, rz); if (rot) g.rotateX(rot); g.translate(x, y, z); return hm(g, mat) };
    // 모양판(불꽃·갈기): 2D 윤곽을 두께 있게 뽑아 기준점 o에서 a(길이 방향)·b(너비 방향)로 놓음
    const plate = (len, wid, th, o, a, b, curl = .35, mat = M.bronze) => {
      const s = new THREE.Shape(); s.moveTo(0, -wid / 2); s.bezierCurveTo(len * .45, -wid * .55, len * .8, -wid * .1, len, wid * curl); s.bezierCurveTo(len * .75, wid * .25, len * .4, wid * .5, 0, wid / 2); s.lineTo(0, -wid / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 10 }); g.translate(0, 0, -th / 2);
      const A = a.clone().normalize(), Bv = b.clone().sub(A.clone().multiplyScalar(b.dot(A))).normalize(), C = new THREE.Vector3().crossVectors(A, Bv);
      g.applyMatrix4(new THREE.Matrix4().makeBasis(A, Bv, C)); g.translate(o.x, o.y, o.z); return hm(g, mat) };
    const yk = HL - 150; // 머리통 중심
    // 머리통과 이마
    ell(54, 66, 50, 0, yk, 12);
    ell(44, 50, 32, 0, yk + 34, 38); // 이마(눈썹 위 볼록)
    // 위턱(주둥이): 길고 앞이 들린 모양, 자루 위쪽(z+)
    ell(40, 92, 26, 0, (yk + HL) / 2 + 16, zt + 22, -.06); // 위턱(넓적한 주둥이)
    ell(34, 40, 22, 0, HL - 14, zt + 30); // 위턱 앞
    ell(36, 26, 28, 0, HL + 14, zt + 44); // 들린 코끝
    ell(26, 22, 24, 0, HL + 20, zt + 70, -.5); // 위로 말린 코 둔덕(여의 모양)
    for (const s2 of [-1, 1]) ell(16, 18, 14, s2 * 20, HL + 30, zt + 78); // 코 둔덕의 두 소용돌이
    for (const s2 of [-1, 1]) ell(10, 9, 9, s2 * 18, HL + 20, zt + 50, 0, M.bronzeDark); // 콧구멍
    // 아래턱: 입을 크게 벌려(약 30°) 자루 아래쪽(z−)
    { const jaw = new THREE.Group(); head.add(jaw); jaw.position.set(0, yk + 10, -10); jaw.rotation.x = .32;
      const jm = (g, mat = M.bronze) => { const me = new THREE.Mesh(g, mat); me.castShadow = true; jaw.add(me); return me };
      jm((() => { const g = new THREE.SphereGeometry(1, 28, 16); g.scale(34, 86, 16); g.translate(0, 82, -20); return g })());
      jm((() => { const g = new THREE.SphereGeometry(1, 20, 12); g.scale(26, 22, 16); g.translate(0, 160, -16); return g })()); // 아래턱 끝
      for (let t2 = 0; t2 < 6; t2++) for (const s2 of [-1, 1]) { const g = new THREE.ConeGeometry(t2 === 4 ? 4.5 : 3, t2 === 4 ? 18 : 10, 6); const y = 40 + t2 * 22; g.translate(s2 * 24, y, -6); jm(g, M.ivory) } // 아랫니·송곳니
      jm((() => { const g = new THREE.SphereGeometry(1, 16, 10); g.scale(16, 60, 6); g.translate(0, 90, -8); return g })(), M.dragonTongue); // 혀
      // 턱수염: 턱 아래 불꽃 모양 판이 아래·뒤로
      for (let k = 0; k < 4; k++) { const o = V(0, 40 + k * 26, -30); const g = plate(46 - k * 6, 18, 4, o, V(0, -.6, -1), V(1, 0, 0), .4); head.remove(g); jaw.add(g) } }
    // 윗니·송곳니(자루를 물고 있음)
    for (let t2 = 0; t2 < 6; t2++) for (const s2 of [-1, 1]) { const g = new THREE.ConeGeometry(t2 === 4 ? 4.5 : 3, t2 === 4 ? 20 : 11, 6); g.rotateX(Math.PI); g.translate(s2 * 26, yk + 60 + t2 * 22, zt + 4); hm(g, M.ivory) }
    // 입술 가장자리(위턱 아랫선)
    for (const s2 of [-1, 1]) hm(sweepUV([V(s2 * 34, yk + 30, 14), V(s2 * 36, yk + 100, zt + 10), V(s2 * 28, HL - 10, zt + 16)], t => 6 - 2 * t, 10).geo);
    for (const s2 of [-1, 1]) {
      // 눈: 툭 튀어나온 눈알과 무거운 눈썹
      ell(13, 13, 13, s2 * 40, yk + 56, zt + 30, 0, M.gold);
      ell(6, 6, 5, s2 * 48, yk + 60, zt + 36, 0, M.bronzeDark); // 눈동자
      plate(44, 24, 7, V(s2 * 30, yk + 58, zt + 48), V(s2 * .5, -1, .6), V(s2 * 1, 0, 0), .8); // 눈썹(뒤로 뻗음)
      // 볼 갈기: 턱 관절 둘레에 부채꼴 불꽃 판(목도리처럼)
      for (let k = 0; k < 5; k++) { const a = -.9 + k * .42; const dir = V(s2 * Math.cos(a) * .8, -.8, Math.sin(a)); plate(40 - Math.abs(k - 2) * 4, 24, 6, V(s2 * 44, yk + 4, 6 + Math.sin(a) * 22), dir, V(0, 1, 0), .8) }
      // 뿔: 사슴뿔처럼 뒤로 길게, 가지 하나
      const hp = [V(s2 * 20, yk + 30, zt + 46), V(s2 * 30, yk - 20, zt + 74), V(s2 * 36, yk - 85, zt + 84), V(s2 * 34, yk - 140, zt + 70)];
      hm(sweepUV(hp, t => 8.5 - 6.5 * t, 12).geo, M.horn); hm(sweepUV([hp[1].clone(), hp[1].clone().add(V(s2 * 20, -14, 32))], t => 5 - 3.5 * t, 10).geo, M.horn);
      // 귀
      plate(36, 20, 4, V(s2 * 38, yk + 10, zt + 30), V(s2 * .6, -1, .5), V(0, 0, 1), .3);
      // 긴 수염: 콧등에서 뒤로 휘어 늘어짐
      hm(sweepUV([V(s2 * 28, HL + 6, zt + 40), V(s2 * 62, HL - 14, zt + 54), V(s2 * 88, HL - 60, zt + 40), V(s2 * 96, HL - 110, zt + 10)], t => 3.4 - 2.6 * t, 8).geo);
      // 뒷머리 갈기: 머리 뒤에서 목을 따라 흘러내리는 불꽃 판
      for (let k = 0; k < 5; k++) { const o = V(s2 * (26 + k * 2), yk - 24 - k * 24, zt + 26 - k * 4); plate(48 - k * 5, 24, 6, o, V(s2 * .45, -1, .3), V(s2 * 1, 0, 0), .8) }
    }
    // 정수리 갈기(가운데)
    for (let k = 0; k < 5; k++) plate(46 - k * 5, 24, 6, V(0, yk - 14 - k * 24, zt + 50 - k * 6), V(0, -1, .5), V(1, 0, 0), .8);
    return { C: Cc, X, Y, Z: Zz, yT };
  }
  return { root, parts, groups: { instr, ju, il, sg, heng, dragon }, frame, yTop: yT };
}
