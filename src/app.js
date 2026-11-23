import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildModel, makeMaterials, drawScales, DIM, ASSUME, RING, Z as ZL, JG_Z, CHEOK, ARTI, WIN, RMAX, HANYANG } from './model.js';
import * as A from './astro.js';
import { STARS, LINES, NAMED } from './stars.js';
import { initPlace, chart, esc, muniAt, PRESETS, GBG } from './place.js';

const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const fmt1 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const enu2w = v => new THREE.Vector3(v[0], v[2], -v[1]); // 동·북·위 → three(x 동, y 위, z 남)
const KOCHAB = NAMED[72607], POLARIS = NAMED[11767], TIANSHU = NAMED[62572];

// ── 상태 ──
const S = { lat: GBG.lat, lon: GBG.lon, place: GBG.n, design: 'local', ms: Date.now(), playing: false, speed: 600, epoch: 'now', hengAuto: true, hengManual: 0, shadow: true, sunLine: false, names: true, aster: true, tab: 'place', step: 9, ghost: false, move: false, explode: false, quiz: null, view: 'whole' };

// ── 3D 기본 ──
const canvas = q('#c3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: false });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
const scene = new THREE.Scene();
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture } // 금속(청동)이 검게 보이지 않도록 주변 반사광
const camera = new THREE.PerspectiveCamera(40, 1, 3, 120000);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 120; controls.maxDistance = 9000;
let dirty = true; controls.addEventListener('change', () => dirty = true);
// 빛
const hemi = new THREE.HemisphereLight(0xdfe9f2, 0x6d6656, .6); scene.add(hemi);
const amb = new THREE.AmbientLight(0xffffff, .3); scene.add(amb);
const sunL = new THREE.DirectionalLight(0xffffff, 2.6); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 100, far: 6000 }); sunL.shadow.bias = -.0002; sunL.shadow.normalBias = .4; scene.add(sunL, sunL.target);
const lamp = new THREE.PointLight(0xffd9a0, 0, 2600, 1.4); lamp.position.set(500, 1500, 900); scene.add(lamp);
// 바닥(박석)
{
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'); g.fillStyle = '#8e8a7f'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const s = 110 + Math.random() * 30 | 0; g.fillStyle = `rgb(${s + 30},${s + 27},${s + 18})`; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124) }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); t.colorSpace = THREE.SRGBColorSpace;
  const fl = new THREE.Mesh(new THREE.CircleGeometry(9000, 64), new THREE.MeshStandardMaterial({ map: t, roughness: .95, envMapIntensity: .25 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
}
// 모델
const scaleCanvas = drawScales(4096);
const scaleTex = new THREE.CanvasTexture(scaleCanvas); scaleTex.colorSpace = THREE.SRGBColorSpace; scaleTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); scaleTex.generateMipmaps = true;
const MAT = makeMaterials(scaleTex);
const MODEL = buildModel(MAT); scene.add(MODEL.root);
const G = MODEL.groups;
let FR = MODEL.frame(S.lat);
// 계형 읽는 끝 표시(붉은 세모)
{
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(9, 6); s.lineTo(9, -6); s.lineTo(0, 0); // 읽는 끝(대상 반대쪽, −X) 표시
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(-(WIN.r0 - 2), 0, ZL.hengTop);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc4472b, roughness: .5 })); G.heng.add(m);
}
// 부재 찾기
const PARTS = MODEL.parts; const meshPart = new Map();
for (const p of PARTS) { p.rest = new THREE.Vector3(); p.obj.traverse(o => { if (o.isMesh) meshPart.set(o, p) }); p.anim = null }
const dragonPart = PARTS.find(p => p.id === 'dragon');
function refreshDragonMap() { dragonPart.obj.traverse(o => { if (o.isMesh) meshPart.set(o, dragonPart) }) }
refreshDragonMap();

// ── 하늘: 해·별 ──
const SKY_R = 50000;
const sky = new THREE.Group(); scene.add(sky);
const sunSprite = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(.12, 'rgba(255,248,220,1)'); gr.addColorStop(.2, 'rgba(255,220,150,.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(cv); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true, fog: false })); sp.scale.setScalar(4200); sp.renderOrder = -1; return sp })();
sky.add(sunSprite);
const starMat = new THREE.ShaderMaterial({
  uniforms: { uOp: { value: 1 }, uPR: { value: renderer.getPixelRatio() }, uZ: { value: 1 } }, transparent: true, depthWrite: false,
  vertexShader: 'attribute float size; attribute vec3 color; varying vec3 vC; uniform float uPR; uniform float uZ; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=size*uPR*uZ; }',
  fragmentShader: 'varying vec3 vC; uniform float uOp; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); float a=smoothstep(0.5,0.15,r); if(a<0.01) discard; gl_FragColor=vec4(vC,a*uOp); }'
});
const starGeo = new THREE.BufferGeometry();
{
  const n = STARS.length, size = new Float32Array(n), col = new Float32Array(n * 3);
  STARS.forEach((s, i) => { const m = s[2]; size[i] = Math.max(1.4, 7.2 - 1.15 * m); const bv = s[3]; const c = new THREE.Color().setHSL(bv < .3 ? .6 : bv < .8 ? .14 : .07, bv < .3 ? .35 : bv < .8 ? .25 : .55, .82); col.set([c.r, c.g, c.b], i * 3) });
  starGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); starGeo.setAttribute('size', new THREE.BufferAttribute(size, 1)); starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; stars.renderOrder = -2; sky.add(stars);
// 동양 별자리 선
const asterSel = LINES.filter(l => ['北极', '勾陈', '北斗'].includes(l.n));
const asterAll = LINES;
const lineGeo = new THREE.BufferGeometry(); const lineMat = new THREE.LineBasicMaterial({ color: 0x8fb3ff, transparent: true, opacity: .45, depthWrite: false });
const lineHi = new THREE.BufferGeometry(); const lineHiMat = new THREE.LineBasicMaterial({ color: 0xffd36b, transparent: true, opacity: .8, depthWrite: false });
const asterLines = new THREE.LineSegments(lineGeo, lineMat), asterHi = new THREE.LineSegments(lineHi, lineHiMat); asterLines.frustumCulled = asterHi.frustumCulled = false; sky.add(asterLines, asterHi);
const precCache = new Map();
function precessed(ra, dec, ep) { const k = ra + ',' + dec + ',' + ep.toFixed(1); let v = precCache.get(k); if (!v) { v = A.precess(ra, dec, ep); if (precCache.size > 20000) precCache.clear(); precCache.set(k, v) } return v }
function skyDir(raDec, gast, lat, lon) { const H = gast + lon - raDec[0]; return A.hdToENU(H, raDec[1], lat) }
let lastSkyKey = '';
function updateSky(ms) {
  const ep = S.epoch === '1437' ? 1437 : Math.round(A.yearOf(ms) * 10) / 10;
  const key = Math.round(ms / 3e4) + '|' + S.lat + '|' + S.lon + '|' + ep + '|' + S.aster;
  if (key === lastSkyKey) return; lastSkyKey = key;
  const gast = A.sunEq(ms).gast, P = starGeo.attributes.position;
  STARS.forEach((s, i) => { const v = skyDir(precessed(s[0], s[1], ep), gast, S.lat, S.lon); P.setXYZ(i, v[0] * SKY_R, v[2] * SKY_R, -v[1] * SKY_R) }); P.needsUpdate = true;
  const seg = (list, geo) => { const arr = []; for (const l of list) for (let i = 0; i < l.p.length - 1; i++) { for (const p of [l.p[i], l.p[i + 1]]) { const v = skyDir(precessed(p[0], p[1], ep), gast, S.lat, S.lon); arr.push(v[0] * SKY_R * .99, v[2] * SKY_R * .99, -v[1] * SKY_R * .99) } } geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.computeBoundingSphere() };
  seg(S.aster ? asterAll.filter(l => !asterSel.includes(l)) : [], lineGeo); seg(S.aster ? asterSel : [], lineHi);
}

// ── 그림자 선(노끈) ──
const shadowMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: .85, depthTest: true });
const shadowLines = new THREE.LineSegments(new THREE.BufferGeometry(), shadowMat); shadowLines.frustumCulled = false; scene.add(shadowLines);
const rayMat = new THREE.LineDashedMaterial({ color: 0xffc04a, dashSize: 30, gapSize: 18, transparent: true, opacity: .9 });
const rayLine = new THREE.Line(new THREE.BufferGeometry(), rayMat); rayLine.frustumCulled = false; scene.add(rayLine);

// ── 기기 좌표 ──
const phi0 = () => S.design === 'local' ? S.lat : HANYANG; // 기기를 맞춘 위도
function axesENU(p) { const r = p * D2R; return { X: [-1, 0, 0], Y: [0, -Math.sin(r), Math.cos(r)], Z: [0, Math.cos(r), Math.sin(r)] } }
const angOf = (v, ax) => Math.atan2(dot(v, ax.X), dot(v, ax.Y)) * R2D; // θ: 午正에서 서쪽으로(시계 방향)
const elevOf = (v, ax) => Math.asin(Math.max(-1, Math.min(1, dot(v, ax.Z)))) * R2D;

// 한 시각의 모든 값
function compute(ms) {
  const lat = S.lat, lon = S.lon, ax = axesENU(phi0());
  const sun = A.sunAt(ms, lat, lon);
  const ep = S.epoch === '1437' ? 1437 : A.yearOf(ms);
  const star = A.starAt(KOCHAB.ra, KOCHAB.dec, ms, lat, lon, ep);
  const thSun = angOf(sun.vApp, ax), thStar = angOf(star.vApp, ax);
  // 주천도분환·성구백각환 맞추기
  const dj = A.lastDongji(ms, lon);
  const st0 = A.starAt(KOCHAB.ra, KOCHAB.dec, dj.midnight, lat, lon, ep);
  const th0 = angOf(st0.vApp, ax);
  const days = (ms - dj.midnight) / 864e5, d = Math.round(days);
  const rho = th0 + 180 + d * 360 / 365.25; // 성구백각환 회전: 子正(글자각 0)이 놓이는 θ
  const mode = sun.altApp > -0.3 ? 'day' : sun.altApp < -9 ? 'night' : 'dusk';
  return { sun, star, thSun, thStar, dj, th0, d, days, rho, mode, ax, sunElev: elevOf(sun.vApp, ax), starElev: elevOf(star.vApp, ax) };
}
// 계형은 +X 끝이 해·별을 향하고, 반대쪽(−X) 머리의 창에서 눈금을 읽는다(자루 쪽 午正: 민병희 외 2023)
const readDay = th => A.mod((th + 180) / 15, 24);
const readNight = (th, rho) => A.mod((th + 180 - rho) / 15, 24);

let C = compute(S.ms);
function hengAngle() {
  if (!S.hengAuto) return S.hengManual;
  if (S.quiz && S.quiz.manual) return S.hengManual;
  return C.mode === 'day' ? C.thSun : C.thStar;
}

// ── 장면 갱신 ──
let builtPhi = S.lat;
function applyScene() {
  const p = phi0(); if (Math.abs(p - builtPhi) > 1e-6) { FR = MODEL.frame(p); builtPhi = p; refreshDragonMap(); applyGhost() }
  // 환 회전: rotation.z = −θ
  G.ju.rotation.z = -(C.th0 + 180) * D2R; // 初度를 제성(동지 자정)을 겨눈 계형의 읽는 끝에
  G.sg.rotation.z = -C.rho * D2R;
  const th = hengAngle(); G.heng.rotation.z = -(th - 90) * D2R; // 계형 +X 끝이 θ를 가리킴
  // 해·빛·하늘
  const sv = enu2w(C.sun.vApp);
  sunSprite.position.copy(sv.clone().multiplyScalar(SKY_R * .97)); sunSprite.visible = C.sun.altApp > -1;
  const alt = C.sun.altApp, dayK = THREE.MathUtils.clamp((alt + 6) / 12, 0, 1);
  const tgt = FR.C; sunL.target.position.copy(tgt); sunL.position.copy(tgt.clone().add(sv.clone().multiplyScalar(3000)));
  sunL.intensity = alt > 0 ? 2.8 * Math.min(1, alt / 8 + .25) : 0; sunL.castShadow = alt > 0;
  hemi.intensity = .12 + .55 * dayK; amb.intensity = .12 + .35 * dayK; hemi.color.setHSL(.58, .3, .55 + .3 * dayK);
  lamp.intensity = (1 - dayK) * 2.2e5 * 0 + (1 - dayK) * 1.6; lamp.distance = 0; lamp.decay = 0;
  lamp.position.copy(tgt.clone().add(new THREE.Vector3(900, 700, 1400)));
  const bg = new THREE.Color().lerpColors(new THREE.Color(0x060a14), new THREE.Color(0x8fb6d6), dayK);
  if (alt > -6 && alt < 4) bg.lerp(new THREE.Color(0xd08a5a), .25 * (1 - Math.abs(alt + 1) / 5));
  scene.background = bg;
  starMat.uniforms.uOp.value = THREE.MathUtils.clamp((-alt - 3) / 9, 0, 1);
  stars.visible = asterLines.visible = asterHi.visible = starMat.uniforms.uOp.value > .01;
  lineMat.opacity = .35 * starMat.uniforms.uOp.value; lineHiMat.opacity = .85 * starMat.uniforms.uOp.value;
  updateSky(S.ms);
  updateShadow(); dirty = true;
}
// 노끈 그림자: 해가 바퀴 면 위쪽이면 계형·환 위에, 아니면 받침·석대·바닥 위에
const tmpM = new THREE.Matrix4();
function updateShadow() {
  const arr = []; const ray = [];
  const showS = S.shadow && C.sun.altApp > 0 && (!S.quiz || S.quiz.shadow !== false);
  G.heng.updateMatrixWorld(true);
  const cord = G.heng.userData.cord; const W = G.heng.matrixWorld;
  const sw = enu2w(C.sun.vApp).normalize();
  if (showS) {
    const instrInv = new THREE.Matrix4().copy(G.instr.matrixWorld).invert();
    const sL = sw.clone().transformDirection(instrInv); // 기기 좌표에서 해 방향
    const hengInv = new THREE.Matrix4().copy(G.heng.matrix).invert();
    const hit = Pw => {
      if (sL.z > .02) {
        const P = Pw.clone().applyMatrix4(instrInv);
        for (const zp of [ZL.hengTop + .4, ZL.ringTop + .4]) { const t = (P.z - zp) / sL.z; if (t < 0) continue; const Q = P.clone().sub(sL.clone().multiplyScalar(t)); if (zp > ZL.ringTop + 1) { const h = Q.clone().applyMatrix4(hengInv); if (Math.abs(h.x) < DIM.hengL / 2 && Math.abs(h.y) < DIM.hengW / 2) { const ax2 = Math.abs(h.x); const inWin = ax2 > WIN.r0 && ax2 < WIN.r1 && Math.abs(h.y) < DIM.winW / 2; if (!inWin && Math.hypot(h.x, h.y) > ASSUME.hengHole / 2) return Q.applyMatrix4(G.instr.matrixWorld) } continue } const r = Math.hypot(Q.x, Q.y); if (r < RMAX && r > RING.sg[0]) return Q.applyMatrix4(G.instr.matrixWorld); return null }
        return null;
      } else {
        const planes = [[FR.yT + .6, x => Math.abs(x.x) < DIM.daeW / 2 && Math.abs(x.z) < DIM.daeL / 2], [1, x => Math.hypot(x.x, x.z) < 4000]];
        for (const [y, inside] of planes) { if (sw.y <= 0) return null; const t = (Pw.y - y) / sw.y; if (t < 0) continue; const Q = Pw.clone().sub(sw.clone().multiplyScalar(t)); if (inside(Q)) return Q }
        return null;
      }
    };
    for (let s = 0; s < cord.length - 1; s++) {
      let prev = null; const N = 120;
      for (let i = 0; i <= N; i++) { const P = cord[s].clone().lerp(cord[s + 1], i / N).applyMatrix4(W); const Q = hit(P); if (Q && prev && Q.distanceTo(prev) < 60) arr.push(prev.x, prev.y, prev.z, Q.x, Q.y, Q.z); prev = Q }
    }
  }
  const g = shadowLines.geometry; g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeBoundingSphere();
  // 빛줄기
  if (S.sunLine && C.sun.altApp > 0) { const P = new THREE.Vector3(0, 0, JG_Z).applyMatrix4(W); const far = P.clone().add(sw.clone().multiplyScalar(2600)); rayLine.geometry.setFromPoints([far, P]); rayLine.computeLineDistances(); rayLine.visible = true } else rayLine.visible = false;
}

// ── 화면 크기 ──
function resize() { const r = q('#stage').getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); starMat.uniforms.uPR.value = renderer.getPixelRatio(); dirty = true }
new ResizeObserver(resize).observe(q('#stage')); resize();

// ── 보기 ──
const camAnim = { a: null };
function flyTo(pos, tgt, up = new THREE.Vector3(0, 1, 0), fov = 40, ms = 900) { camAnim.a = { t0: performance.now(), dur: ms, p0: camera.position.clone(), p1: pos, t0v: controls.target.clone(), t1: tgt, u0: camera.up.clone(), u1: up, f0: camera.fov, f1: fov } }
function setView(v) {
  S.view = v; qa('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  const Cc = FR.C, Zw = FR.Z, Yw = FR.Y; const eye = ['pole', 'cord'].includes(v);
  controls.enabled = !eye; q('#viewNote').hidden = !eye;
  if (v === 'whole') flyTo(Cc.clone().add(new THREE.Vector3(1300, 700, 1900)), Cc.clone().add(new THREE.Vector3(0, -260, -60)));
  else if (v === 'south') flyTo(Cc.clone().add(new THREE.Vector3(0, 150, 2100)), Cc.clone().add(new THREE.Vector3(0, -250, -80)));
  else if (v === 'east') flyTo(Cc.clone().add(new THREE.Vector3(2100, 150, -100)), Cc.clone().add(new THREE.Vector3(0, -250, -80)));
  else if (v === 'face') flyTo(Cc.clone().add(Zw.clone().multiplyScalar(720)), Cc.clone(), Yw.clone(), 40);
  else if (v === 'sky') flyTo(Cc.clone().add(new THREE.Vector3(500, 200, 2600)), Cc.clone().add(new THREE.Vector3(0, 900, -1200)), new THREE.Vector3(0, 1, 0), 62);
  else if (v === 'pole') { const p = Cc.clone().add(Zw.clone().multiplyScalar(-3)); flyTo(p, p.clone().add(Zw.clone().multiplyScalar(1000)), Yw.clone(), 15); q('#viewNoteT').textContent = '축 아래 구멍에서 정극환을 올려다본 모습: 바깥·안 고리 사이에 구진대성, 안 고리 안에 천추성이 보이면 축이 하늘의 북극을 가리킵니다.' }
  else if (v === 'cord') { cordView(true); q('#viewNoteT').textContent = '계형 끝 귀에서 노끈을 따라 본 모습: 노끈이 겨냥하는 별(밤)이나 해(낮)와 한 줄에 놓이면 계형이 맞은 것입니다.' }
  dirty = true;
}
function cordView(fly) {
  // 겨냥한 해·별의 반대쪽에서 정극환을 지나 그쪽을 바라봄: 노끈 평면이 해·별을 품으면 노끈과 해·별이 한 직선으로 보인다
  G.heng.updateMatrixWorld(true); const W = G.heng.matrixWorld;
  const body = enu2w(C.mode === 'day' ? C.sun.vApp : C.star.vApp).normalize();
  const J = new THREE.Vector3(0, 0, JG_Z).applyMatrix4(W);
  const eye = J.clone().sub(body.clone().multiplyScalar(1100));
  const tgt = J.clone().add(body.clone().multiplyScalar(400));
  if (fly) flyTo(eye, tgt, FR.Y.clone(), 46); else { camera.position.copy(eye); controls.target.copy(tgt); camera.up.copy(FR.Y); camera.lookAt(tgt) }
}
q('#viewBack').onclick = () => setView('whole');
qa('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));

// ── 부재 떼어 보기·반투명·조립 단계 ──
const mm = v => v.toFixed(1) + 'mm';
const STEPS = [
  { t: '대(臺): 평방석과 수평 잡기', d: `「용의 밑에는 대가 있는데 넓이 2척(${mm(DIM.daeW)}), 길이 3척2촌(${mm(DIM.daeL)})이며, 도랑(渠)과 못(池)을 만들어 수평을 잡는다.」 물은 어디서나 같은 높이로 고이므로, 도랑의 물이 가장자리 어디서나 똑같이 차도록 고이면 윗면이 수평입니다. 높이 89cm는 경복궁 아미산에 남은 일성정시의 평방석을 따랐습니다(가정). 북쪽의 둥근 못에는 자침을 띄워 남북을 대강 잡았다고 보기도 합니다(한국표준연구소 1989).` },
  { t: '반룡(蟠龍): 자루를 문 서린 용', d: `「아래에는 서린 용이 바퀴 자루를 무는데, 자루 두께는 1촌8분(${mm(DIM.handleT)})이고 용의 입에 1척1촌(${mm(DIM.handleIn)})이 들어가고 밖으로 3촌6분(${mm(DIM.handleOut)})이 나온다.」 용은 자루를 지평선에서 (90° − 위도)만큼, 한양에서는 약 52°23′ 기울여 뭅니다. 용의 생김새는 여주 세종대왕릉(영릉)의 복원품처럼, 비늘 덮인 굵은 몸통이 가는 심대를 S자로 감아 오르고 네 발로 움켜쥔 모습으로 만들었습니다(모양은 가정).` },
  { t: '바퀴(輪)·십자거·축·자루', d: `바퀴는 지름 2척(${mm(DIM.wheelD)}), 두께 4분(${mm(DIM.wheelT)}), 넓이 3촌(${mm(DIM.wheelW)}). 가운데 넓이 1촌5분(${mm(DIM.crossW)})의 십자거가 있고, 십자 가운데 축은 지름 2촌(${mm(DIM.axisD)}), 길이 5분반(${mm(DIM.axisL)})입니다. 「북쪽 면을 깎아 파되 가운데에 1리를 남겨 두께로 삼고, 가운데 둥근 구멍을 겨자씨같이 만든다. 축은 계형을 꿰고, 구멍은 별을 살피는 것이다.」` },
  { t: '주천도분환(周天度分環)', d: `바깥 고리. 실록은 지름 2척, 두께 3분, 넓이 8분이라 했고, 출토 유물은 외경 ${ARTI.ju.fo}mm, 앞면 내경 ${ARTI.ju.fi}mm, 두께 ${ARTI.ju.t}mm입니다. 365¼도를 새기고 1도를 4분으로 나누어 1,461분의 눈금이 있습니다. 눈금과 글자(初, 一十, 二十 …)는 시계 방향으로 나아가고 은으로 상감했습니다. 여의두문 귀 둘이 初度에서 좌우 91.3도에 있습니다.` },
  { t: '일구백각환(日晷百刻環)', d: `가운데 고리. 실록 지름 1척8촌4분, 유물 외경 ${ARTI.il.fo}mm·내경 ${ARTI.il.fi}mm. <b>돌지 않습니다</b>: 매 시 초의 초각 4분 자리에 리벳 구멍이 있어 바퀴에 못으로 고정했습니다. 뒷면 안팎에 홈이 있어 바깥·안쪽 고리의 턱을 물어 줍니다. 午正 글자는 자루 쪽에 있습니다.` },
  { t: '성구백각환(星晷百刻環)', d: `안쪽 고리. 실록 지름 1척6촌8분, 유물 외경 ${ARTI.sg.fo}mm·내경 ${ARTI.sg.fi}mm. 눈금은 일구백각환과 같지만 <b>돌아갑니다</b>. 귀 둘이 卯正과 酉正 자리에 있습니다.` },
  { t: '계형(界衡)', d: `세 고리 위의 막대, 길이 2척1촌(${mm(DIM.hengL)}), 넓이 3촌, 두께 5분. 「양쪽에 머리가 있고 가운데가 비었는데 길이 2촌2분(${mm(DIM.winL)}), 넓이 1촌8분(${mm(DIM.winW)})으로 세 고리의 그림(눈금)을 가리지 않게 한다.」 축에 꿰어 돌립니다. 붉은 세모는 이 앱에서 눈금을 읽는 머리를 표시한 것입니다.` },
  { t: '정극환을 받드는 두 용', d: '「허리 가운데 좌우에 용이 하나씩 있는데 길이 1척이고, 함께 정극환을 받든다.」 명(銘)에는 「쌍룡이 축을 끼고 정극환을 받들었다」고 했습니다. 그래서 정극환과 노끈은 계형과 함께 돕니다.' },
  { t: '정극환(定極環)', d: `바깥 고리 지름 2촌3분(${mm(DIM.jgOutD)})·넓이 3분, 안 고리 지름 1촌4분반(${mm(DIM.jgInD)})·넓이 4리(${DIM.jgInW.toFixed(2)}mm), 두께 2분. 「약간 서로 대여서 십자와 같다.」 축의 겨자씨 구멍에서 올려다보아 두 고리 사이에 구진대성, 안 고리 안에 천추성이 보이게 놓습니다.` },
  { t: '노끈 꿰기(삼각 실표)', d: '「계형 두 끝의 빈 곳 안팎에 작은 구멍이 있고, 정극환 바깥 고리 양쪽에도 작은 구멍이 있어, 가는 노끈으로 여섯 구멍을 꿰어 계형 두 끝에 맨다. 위로는 해와 별을 살피고 아래로는 시각을 살핀다.」 노끈은 창 가운데를 가로질러 눈금을 가리키는 바늘이 됩니다. 「일구(해)에는 두 줄을 쓰고 성구(별)에는 한 줄을 쓴다.」' },
];
const steplist = q('#stepList'); steplist.innerHTML = STEPS.map((s, i) => `<li data-s="${i}">${esc(s.t)}</li>`).join('');
qa('#stepList li').forEach(li => li.onclick = () => setStep(+li.dataset.s, true));
q('#sRange').max = STEPS.length - 1;
let stepPlay = null;
function setStep(k, anim) {
  const prev = S.step; S.step = Math.max(0, Math.min(STEPS.length - 1, k)); q('#sRange').value = S.step;
  q('#stepCard').innerHTML = `<h3>${S.step + 1}단계. ${esc(STEPS[S.step].t)}</h3><p>${STEPS[S.step].d}</p>`;
  qa('#stepList li').forEach((li, i) => { li.className = i === S.step ? 'on' : i < S.step ? 'done' : '' });
  applyVisibility();
  if (anim && S.step > prev) for (const p of PARTS) if (p.step > prev && p.step <= S.step) drop(p);
  dirty = true;
}
function upLocal(p) { const parent = p.obj.parent; if (parent === G.instr || parent.parent === G.instr) { const inv = new THREE.Matrix4().copy(G.instr.matrixWorld).invert(); return new THREE.Vector3(0, 1, 0).transformDirection(inv) } return new THREE.Vector3(0, 1, 0) }
function drop(p) { const up = upLocal(p); p.anim = { t0: performance.now(), dur: 700, from: up.multiplyScalar(420), to: new THREE.Vector3() } }
function applyVisibility() { const k = S.tab === 'make' ? S.step : 99; for (const p of PARTS) p.obj.visible = p.step <= k; dirty = true }
q('#sPrev').onclick = () => setStep(S.step - 1); q('#sNext').onclick = () => setStep(S.step + 1, true); q('#sRange').oninput = e => setStep(+e.target.value, true);
q('#sPlay').onclick = () => { clearInterval(stepPlay); setStep(0); stepPlay = setInterval(() => { if (S.step >= STEPS.length - 1 || S.tab !== 'make') { clearInterval(stepPlay); return } setStep(S.step + 1, true) }, 1300) };
const allMats = Object.values(MAT);
function applyGhost() { for (const m of allMats) { if (m === MAT.water) continue; m.transparent = S.ghost; m.opacity = S.ghost ? .35 : 1; m.depthWrite = !S.ghost; m.needsUpdate = true } dirty = true }
q('#ghostBtn').onclick = () => { S.ghost = !S.ghost; q('#ghostBtn').setAttribute('aria-pressed', String(S.ghost)); applyGhost() };
q('#moveBtn').onclick = () => { S.move = !S.move; q('#moveBtn').setAttribute('aria-pressed', String(S.move)) };
const EXPLODE = { dae: [0, -2], daeWater: [0, -2], dragon: [0, 0], wheel: [1, 0], axis: [1, 60], handle: [1, 0], ju: [1, 120], juEar: [1, 120], il: [1, 220], sg: [1, 320], sgEar: [1, 320], heng: [1, 440], jgDragon: [1, 440], jg: [1, 440], cord: [1, 440] };
q('#explodeBtn').onclick = () => {
  S.explode = !S.explode; q('#explodeBtn').textContent = S.explode ? '다시 모으기' : '모두 펼쳐 보기';
  for (const p of PARTS) { const e = EXPLODE[p.id]; if (!e) continue; let v; if (e[0] === 1) v = new THREE.Vector3(0, 0, S.explode ? e[1] : 0); else v = new THREE.Vector3(0, S.explode ? e[1] * 120 : 0, 0); p.rest = v; p.anim = { t0: performance.now(), dur: 800, from: p.obj.position.clone(), to: v.clone() } }
  if (S.explode && S.view !== 'whole') setView('whole');
};
// 끌기
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let drag = null, hover = null;
function pickAt(e) { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, camera); const ms = []; for (const p of PARTS) if (p.obj.visible) p.obj.traverse(o => { if (o.isMesh && o.visible) ms.push(o) }); const h = ray.intersectObjects(ms, false)[0]; return h ? { part: meshPart.get(h.object), point: h.point } : null }
canvas.addEventListener('pointerdown', e => {
  if (!(e.ctrlKey || e.metaKey || S.move) || !controls.enabled) return; const h = pickAt(e); if (!h || !h.part) return;
  e.preventDefault(); e.stopImmediatePropagation(); controls.enabled = false; canvas.setPointerCapture(e.pointerId);
  const n = camera.getWorldDirection(new THREE.Vector3()); drag = { part: h.part, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, h.point), p0: h.point.clone(), start: h.part.obj.position.clone() };
}, { capture: true });
canvas.addEventListener('pointermove', e => {
  if (drag) { const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, camera); const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(drag.plane, hit)) { const dW = hit.sub(drag.p0); const parent = drag.part.obj.parent; parent.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert(); const dL = dW.transformDirection(inv).multiplyScalar(dW.length()); drag.part.obj.position.copy(drag.start).add(dL) } dirty = true; return }
  if (e.buttons || e.pointerType !== 'mouse') return; const h = pickAt(e); const p = h && h.part; if (p !== hover) { hover = p; const c = q('#cap'); if (p) { c.textContent = p.name; c.hidden = false } else c.hidden = true }
});
canvas.addEventListener('pointerup', () => { if (!drag) return; const p = drag.part; p.anim = { t0: performance.now(), dur: 500, from: p.obj.position.clone(), to: p.rest.clone(), out: true }; drag = null; controls.enabled = !['pole', 'cord'].includes(S.view) });

// ── 시각 표시(오른쪽 위 도장) ──
function sealHTML(b) { return [...b.hanja].map(c => `<span>${c}</span>`).join('') }
function readingNow() {
  const th = hengAngle();
  if (C.mode === 'day') { const T = readDay(th); return { T, b: A.baekgak(T), ring: '일구백각환(해)', truth: C.sun.ast, kind: '진태양시' } }
  const T = readNight(th, C.rho); return { T, b: A.baekgak(T), ring: '성구백각환(별)', truth: C.sun.lmt, kind: '지방평균시' };
}
function updateSeal() {
  const hide = S.quiz && S.quiz.hideSeal !== false;
  q('#seal').hidden = !!hide; q('#quizBadge').hidden = !S.quiz;
  if (hide) return;
  const r = readingNow();
  if (C.mode === 'dusk') { q('#sealH').innerHTML = '<span>昏</span>'; q('#sealK').textContent = C.sun.altApp > -6 ? '해가 졌지만 별이 아직 안 보임' : '별이 보이기 시작함'; q('#sealT').textContent = `해 고도 ${C.sun.altApp.toFixed(1)}° · 성구환 ${r.b.hangul}` ; return }
  q('#sealH').innerHTML = sealHTML(r.b);
  q('#sealK').innerHTML = `${esc(r.b.hangul)} <span id="mode" class="${C.mode === 'night' ? 'night' : ''}">${C.mode === 'day' ? '낮' : '밤'}</span>`;
  q('#sealT').textContent = `${r.ring} · ${r.kind} ${A.hstr(r.T)}`;
}

// ── 패널 ──
function gakTable() {
  const rows = []; rows.push(...['', '초각', '1각', '2각', '3각', '4각'].map(t => `<div class="h">${t}</div>`));
  for (const [nm, st] of [['오초(午初)', 11], ['오정(午正)', 12]]) { rows.push(`<div class="h">${nm}</div>`); let m = 0; for (const len of [2.4, 14.4, 14.4, 14.4, 14.4]) { rows.push(`<div>${A.hstr(st + m / 60)}</div>`); m += len } }
  q('#gakTable').innerHTML = rows.join('');
}
gakTable();
function dayPanel() {
  const r = readingNow(), th = hengAngle(), err = A.wrap180(th - C.thSun);
  if (C.mode !== 'day') { q('#dayOut').innerHTML = `<div class="card"><h3>지금은 해가 떠 있지 않습니다</h3><p class="sub">해 고도 ${C.sun.altApp.toFixed(1)}°. 아래 「남중」 버튼이나 시간 막대로 낮 시각을 고르세요. 밤에는 「밤에 재기」 탭에서 별로 잽니다.</p></div>`; return }
  const T = readDay(th), b = A.baekgak(T);
  q('#dayOut').innerHTML = `<section class="card"><h3>일구백각환이 가리키는 시각</h3><div class="big"><span class="hj">${b.hanja}</span><span class="hg">${b.hangul}</span></div>
  <p class="sub">읽은 값 = 진태양시 ${A.hstr(T)} (자정부터 ${b.gakTotal.toFixed(1)}각). 실제 진태양시 ${A.hstr(C.sun.ast)}.</p>
  ${S.hengAuto ? '' : `<p><span class="okbadge ${Math.abs(err) < .4 ? 'ok' : 'no'}">${Math.abs(err) < .4 ? '계형이 해와 맞았습니다' : `해에서 ${Math.abs(err).toFixed(1)}° ${err > 0 ? '서쪽' : '동쪽'}으로 어긋남`}</span></p>`}
  ${S.design !== 'local' && Math.abs(S.lat - HANYANG) > .05 ? `<p class="warn">한양에 맞춘 기기를 위도 ${S.lat.toFixed(2)}°에 그대로 두었습니다. 축이 하늘의 북극에서 ${Math.abs(S.lat - HANYANG).toFixed(2)}° 벗어나 있어 읽은 값이 실제 진태양시와 ${(A.wrap180((T - C.sun.ast) * 15) * 4).toFixed(1)}분 다릅니다.</p>` : ''}</section>
  <section class="card grid2"><div><small>해 고도</small><b>${C.sun.altApp.toFixed(1)}°</b></div><div><small>해 방위(북 0°)</small><b>${C.sun.az.toFixed(1)}°</b></div>
  <div><small>해의 시간각</small><b>${C.sun.H.toFixed(2)}° (1시간 = 15°)</b></div><div><small>해가 비추는 면</small><b>${C.sunElev > 0 ? '바퀴 윗면(북쪽 면)' : '바퀴 아랫면(남쪽 면)'}</b></div>
  <div><small>해의 적위</small><b>${C.sun.dec.toFixed(2)}°</b></div><div><small>표준시</small><b>${A.hhmm(S.ms)}</b></div></section>`;
}
function nightPanel() {
  const th = hengAngle(), T = readNight(th, C.rho), b = A.baekgak(T), err = A.wrap180(th - C.thStar);
  const djp = A.parts(C.dj.term + A.KST), dDeg = C.d;
  const head = C.mode === 'day' ? `<div class="card"><h3>지금은 낮이라 별이 보이지 않습니다</h3><p class="sub">「한밤」 버튼을 누르거나 시간 막대로 밤 시각을 고르세요. 아래 값은 별이 보였다면 읽었을 값입니다.</p></div>` : C.mode === 'dusk' ? `<div class="card"><p class="warn">해가 진 지 얼마 안 되어(해 고도 ${C.sun.altApp.toFixed(1)}°) 별이 잘 보이지 않습니다.</p></div>` : '';
  q('#nightOut').innerHTML = head + `<section class="card"><h3>성구백각환이 가리키는 시각</h3><div class="big"><span class="hj">${b.hanja}</span><span class="hg">${b.hangul}</span></div>
  <p class="sub">읽은 값 ${A.hstr(T)} ↔ 실제 지방평균시 ${A.hstr(C.sun.lmt)} (차이 ${fmt1(A.wrap180((T - C.sun.lmt) * 15) * 4)}분), 진태양시 ${A.hstr(C.sun.ast)}.</p>
  ${S.hengAuto ? '' : `<p><span class="okbadge ${Math.abs(err) < .4 ? 'ok' : 'no'}">${Math.abs(err) < .4 ? '노끈이 제성과 한 줄입니다' : `제성에서 ${Math.abs(err).toFixed(1)}° 어긋남`}</span></p>`}</section>
  <section class="card"><h3>성구백각환 맞추기</h3><p>지난 동지: <b>${djp.y}년 ${djp.mo}월 ${djp.d}일</b>. 그날 자정에 제성이 있던 자리에 주천도분환의 初度를 맞추었습니다.</p>
  <p>오늘 밤은 동지 뒤 <b>${dDeg}일째</b> 밤이므로, 성구백각환의 子正을 주천도분환 <b>${dDeg}도</b>에 맞춥니다(하루 1도, 365¼일에 한 바퀴).</p>
  <p class="sub">별은 해보다 하루에 약 3분 56초(1도) 빨리 돌아옵니다. 1년이 지나면 꼭 한 바퀴를 앞서서 다시 제자리가 됩니다.</p></section>
  <section class="card grid2"><div><small>제성(帝星) 고도</small><b>${C.star.altApp.toFixed(1)}°</b></div><div><small>제성 방위</small><b>${C.star.az.toFixed(1)}°</b></div>
  <div><small>제성의 시간각</small><b>${C.star.H.toFixed(2)}°</b></div><div><small>북극에서 떨어진 각</small><b>${(90 - C.star.dec).toFixed(2)}°</b></div></section>`;
  // 1437과 지금의 두 별
  const ep2 = A.yearOf(S.ms), L = JG_Z, rows = [[POLARIS, '구진대성(勾陳大星)'], [TIANSHU, '천추성(天樞星)'], [KOCHAB, '제성(帝星)']].map(([s, nm]) => {
    const z1 = 90 - A.precess(s.ra, s.dec, 1437)[1], z2 = 90 - A.precess(s.ra, s.dec, ep2)[1];
    const zone = z => { const a = Math.atan; const ri0 = a((DIM.jgInD / 2 - DIM.jgInW) / L) * R2D, ri1 = a(DIM.jgInD / 2 / L) * R2D, ro0 = a((DIM.jgOutD / 2 - DIM.jgOutW) / L) * R2D, ro1 = a(DIM.jgOutD / 2 / L) * R2D; return z < ri0 ? '안 고리 안' : z < ri1 ? '안 고리에 가림' : z < ro0 ? '두 고리 사이' : z < ro1 ? '바깥 고리에 가림' : '정극환 밖' };
    return `<tr><td>${nm}</td><td>${z1.toFixed(2)}° · ${zone(z1)}</td><td>${z2.toFixed(2)}° · ${zone(z2)}</td></tr>` });
  q('#poleStars').innerHTML = `<table><thead><tr><th>별</th><th>1437년 북극에서</th><th>${Math.floor(ep2)}년 북극에서</th></tr></thead><tbody>${rows.join('')}</tbody></table><p class="sub">정극환은 축 아래 눈에서 ${L}mm 떨어져 있다고 보고(가정) 고리가 보이는 각을 계산했습니다: 안 고리 ${(Math.atan((DIM.jgInD / 2 - DIM.jgInW) / L) * R2D).toFixed(2)}°~${(Math.atan(DIM.jgInD / 2 / L) * R2D).toFixed(2)}°, 두 고리 사이 ~${(Math.atan((DIM.jgOutD / 2 - DIM.jgOutW) / L) * R2D).toFixed(2)}°.</p>`;
}
let charts = null;
function whyPanel() {
  const off = (S.lon - 135) * 4, ast = C.sun.ast, lmt = C.sun.lmt;
  q('#whyOut').innerHTML = `<section class="card"><h3>지금 이 자리</h3><div class="eq"><div><b>${A.hhmm(S.ms)}</b><small>표준시(시계)</small></div><div class="op">${fmt1(off)}분<small>경도 차이</small></div><div><b>${A.hstr(lmt)}</b><small>평균태양시 ≈ 성구환</small></div><div class="op">${fmt1(C.sun.eot)}분<small>균시차</small></div><div><b>${A.hstr(ast)}</b><small>진태양시 = 일구환</small></div></div>
  <p class="sub">${esc(S.place)}는 동경 ${S.lon.toFixed(3)}°라서 표준시 기준선(동경 135°)보다 해가 ${Math.abs(off).toFixed(1)}분 ${off < 0 ? '늦게' : '일찍'} 남중합니다.</p></section>`;
  if (!charts) {
    const y = A.parts(S.ms).y, days = [], months = []; for (let m = 0; m < 12; m++) months.push({ v: (A.kst(y, m + 1, 1) - A.kst(y, 1, 1)) / 864e5, l: (m + 1) + '월' });
    const eot = [], noonHere = [], noonSeoul = [];
    for (let i = 0; i < 366; i++) { const t = A.kst(y, 1, 1, 12) + i * 864e5; if (A.parts(t).y !== y) break; const s = A.sunAt(t, 0, 0); eot.push([i, s.eot]); const n1 = A.noonOf(t, S.lon), n2 = A.noonOf(t, GBG.lon); noonHere.push([i, (n1 - (t)) / 6e4]); noonSeoul.push([i, (n2 - t) / 6e4]) }
    charts = { y, eot: chart(q('#chEot'), { label: '균시차', xr: [0, eot.length - 1], yr: [-17, 18], yt: [-15, -10, -5, 0, 5, 10, 15], xt: months, ylabel: '분', series: [{ pts: eot, color: 'var(--jade)', w: 2.6 }] }),
      noon: chart(q('#chNoon'), { label: '남중 시각', xr: [0, eot.length - 1], yr: [0, 60], yt: [0, 10, 20, 30, 40, 50, 60], yfmt: v => '12:' + String(v).padStart(2, '0'), xt: months, legend: 1, series: [{ pts: noonHere, color: 'var(--vermil)', w: 2.6, name: '★ ' + S.place }, { pts: noonSeoul, color: 'var(--muted)', w: 1.4, dash: '4 3', name: '서울 경복궁' }] }) };
  }
  const di = (S.ms - A.kst(charts.y, 1, 1)) / 864e5; if (di >= 0 && di < 366) { charts.eot.mark(di, [[C.sun.eot, 'var(--jade)']]) }
}
function placePanel() {
  const dms = v => { const s = Math.round(Math.abs(v) * 3600); return `${Math.floor(s / 3600)}°${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}′${String(s % 60).padStart(2, '0')}″` };
  q('#placeChip').textContent = `${S.place} · 위도 ${S.lat.toFixed(2)}° · 경도 ${S.lon.toFixed(2)}°`;
  q('#placeName').textContent = S.place;
  q('#placeFacts').innerHTML = `<p>위도 <b>${S.lat.toFixed(4)}°</b>(${dms(S.lat)}) · 경도 <b>${S.lon.toFixed(4)}°</b></p><p>${S.design === 'local' ? `축을 지평선에서 <b>${S.lat.toFixed(2)}°</b> 들어 올려 이곳의 하늘 북극을 가리키게 했습니다. 바퀴(적도면)는 지평선과 ${(90 - S.lat).toFixed(2)}°를 이룹니다.` : `한양 북극고 「38도 소약」(주천도, 37°37′)에 맞춘 기기를 그대로 두었습니다. 축이 하늘의 북극에서 ${Math.abs(S.lat - HANYANG).toFixed(2)}° 벗어나 있습니다.`}</p><p>시계(동경 135°)보다 해가 <b>${Math.abs((S.lon - 135) * 4).toFixed(1)}분 ${S.lon < 135 ? '늦게' : '일찍'}</b> 남중합니다.</p>`;
  q('#plat').value = S.lat.toFixed(4); q('#plon').value = S.lon.toFixed(4);
  const list = [{ n: '★ ' + S.place, lat: S.lat, lon: S.lon, me: 1 }, ...PRESETS.filter(p => ['서울 경복궁', '부산', '강릉', '제주', '독도'].includes(p.n))];
  q('#compare').innerHTML = `<table><thead><tr><th>곳</th><th>지금 진태양시</th><th>남중 시각</th><th>제성 고도(지금)</th></tr></thead><tbody>${list.map(p => { const s = A.sunAt(S.ms, p.lat, p.lon), n = A.noonOf(A.dayStart(S.ms) + 12 * 36e5, p.lon), k = A.starAt(KOCHAB.ra, KOCHAB.dec, S.ms, p.lat, p.lon); return `<tr${p.me ? ' class="me"' : ''}><td>${esc(p.n)}</td><td>${A.hstr(s.ast)}</td><td>${A.hhmm(n)}</td><td>${k.altApp.toFixed(1)}°</td></tr>` }).join('')}</tbody></table>`;
  q('#compareDate').textContent = A.dstr(S.ms) + ' ' + A.hhmm(S.ms);
}
function updatePanels() {
  if (S.tab === 'day') dayPanel(); else if (S.tab === 'night') nightPanel(); else if (S.tab === 'why') whyPanel(); else if (S.tab === 'place') placePanel();
  syncHeng();
}
function syncHeng() {
  const th = hengAngle();
  for (const [a, r] of [['#hengAuto', '#hengAng'], ['#hengAuto2', '#hengAng2']]) { q(a).checked = S.hengAuto; q(r).disabled = S.hengAuto; if (S.hengAuto) q(r).value = A.wrap180(th) }
  q('#hengFb').textContent = q('#hengFb2').textContent = `계형 ${A.wrap180(th).toFixed(1)}°`;
}
for (const [a, r] of [['#hengAuto', '#hengAng'], ['#hengAuto2', '#hengAng2']]) {
  q(a).onchange = e => { S.hengAuto = e.target.checked; if (!S.hengAuto) S.hengManual = A.wrap180(hengAngle() + (Math.random() < .5 ? -1 : 1) * (25 + Math.random() * 40)); update() };
  q(r).oninput = e => { S.hengManual = +e.target.value; update() };
}
// 3D에서 계형 끌어 돌리기(손으로 맞추기일 때)
let hengDrag = null;
canvas.addEventListener('pointerdown', e => {
  if (S.hengAuto && !(S.quiz && S.quiz.manual) || e.ctrlKey || e.metaKey || S.move || !controls.enabled) return;
  const h = pickAt(e); if (!h || !h.part || !['heng', 'hengWire', 'jgDragon', 'jg', 'cord'].includes(h.part.id)) return;
  e.preventDefault(); e.stopImmediatePropagation(); controls.enabled = false; canvas.setPointerCapture(e.pointerId); hengDrag = true;
}, { capture: true });
canvas.addEventListener('pointermove', e => {
  if (!hengDrag) return; const r = canvas.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, camera);
  const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(FR.Z, FR.C.clone().add(FR.Z.clone().multiplyScalar(ZL.hengTop))); const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(pl, hit)) return;
  const v = hit.sub(FR.C); const x = v.dot(FR.X), y = v.dot(FR.Y); S.hengManual = Math.atan2(x, y) * R2D; update();
});
canvas.addEventListener('pointerup', () => { if (hengDrag) { hengDrag = null; controls.enabled = !['pole', 'cord'].includes(S.view) } });

// ── 탭 ──
function setTab(t) {
  S.tab = t; qa('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t))); qa('.tabpanel').forEach(p => p.hidden = p.id !== 'p-' + t);
  if (t !== 'quiz' && S.quiz) endQuiz();
  if (t === 'make') { setStep(S.step); if (!['whole', 'south', 'east'].includes(S.view)) setView('whole') }
  else { if (S.explode) q('#explodeBtn').click() }
  if (t === 'quiz') startQuiz();
  applyVisibility(); updatePanels();
}
qa('[role=tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
q('#oShadow').onchange = e => { S.shadow = e.target.checked; update() };
q('#oSunLine').onchange = e => { S.sunLine = e.target.checked; update() };
q('#oNames').onchange = e => { S.names = e.target.checked; dirty = true };
q('#oAster').onchange = e => { S.aster = e.target.checked; lastSkyKey = ''; update() };
qa('input[name=epoch]').forEach(r => r.onchange = () => { S.epoch = q('input[name=epoch]:checked').value; lastSkyKey = ''; update() });
qa('input[name=design]').forEach(r => r.onchange = () => { S.design = q('input[name=design]:checked').value; update(); setView(S.view === 'pole' || S.view === 'cord' ? S.view : S.view) });

// ── 시간 막대 ──
function syncTime() { const p = A.parts(S.ms); q('#tDate').value = `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; q('#tTime').value = p.h * 60 + p.mi; q('#tClock').textContent = A.hhmm(S.ms) }
function setTime(ms) { S.ms = ms; update() }
q('#tTime').oninput = e => setTime(A.dayStart(S.ms) + +e.target.value * 6e4);
q('#tDate').onchange = e => { const [y, m, d] = e.target.value.split('-').map(Number); if (!y) return; const p = A.parts(S.ms); setTime(A.kst(y, m, d, p.h, p.mi)) };
q('#bPrev').onclick = () => setTime(S.ms - 864e5); q('#bNext').onclick = () => setTime(S.ms + 864e5);
q('#bNow').onclick = () => setTime(Date.now());
q('#bNoon').onclick = () => setTime(A.noonOf(A.dayStart(S.ms) + 12 * 36e5, S.lon));
q('#bNight').onclick = () => { const n = A.noonOf(A.dayStart(S.ms) + 12 * 36e5, S.lon); setTime(n + 12 * 36e5) };
q('#bPlay').onclick = () => { S.playing = !S.playing; q('#bPlay').setAttribute('aria-pressed', String(S.playing)); q('#bPlay').textContent = S.playing ? '멈춤' : '재생' };
q('#speed').onchange = e => S.speed = +e.target.value;
{ const sel = q('#termGo'); sel.innerHTML = '<option value="">절기로 가기</option>' + A.TERM_K.map((k, i) => `<option value="${i}">${k}(${A.TERM_H[i]})</option>`).join(''); sel.onchange = () => { if (sel.value === '') return; const k = +sel.value, y = A.parts(S.ms).y, t = A.termTime(y, k), p = A.parts(S.ms); setTime(A.kst(...[A.parts(t).y, A.parts(t).mo, A.parts(t).d], p.h, p.mi)); sel.value = '' } }

// ── 위치 ──
const placeUI = initPlace(S, (lat, lon, name, focus) => { S.lat = lat; S.lon = lon; S.place = name || `위도 ${lat.toFixed(3)}°, 경도 ${lon.toFixed(3)}°`; placeUI && placeUI.pin(lat, lon); charts = null; lastSkyKey = ''; update(); if (focus) setView(S.view === 'pole' || S.view === 'cord' ? S.view : S.view) });

// ── 갱신 ──
function update() { C = compute(S.ms); applyScene(); syncTime(); updateSeal(); updatePanels(); if (['cord'].includes(S.view) && !camAnim.a) cordView(false) }

// ── 별 이름표 ──
const labelHost = q('#labels'); const LBL = [[POLARIS, '구진대성(북극성)'], [KOCHAB, '제성(帝·북극 제2성)'], [TIANSHU, '천추성(天樞)']].map(([s, t]) => { const d = document.createElement('div'); d.className = 'slabel'; d.textContent = t; labelHost.append(d); return { s, d } });
const poleLbl = (() => { const d = document.createElement('div'); d.className = 'slabel dim'; d.textContent = '＋ 하늘의 북극'; labelHost.append(d); return d })();
function updateLabels() {
  const vis = S.names && starMat.uniforms.uOp.value > .2; const r = canvas.getBoundingClientRect(); const ep = S.epoch === '1437' ? 1437 : A.yearOf(S.ms); const gast = A.sunEq(S.ms).gast;
  const place = (d, v) => { const w = new THREE.Vector3(v[0], v[2], -v[1]).multiplyScalar(SKY_R).add(camera.position); const p = w.project(camera); const ok = vis && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1; d.style.display = ok ? '' : 'none'; if (ok) { d.style.left = ((p.x + 1) / 2 * r.width) + 'px'; d.style.top = ((1 - p.y) / 2 * r.height) + 'px' } };
  for (const L of LBL) place(L.d, skyDir(A.precess(L.s.ra, L.s.dec, ep), gast, S.lat, S.lon));
  const pr = S.lat * D2R; place(poleLbl, [0, Math.cos(pr), Math.sin(pr)]);
}

// ── 문제 ──
const QS = buildQuestions();
function buildQuestions() {
  const G0 = GBG, list = [];
  const shuffle = (a, seed) => { const b = [...a]; let s = seed; for (let i = b.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b };
  const add = o => list.push({ ...o, opts: shuffle(o.opts.map((t, i) => ({ t, ok: i === 0 })), o.seed || 7) });
  // 1. 낮 읽기
  { const ms = A.kst(2026, 5, 15, 10, 50); const s = A.sunAt(ms, G0.lat, G0.lon), b = A.baekgak(s.ast); const o = (dt) => A.baekgak(s.ast + dt);
    add({ title: '해로 읽기: 어느 시(時)?', ms, view: 'face', prompt: '붉은 세모 쪽 계형 머리의 네모 창을 가로지르는 노끈이 가리키는 일구백각환(가운데 고리)의 눈금을 읽으세요. 몇 시인가요?', opts: [b.shiK + '(' + b.shi + ')', o(-2).shiK + '(' + o(-2).shi + ')', o(2).shiK + '(' + o(2).shi + ')', o(12).shiK + '(' + o(12).shi + ')'], explain: `계형의 노끈 평면이 해를 품으면 반대쪽 머리의 노끈은 진태양시 ${A.hstr(s.ast)}을 가리킵니다. 이 시각은 ${b.hangul}(${b.hanja})입니다. 한 시(時)는 지금의 2시간이고 子時는 밤 11시에 시작합니다.`, seed: 3 }) }
  // 2. 100각 셈
  add({ title: '1각은 몇 분?', ms: A.kst(2026, 5, 15, 10, 50), view: 'face', prompt: '세종 때는 하루를 100각으로 나누었습니다. 1각은 지금의 몇 분일까요?', opts: ['14분 24초', '15분', '12분', '10분'], explain: '하루 24시간 = 1,440분을 100으로 나누면 14.4분 = 14분 24초입니다. 효종 때(1654) 시헌력부터는 96각을 써서 1각 = 15분이 되었습니다.', seed: 5 });
  // 3. 계형 맞추기(손)
  { const ms = A.kst(2026, 6, 10, 15, 20); add({ title: '계형을 직접 맞춰 보기', ms, view: 'face', manual: true, prompt: '이번에는 계형이 해와 어긋나 있습니다. 「낮에 재기」의 원리대로 계형을 돌려(3D에서 계형을 끌거나 아래 막대를 움직여) 노끈 그림자가 창 속 노끈 위에 겹치게 하면, 붉은 세모 쪽 머리는 어느 시를 가리키나요?', opts: ['미시(未時)', '신시(申時)', '유시(酉時)', '오시(午時)'], explain: `이때 진태양시는 ${A.hstr(A.sunAt(ms, G0.lat, G0.lon).ast)}으로 未時(13~15시)입니다. 시계는 15시 20분이지만, 경복궁은 표준시 기준선(동경 135°)보다 서쪽이라 해로 잰 시각은 30분쯤 늦습니다. 해가 노끈 두 가닥이 이루는 면 안에 들면 두 노끈의 그림자가 계형 창 속 노끈 위에 한 줄로 겹칩니다(「일구에는 두 줄을 쓴다」).`, seed: 2 }) }
  // 4. 왜 성구환을 돌리나
  add({ title: '성구백각환을 돌리는 까닭', ms: A.kst(2026, 2, 20, 21, 30), view: 'face', prompt: '밤에 쓰는 성구백각환은 날마다 1도씩 옮겨 맞춥니다. 그 까닭으로 알맞은 것은?', opts: ['별은 해보다 하루에 약 1도(약 4분)씩 일찍 같은 자리에 돌아오기 때문에', '바퀴가 날마다 조금씩 녹슬어 미끄러지기 때문에', '달이 날마다 약 12도씩 움직이기 때문에', '자격루가 날마다 1각씩 늦어지기 때문에'], explain: '지구가 해 둘레를 1년에 한 바퀴 돌기 때문에 해는 별들 사이를 하루에 약 1도씩 동쪽으로 옮겨 갑니다. 그래서 같은 별이 같은 자리에 오는 시각이 날마다 약 4분씩 당겨집니다. 365¼일이 지나면 한 바퀴(365¼도)를 채워 제자리로 돌아오므로, 주천도분환을 365¼도로 나누고 하루에 1도씩 옮겼습니다.', seed: 4 });
  // 5. 며칠이면 몇 도
  add({ title: '동지 뒤 날수', ms: A.kst(2027, 1, 21, 22, 0), view: 'face', prompt: '동지(12월 22일) 뒤 30일째 밤입니다. 성구백각환의 子正은 주천도분환의 몇 도에 맞추어야 할까요?', opts: ['30도', '15도', '90도', '0도(그대로)'], explain: '하루에 주천도 1도씩 옮기므로 30일이면 30도입니다. 주천도 1도는 360° ÷ 365.25 ≈ 0.986°입니다.', seed: 6 });
  // 6. 밤 읽기
  { const ms = A.kst(2026, 10, 3, 21, 40); const s = A.sunAt(ms, G0.lat, G0.lon), b = A.baekgak(s.lmt); const o = dt => A.baekgak(s.lmt + dt);
    add({ title: '별로 읽기', ms, view: 'face', prompt: '밤입니다. 계형이 제성(帝星)을 겨누고 있습니다. 붉은 세모 쪽 머리 창에서 성구백각환(가장 안쪽 고리)이 가리키는 시는?', opts: [b.shiK + '(' + b.shi + ')', o(2).shiK + '(' + o(2).shi + ')', o(-2).shiK + '(' + o(-2).shi + ')', o(12).shiK + '(' + o(12).shi + ')'], explain: `성구백각환은 이날 밤에 맞게 옮겨 두었으므로 그대로 읽으면 지방평균시 ${A.hstr(s.lmt)} = ${b.hangul}입니다. 일구백각환(바깥에서 두 번째 고리)을 읽으면 틀립니다. 밤에는 해가 아니라 별을 겨누었기 때문입니다.`, seed: 8 }) }
  // 7. 정극환 속 별(1437)
  add({ title: '정극환 속의 별', ms: A.kst(1437, 5, 19, 22, 0), view: 'pole', epoch: '1437', prompt: '세종 때 하늘에서 정극환을 올려다본 모습입니다. 바깥 고리와 안 고리 사이에 보여야 하는 별은?', opts: ['구진대성(勾陳大星)', '천추성(天樞星)', '제성(帝星)', '북두칠성의 첫 별'], explain: '실록: 「바깥 고리와 안 고리 사이에 구진대성이 보이고, 안 고리 안에 천추성이 보인다.」 1437년에 구진대성은 북극에서 약 3.8°, 천추성은 약 3.5° 떨어져 있었습니다. 두 별의 차이가 0.25°밖에 안 되어 안 고리를 넓이 4리(약 0.8mm)로 아주 가늘게 만든 것으로 보입니다.', seed: 1 });
  // 8. 지금 하늘
  add({ title: '지금 하늘로 맞추면?', ms: A.kst(2026, 11, 20, 22, 0), view: 'pole', epoch: 'now', prompt: '같은 정극환으로 오늘날 하늘을 보았습니다. 구진대성(지금의 북극성)이 안 고리 안쪽, 북극 가까이에 보입니다. 왜 그럴까요?', opts: ['지구 자전축이 천천히 도는 세차운동으로 하늘의 북극이 옮겨 갔기 때문에', '북극성이 590년 동안 점점 밝아졌기 때문에', '정극환이 작게 만들어졌기 때문에', '서울의 위도가 바뀌었기 때문에'], explain: '지구 자전축은 약 26,000년 주기로 팽이처럼 돕니다(세차운동). 그래서 하늘의 북극이 별 사이를 천천히 옮겨 가, 1437년에 3.8° 떨어져 있던 북극성이 지금은 0.6°까지 가까워졌습니다. 실록도 「세월이 오래되면 하늘과 해의 차이가 생기므로」 다시 재야 한다고 적었습니다.', seed: 9 });
  // 9. 위도
  add({ title: '한양에 맞춘 기기를 제주에 두면', ms: A.kst(2026, 9, 1, 11, 0), view: 'south', place: { n: '제주', lat: 33.4996, lon: 126.5312 }, design: 'hanyang', prompt: '한양에 맞추어 만든 일성정시의를 제주에 그대로 두었습니다. 무엇이 문제일까요?', opts: ['축이 제주의 하늘 북극을 가리키지 못해 정극환 속 별이 제자리를 벗어나고 시각이 어긋난다', '제주는 해가 더 밝아서 그림자가 생기지 않는다', '제주에서는 별이 보이지 않는다', '아무 문제 없다'], explain: '축은 그곳의 위도만큼 들어 올려 하늘의 북극을 가리켜야 합니다. 한양(약 37.6°)에 맞춘 기기를 제주(약 33.5°)에 두면 축이 약 4° 높게 기울어 있습니다. 그래서 세종은 함길도·평안도에 보낸 기기를 그곳에서 정극환으로 다시 맞추어 쓰게 했을 것입니다(해석).', seed: 11 });
  // 10. 흐린 날
  add({ title: '흐린 날에는?', ms: A.kst(2026, 7, 10, 14, 0), view: 'whole', prompt: '비가 오는 날에는 일성정시의로 시각을 잴 수 없습니다. 이때 궁궐에서 시각을 알린 기구는?', opts: ['자격루(물시계)', '앙부일구(해시계)', '혼천의', '측우기'], explain: '일성정시의는 해나 별이 보여야 씁니다. 자격루는 날씨와 상관없이 물이 흐르는 양으로 시각을 알려 주었고, 일성정시의는 그 자격루의 시각을 바로잡는 기준이 되었습니다.', seed: 12 });
  return list;
}
let QZ = { i: 0, score: 0, done: {} };
const saved = {};
function startQuiz() { showQ(QZ.i) }
function showQ(i) {
  QZ.i = i; const Q = QS[i];
  if (!S.quiz) Object.assign(saved, { ms: S.ms, lat: S.lat, lon: S.lon, place: S.place, design: S.design, epoch: S.epoch, hengAuto: S.hengAuto });
  S.quiz = { manual: !!Q.manual, hideSeal: true };
  S.ms = Q.ms; const P = Q.place || GBG; S.lat = P.lat; S.lon = P.lon; S.place = P.n; S.design = Q.design || 'local'; S.epoch = Q.epoch || 'now'; S.playing = false; q('#bPlay').setAttribute('aria-pressed', 'false'); q('#bPlay').textContent = '재생';
  if (Q.manual) { S.hengAuto = false; S.hengManual = A.wrap180(compute(Q.ms).thSun + 48) } else S.hengAuto = true;
  q('#timebar').classList.add('locked'); lastSkyKey = ''; charts = null; update(); setView(Q.view || 'whole');
  const done = QZ.done[i];
  q('#quizBox').innerHTML = `<p class="qn">문제 ${i + 1} / ${QS.length} <span>맞힌 문제 ${QZ.score}</span></p><h3>${esc(Q.title)}</h3><p class="scene">${esc(P.n)}, ${A.dstr(Q.ms)} 시계 ${A.hhmm(Q.ms)}의 장면입니다.</p><p>${esc(Q.prompt)}</p>
  ${Q.manual ? `<div class="heng"><input type="range" id="qHeng" min="-180" max="180" step="0.1" value="${A.wrap180(S.hengManual)}" aria-label="계형 각도"></div>` : ''}
  <div class="opts">${Q.opts.map((o, k) => `<button type="button" data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div id="qfb" aria-live="polite"></div>
  <div class="qnav"><button type="button" id="qPrev" ${i ? '' : 'disabled'}>이전 문제</button><button type="button" id="qView">장면 다시 보기</button><button type="button" id="qNext" class="primary">${i < QS.length - 1 ? '다음 문제' : '결과 보기'}</button></div>`;
  if (Q.manual) q('#qHeng').oninput = e => { S.hengManual = +e.target.value; update() };
  qa('#quizBox .opts button').forEach(b => b.onclick = () => answer(+b.dataset.k));
  if (done != null) answer(done, true);
  q('#qPrev').onclick = () => showQ(i - 1); q('#qNext').onclick = () => i < QS.length - 1 ? showQ(i + 1) : result(); q('#qView').onclick = () => setView(Q.view || 'whole');
}
function answer(k, replay) {
  const Q = QS[QZ.i]; const ok = Q.opts[k].ok;
  if (!replay) { if (QZ.done[QZ.i] == null && ok) QZ.score++; QZ.done[QZ.i] = k }
  qa('#quizBox .opts button').forEach((b, j) => { b.disabled = true; if (Q.opts[j].ok) b.classList.add('right'); else if (j === k) b.classList.add('wrong') });
  q('#qfb').innerHTML = `<p class="${ok ? 'ok' : 'no'}">${ok ? '맞았습니다!' : '아쉬워요.'}</p><p>${esc(Q.explain)}</p>`;
  S.quiz.hideSeal = false; updateSeal(); q('.qn span').textContent = '맞힌 문제 ' + QZ.score;
}
function result() { q('#quizBox').innerHTML = `<h3>결과</h3><p class="big"><span class="hg">${QS.length}문제 가운데 ${QZ.score}문제를 맞혔습니다.</span></p><div class="qnav"><button type="button" class="primary" id="qAgain">처음부터 다시</button></div>`; q('#qAgain').onclick = () => { QZ = { i: 0, score: 0, done: {} }; showQ(0) } }
function endQuiz() { S.quiz = null; Object.assign(S, saved); q('#timebar').classList.remove('locked'); lastSkyKey = ''; charts = null; q(`input[name=design][value=${S.design}]`).checked = true; q(`input[name=epoch][value=${S.epoch}]`).checked = true; update() }

// ── 자료 탭 ──
q('#srcOut').innerHTML = `
<h3>모델의 기준</h3>
<p><b>세 환</b>(주천도분환·일구백각환·성구백각환)은 2021년 서울 인사동(공평 15·16지구)에서 출토된 세종 때 일성정시의 유물의 실측값(민병희 외 2023, 표 1)으로 만들었습니다. 앞면 너비 17.5mm, 두께 약 6mm이고, 가운데 일구백각환의 뒷면 홈에 바깥·안쪽 고리의 턱이 물려 돌아갑니다. 눈금 배치(바깥부터 분·각·반시진·시 글자의 4층, 주천도의 初·一十·二十 … 글자, 시계 방향, 은상감)와 귀의 자리도 유물을 따랐습니다.</p>
<p><b>나머지 부재</b>는 『세종실록』 77권 세종 19년(1437) 4월 15일 「일성정시의 서와 명」의 치수를 <b>주척 1척 = 20.7cm</b>로 환산했습니다(민병희 외 2023 표 2와 같음). 실록 국역의 「축 지름 2척」은 「2촌」의 잘못으로 보았습니다.</p>
<div class="tablewrap" id="dimTable2"></div>
<h3>원문에 없어 정한 값(가정값)</h3>
<ul class="src">
<li>대(臺)의 높이 89cm: 경복궁 아미산에 남은 일성정시의 평방석 높이(전상운 등 1984; 김상혁 박사논문 표 3-2). 도랑 너비·깊이와 못 지름 140mm, 못을 북쪽에 둔 배치는 한국표준연구소(1989) 복원을 참고한 가정입니다.</li>
<li>반룡: 영릉 복원품 영상(유튜브 「일성정시의」, 과학문화해설사 해설)을 보고, 비늘 덮인 굵은 몸통이 가는 심대를 감아 오르며 네 발로 움켜쥐고, 사슴뿔·갈기·수염이 있는 머리가 자루를 무는 모습으로 만들었습니다. 대 위로 자루 끝까지 높이 56cm와 세부 모양은 가정입니다. 「이곳 위도에 맞춤」에서는 용이 무는 자루의 기울기를 그곳 위도에 맞춘다고 보았습니다(한국표준연구소 1989).</li>
<li>자루 너비 41.4mm(2촌), 축 북쪽 면을 판 구멍 지름 30mm, 겨자씨 구멍 지름 1mm, 계형 가운데 구멍 10mm, 계형 뒷면의 축 홈(지름 42, 깊이 5: 한국표준연구소 1989).</li>
<li>두 용의 생김새와, 정극환 두 고리를 잇는 네 다리(「약간 서로 대여서 십자와 같다」).</li>
<li>겨자씨 구멍에서 정극환까지 ${ASSUME.eyeToJG}mm: 1437년 하늘에서 천추성(북극에서 3.52°)이 안 고리 안에, 구진대성(3.77°)이 두 고리 사이에 보이도록 정했습니다. 두 별의 극거리 차이가 0.25°뿐이어서 안 고리를 4리(0.8mm)로 아주 가늘게 만든 것으로 풀이했습니다(이 앱의 해석).</li>
<li>노끈: 정극환 바깥 고리 양쪽 구멍 → 계형 양 머리 창의 안쪽 구멍 → 창을 가로질러 바깥 구멍으로 꿴다고 보았습니다(민병희 외 2023의 「삼각 실표」 설명과 같음).</li>
<li>읽는 머리: 해·별을 향한 머리의 반대쪽(자루 쪽 午正과 같은 쪽) 창에서 읽습니다(민병희 외 2023: 자루에 가까운 뒷실의 계형 머리 창). 밤에도 같은 쪽에서 읽는다고 보았습니다.</li>
<li>성구백각환: 해마다 동짓날 자정에 제성 자리에 주천도분환 初度를 맞추고(민병희 외 2023), 날마다 주천도 1도씩 시계 방향으로 돌립니다. 4년 1진의 ¼도 보정은 해마다 실제 제성 자리로 다시 맞추는 것으로 대신했습니다. 그래서 읽은 값과 실제 평균시가 최대 2분쯤 다를 수 있습니다.</li>
<li>낮의 노끈 그림자: 해가 두 노끈과 축이 이루는 면에 들면 두 줄의 그림자가 창 속 노끈 위에 겹친다고 보았습니다(「일구에는 두 줄을 쓴다」).</li>
</ul>
<h3>천문 계산과 검증</h3>
<p>태양 위치는 앙부일구 3D 앱과 같은 식(Meeus 1998, NOAA 계산기 식 + 장동·대기 굴절)으로 계산합니다. 별은 d3-celestial(Hipparcos 바탕, 6등급까지)의 J2000 좌표를 IAU 1976 세차식으로 그 해의 위치로 옮깁니다(고유운동·광행차 제외). 1437년 제성의 극거리 13.55°, 구진대성 3.77°는 민병희 외(2023) 각주 37·38의 13.552°, 3.770°와 일치합니다.</p>
<h3>참고 자료</h3>
<ul class="src">
<li>『세종실록』 77권, 세종 19년 4월 15일 갑술 「일성정시의」 <a href="https://sillok.history.go.kr/id/kda_11904015_003" target="_blank" rel="noopener">조선왕조실록</a></li>
<li>민병희·김상혁·이용삼·김재은 (2023). 인사동 출토 일성정시의 세 환의 유물. 『고궁문화』 16, 국립고궁박물관, 7–39. <a href="https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE11788024" target="_blank" rel="noopener">DBpia</a></li>
<li>김상혁·민병희·이민수·이용삼 (2012). 조선 천체위치측정기기의 구조 혁신: 소간의, 일성정시의, 적도경위의를 중심으로. 『천문학논총』 27(3), 61–69.</li>
<li>김상혁. 『조선전기 천문관측기기와 역법의 구현』(박사학위논문) — 평방석 높이, 세 환의 눈금 해석</li>
<li>한국표준연구소 (1989). 『측정표준 사료 복원 Ⅳ: 일성정시의』(KSRI-89-10-IR) — 대·반룡·계형 창·정극환 복원안</li>
<li>국사편찬위원회 (2007). 『하늘, 시간, 땅에 대한 전통적 사색』</li>
<li>이준열·정서영·이창택 (2011). 일성정시의의 과학적 분석 및 현대적인 일성정시의의 개량에 관한 연구. 제57회 전국과학전람회</li>
<li>한국천문연구원 고천문연구그룹, 「세종시대의 천문의기와 복원 3」; 민병희 (2009) 「소간의 연구」</li>
<li>한국민족문화대백과사전 「일성정시의」; 우리역사넷 「주야 겸용의 별시계, 일성정시의」</li>
<li>Meeus J. (1998). <i>Astronomical Algorithms</i>; Lieske J. H. et al. (1977) IAU 1976 세차</li>
<li>별 자료: d3-celestial 0.7.35 (Olaf Frohn, BSD-3), 동양 별자리 선 constellations.lines.cn</li>
<li>한국교육시설안전원 「전국초중등학교위치표준데이터」(공공데이터포털, 기준일 2026-10-01); 통계청 2013 행정구역 경계(southkorea-maps); Leaflet 1.9.4, © OpenStreetMap 기여자</li>
</ul>`;
{
  const R = [['바퀴(輪) 지름·두께·넓이', '2척·4분·3촌', `${DIM.wheelD.toFixed(1)} · ${DIM.wheelT.toFixed(1)} · ${DIM.wheelW.toFixed(1)}`], ['십자거 넓이', '1촌5분', DIM.crossW], ['축 지름 · 길이', '2촌 · 5분반', `${DIM.axisD.toFixed(1)} · ${DIM.axisL.toFixed(1)}`], ['자루 두께', '1촌8분', DIM.handleT], ['자루: 용 입 속 · 밖', '1척1촌 · 3촌6분', `${DIM.handleIn.toFixed(1)} · ${DIM.handleOut.toFixed(1)}`], ['대(臺) 넓이 × 길이', '2척 × 3척2촌', `${DIM.daeW.toFixed(1)} × ${DIM.daeL.toFixed(1)}`],
    ['주천도분환 외경·두께·넓이', '2척·3분·8분', `${DIM.docJuD.toFixed(1)} · ${DIM.docRingT.toFixed(1)} · ${DIM.docRingW.toFixed(1)}`, `${ARTI.ju.fo} · ${ARTI.ju.t} · ${((ARTI.ju.fo - ARTI.ju.fi) / 2).toFixed(1)}`], ['일구백각환 외경', '1척8촌4분', DIM.docIlD, `${ARTI.il.fo} (내경 ${ARTI.il.fi})`], ['성구백각환 외경', '1척6촌8분', DIM.docSgD, `${ARTI.sg.fo} (내경 ${ARTI.sg.fi})`],
    ['계형 길이·넓이·두께', '2척1촌·3촌·5분', `${DIM.hengL.toFixed(1)} · ${DIM.hengW.toFixed(1)} · ${DIM.hengT.toFixed(1)}`], ['계형 머리 창', '2촌2분 × 1촌8분', `${DIM.winL.toFixed(1)} × ${DIM.winW.toFixed(1)}`], ['정극환 받드는 용', '1척', DIM.dragonL], ['정극환 바깥 고리 지름·넓이', '2촌3분·3분', `${DIM.jgOutD.toFixed(1)} · ${DIM.jgOutW.toFixed(1)}`], ['정극환 안 고리 지름·넓이', '1촌4분반·4리', `${DIM.jgInD.toFixed(1)} · ${DIM.jgInW.toFixed(2)}`], ['정극환 두께', '2분', DIM.jgT]];
  const html = `<table class="dimtab"><thead><tr><th>부재</th><th>실록</th><th>환산 mm</th><th>출토 유물 mm</th></tr></thead><tbody>${R.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${typeof r[2] === 'number' ? r[2].toFixed(1) : r[2]}</td><td>${r[3] || '—'}</td></tr>`).join('')}</tbody></table><p class="sub">세 환은 실록에서 지름이 2척 → 1척8촌4분 → 1척6촌8분이고 넓이가 모두 8분이어서, 바깥 고리의 안지름이 다음 고리의 바깥지름과 꼭 맞습니다(2척 − 2×8분 = 1척8촌4분). 2021년 출토 유물도 세 환이 틈 없이 맞물리며(외경 420 → 385 → 350mm, 앞면 너비 모두 17.5mm), 기록과 유물의 차이는 평균 0.91mm입니다(민병희 외 2023). 이 앱의 세 환은 유물 치수로 만들었습니다.</p>`;
  q('#dimTable').innerHTML = html; q('#dimTable2').innerHTML = html;
}

// ── 그리기 ──
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (S.playing && !S.quiz) { S.ms += dt * S.speed * 1000; update() }
  if (camAnim.a) { const a = camAnim.a, u = Math.min(1, (now - a.t0) / a.dur), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; camera.position.lerpVectors(a.p0, a.p1, e); controls.target.lerpVectors(a.t0v, a.t1, e); camera.up.lerpVectors(a.u0, a.u1, e).normalize(); camera.fov = a.f0 + (a.f1 - a.f0) * e; camera.updateProjectionMatrix(); camera.lookAt(controls.target); if (u >= 1) camAnim.a = null; dirty = true }
  for (const p of PARTS) if (p.anim) { const a = p.anim, u = Math.min(1, (now - a.t0) / a.dur), e = 1 - Math.pow(1 - u, 3); p.obj.position.lerpVectors(a.from, a.to, e); if (u >= 1) p.anim = null; dirty = true }
  if (controls.enabled) controls.update();
  else if (!camAnim.a) camera.lookAt(controls.target);
  sky.position.copy(camera.position); starMat.uniforms.uZ.value = Math.min(2.2, Math.max(1, Math.sqrt(40 / camera.fov)));
  if (dirty) { updateLabels(); renderer.render(scene, camera); dirty = false }
}
// 첫 화면
setTab('place'); setStep(9); update(); camera.position.set(1600, 1900, 2500); controls.target.copy(FR.C); setView('whole');
requestAnimationFrame(frame);
window.__S = S; window.__set = setTime; window.__closeup = (dx = 600, dz = 500) => { camAnim.a = null; const t = (window.__ct||new THREE.Vector3(0, ASSUME.stoneH + 300, 190)); camera.position.set(t.x + dx, t.y + 120, t.z + dz); camera.up.set(0, 1, 0); controls.target.copy(t); camera.fov = 40; camera.updateProjectionMatrix(); dirty = true }; window.__C = () => C; window.__camset = (pos, t) => { camAnim.a = null; camera.position.copy(pos); controls.target.copy(t); camera.up.set(0, 1, 0); camera.lookAt(t); dirty = true }; window.__FR = () => FR; window.__V3 = THREE.Vector3; window.__view = setView; window.__tab = setTab; window.__read = readingNow;
