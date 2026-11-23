/* 겉틀(셸) v2: 학습 단계, 할 일, 설정 창, 도움말, 도장, 시간 막대 접기.
   두 앱 공통 파일입니다(앙부일구·일성정시의 저장소에 같은 내용). 앱별 차이는 아래 APPS 표에만 둡니다.
   계산·3D 번들은 건드리지 않고, 화면에서 일어난 일(버튼 누름, 문구 변화)만 지켜봅니다. */
(() => {
  'use strict';
  const VERSION = '2.0.0';
  const APPS = {
    ang: {
      title: '앙부일구 3D',
      steps: [
        { id: 'place', todo: '우리 학교나 사는 곳을 찾아 고르세요.', done: 'place' },
        { id: 'obs', todo: '「재생」을 눌러 그림자가 움직이는 모습을 보세요.', done: { click: '#bPlay' }, act: { label: '▶ 재생', click: '#bPlay' } },
        { id: 'read', todo: '아래쪽 「예시 장면」에서 하나를 골라, 그림자 끝이 가리키는 시각을 읽어 보세요.', done: { click: '[data-ex]' }, act: { label: '예시 장면으로 가기', scroll: '[data-ex]' } },
        { id: 'why', todo: '「남중」을 눌러 해시계의 정오가 시계로 몇 시인지 확인하세요.', done: { click: '#bNoon' }, act: { label: '남중으로 가기', click: '#bNoon' } },
        { id: 'quiz', todo: '문제를 끝까지 풀어 보세요.', done: 'quiz' }
      ],
      stamps: [
        { id: 'place', mark: '地', name: '자리 잡기', how: '위치를 고르기' },
        { id: 'play', mark: '影', name: '그림자 따라가기', how: '재생 누르기', on: { click: '#bPlay' } },
        { id: 'term', mark: '節', name: '절기 여행', how: '절기로 옮겨 가기', on: { change: '#termGo' } },
        { id: 'tour', mark: '周', name: '한 바퀴', how: '모든 단계 열어 보기' },
        { id: 'quiz1', mark: '正', name: '첫 정답', how: '문제 하나 맞히기' },
        { id: 'master', mark: '名', name: '해시계 명인', how: '문제 80% 이상 맞히기' }
      ],
      help: [
        ['3D 화면을 끌어서 돌려 보세요', '휠이나 두 손가락으로 확대합니다. 위쪽 「보는 방향」 버튼으로 한 번에 옮길 수도 있습니다.'],
        ['아래 시간 막대로 해를 움직이세요', '막대를 밀거나 「재생」을 누르면 그림자가 움직이고, 왼쪽 위 붉은 도장에 지금 읽히는 시각이 나옵니다.'],
        ['오른쪽 단계를 차례로 따라가세요', '단계마다 맨 위에 「이번 단계 할 일」이 있습니다. 글자 크기와 눈금 글자는 설정에서 바꿉니다.']
      ]
    },
    ilseong: {
      title: '일성정시의 3D',
      steps: [
        { id: 'place', todo: '우리 학교나 사는 곳을 찾아 고르세요.', done: 'place' },
        { id: 'make', todo: '「다음 ▶」을 눌러 일성정시의를 끝까지 조립해 보세요.', done: 'build' },
        { id: 'day', todo: '「재생」을 눌러 계형이 해를 따라 도는 모습을 보세요.', done: { click: '#bPlay' }, act: { label: '▶ 재생', click: '#bPlay' } },
        { id: 'night', todo: '「한밤」을 눌러 별로 시각을 재 보세요.', done: { click: '#bNight' }, act: { label: '한밤으로 가기', click: '#bNight' } },
        { id: 'why', todo: '절기를 바꿔 가며 시계와 얼마나 다른지 보세요.', done: { change: '#termGo' }, act: { label: '절기 고르기', focus: '#termGo' } },
        { id: 'quiz', todo: '문제를 끝까지 풀어 보세요.', done: 'quiz' }
      ],
      stamps: [
        { id: 'place', mark: '地', name: '자리 잡기', how: '위치를 고르기' },
        { id: 'build', mark: '作', name: '조립 완성', how: '끝까지 조립하기' },
        { id: 'play', mark: '日', name: '해 따라가기', how: '재생 누르기', on: { click: '#bPlay' } },
        { id: 'night', mark: '星', name: '별 보는 밤', how: '한밤으로 가기', on: { click: '#bNight' } },
        { id: 'quiz1', mark: '正', name: '첫 정답', how: '문제 하나 맞히기' },
        { id: 'master', mark: '官', name: '천문 관원', how: '문제 80% 이상 맞히기' }
      ],
      help: [
        ['3D 화면을 끌어서 돌려 보세요', '휠이나 두 손가락으로 확대합니다. 위쪽 「보는 방향」 버튼으로 한 번에 옮길 수도 있습니다.'],
        ['아래 시간 막대로 하늘을 움직이세요', '막대를 밀거나 「재생」을 누르면 해와 별이 움직이고, 왼쪽 위 붉은 도장에 지금 읽히는 시각이 나옵니다.'],
        ['오른쪽 단계를 차례로 따라가세요', '단계마다 맨 위에 「이번 단계 할 일」이 있습니다. 글자 크기와 테마는 설정에서 바꿉니다.']
      ]
    }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mainEl = $('main');
  const KEY = (mainEl && mainEl.dataset.app) || 'ang';
  const APP = APPS[KEY];
  if (!APP) return;
  const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; return e };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── 저장 (docs/03 5장). 저장이 막힌 환경에서는 메모리로만 동작 ── */
  const DEF_S = { theme: 'auto', textSize: 'normal', timebar: 'easy', sound: false, guide: true };
  const DEF_P = { visited: {}, done: {}, quizBest: 0, quizTotal: 0, quizRuns: 0, stamps: {}, seenGuide: false };
  const load = (name, def) => {
    const out = JSON.parse(JSON.stringify(def));
    try { const v = JSON.parse(localStorage.getItem(`${KEY}.${name}.v1`) || 'null'); if (v && typeof v === 'object') for (const k in def) if (typeof v[k] === typeof def[k] && v[k] !== null) out[k] = v[k] } catch { }
    return out;
  };
  const save = (name, v) => { try { localStorage.setItem(`${KEY}.${name}.v1`, JSON.stringify(v)) } catch { } };
  let S = load('settings', DEF_S), P = load('progress', DEF_P);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` };

  /* ── 설정 반영 ── */
  const root = document.documentElement;
  function applySettings() {
    if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = S.theme;
    root.dataset.text = S.textSize; root.dataset.timebar = S.timebar;
    const more = $('#tbMore'); if (more) { const full = S.timebar === 'full'; more.setAttribute('aria-expanded', String(full)); more.textContent = full ? '간단히' : '자세히' }
    $$('[data-sh-set]').forEach(b => { const [k, v] = b.dataset.shSet.split(':'); b.setAttribute('aria-pressed', String(String(S[k]) === v)) });
    const snd = $('#shSound'); if (snd) snd.checked = S.sound;
  }
  const setS = (k, v) => { S[k] = v; save('settings', S); applySettings() };

  /* ── 효과음 (기본 꺼짐) ── */
  let ac = null;
  function beep(seq) {
    if (!S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); let t = ac.currentTime + 0.01;
      for (const [f, d] of seq) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.03); t += d * 0.75 }
    } catch { }
  }
  const SND = { ok: [[660, .14], [880, .2]], no: [[220, .22]], stamp: [[784, .5]] };

  /* ── 알림 ── */
  const stage = $('#stage');
  const toastBox = el('div', { id: 'shToast', 'aria-live': 'polite' }); stage.appendChild(toastBox);
  function toast(html) { const t = el('div', { class: 'toast' }, html); toastBox.appendChild(t); setTimeout(() => t.remove(), 3200) }

  /* ── 학습 단계 ── */
  const tabs = $$('[role=tab]');
  const tabOf = id => tabs.find(t => t.dataset.tab === id);
  const stepIds = APP.steps.map(s => s.id);
  const labelOf = id => { const t = tabOf(id); return t ? (t.dataset.shLabel || t.textContent.trim()) : id };
  tabs.forEach(t => {
    const i = stepIds.indexOf(t.dataset.tab), label = t.textContent.trim(); t.dataset.shLabel = label;
    if (i >= 0) t.innerHTML = `<span class="sn" aria-hidden="true">${i + 1}</span><span class="sl">${esc(label)}</span>`;
    else t.classList.add('extra');
  });
  const tablist = $('aside [role=tablist]');
  const prog = el('div', { class: 'shprog', role: 'progressbar', 'aria-label': '학습 진행', 'aria-valuemin': '0', 'aria-valuemax': String(stepIds.length) }, '<i></i>');
  tablist.after(prog);
  const curTab = () => { const t = tabs.find(t => t.getAttribute('aria-selected') === 'true'); return t ? t.dataset.tab : stepIds[0] };
  const go = id => { const t = tabOf(id); if (t) t.click() };

  APP.steps.forEach((st, i) => {
    const panel = $('#p-' + st.id); if (!panel) return;
    const m = el('div', { class: 'mission', 'data-sh-m': st.id },
      `<span class="mk" aria-hidden="true"></span><div class="mb"><small>${i + 1}단계 · 이번 단계 할 일</small><p>${esc(st.todo)}</p><span class="mx"></span></div>`);
    if (st.act) { const b = el('button', { type: 'button', class: 'btn' }, esc(st.act.label)); b.onclick = () => { const a = st.act; if (a.click) { const x = $(a.click); x && x.click() } if (a.scroll) { const x = $(a.scroll); x && x.scrollIntoView({ block: 'center', behavior: 'smooth' }) } if (a.focus) { const x = $(a.focus); if (x) { root.dataset.timebar = S.timebar; x.focus(); x.showPicker && (() => { try { x.showPicker() } catch { } })() } } }; $('.mb', m).appendChild(b) }
    panel.prepend(m);
    const nav = el('nav', { class: 'stepnav', 'aria-label': '단계 이동' });
    if (i > 0) { const b = el('button', { type: 'button', class: 'btn' }, '← ' + esc(labelOf(stepIds[i - 1]))); b.onclick = () => go(stepIds[i - 1]); nav.appendChild(b) }
    if (i < stepIds.length - 1) { const b = el('button', { type: 'button', class: 'btn primary' }, `다음: ${esc(labelOf(stepIds[i + 1]))} →`); b.onclick = () => go(stepIds[i + 1]); nav.appendChild(b) }
    else { const b = el('button', { type: 'button', class: 'btn' }, '내 기록 보기'); b.onclick = () => openDrawer('#shRec'); b.classList.add('primary'); nav.appendChild(b) }
    panel.appendChild(nav);
  });

  function renderProgress() {
    let seen = 0;
    APP.steps.forEach(st => {
      const t = tabOf(st.id); if (!t) return; const v = !!P.visited[st.id], d = !!P.done[st.id];
      if (v) seen++;
      t.classList.toggle('visited', v); t.classList.toggle('done', d);
      const sn = $('.sn', t); if (sn) sn.textContent = d ? '✓' : String(stepIds.indexOf(st.id) + 1);
      t.title = d ? '할 일을 마친 단계' : v ? '열어 본 단계' : '';
      const m = $(`[data-sh-m="${st.id}"]`); if (m) { m.classList.toggle('ok', d); $('.mk', m).textContent = d ? '✓' : ''; if (st.id === 'quiz') $('.mx', m).innerHTML = P.quizRuns ? `<small>최고 점수 ${P.quizBest}/${P.quizTotal} · ${P.quizRuns}번 풀었습니다</small>` : '' }
    });
    $('i', prog).style.width = (100 * seen / stepIds.length) + '%'; prog.setAttribute('aria-valuenow', String(seen));
    renderRecord();
  }
  function visit(id) {
    if (!stepIds.includes(id) || P.visited[id]) return;
    P.visited[id] = true; save('progress', P);
    if (stepIds.every(s => P.visited[s])) award('tour');
    renderProgress();
  }
  function finish(id) { if (!stepIds.includes(id) || P.done[id]) return; P.done[id] = true; save('progress', P); renderProgress() }
  function award(id, quiet) {
    const st = APP.stamps.find(s => s.id === id); if (!st || P.stamps[id]) return;
    P.stamps[id] = today(); save('progress', P); renderRecord();
    if (!quiet) { toast(`<small>도장을 받았어요</small>${esc(st.name)}`); beep(SND.stamp) }
  }
  tablist.addEventListener('click', e => { const t = e.target.closest('[role=tab]'); if (!t) return; setTimeout(() => { visit(t.dataset.tab); t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const p = $('#p-' + t.dataset.tab); if (p) p.scrollTop = 0 }, 0) });

  /* ── 화면에서 일어난 일로 할 일·도장 판정 ── */
  const rules = [];
  APP.steps.forEach(st => { if (st.done && typeof st.done === 'object') for (const ev in st.done) rules.push({ ev, sel: st.done[ev], fn: () => finish(st.id) }) });
  APP.stamps.forEach(sp => { if (sp.on) for (const ev in sp.on) rules.push({ ev, sel: sp.on[ev], fn: () => award(sp.id) }) });
  ['click', 'change'].forEach(ev => document.addEventListener(ev, e => { if (!e.isTrusted && !e.target.closest) return; for (const r of rules) if (r.ev === ev && e.target.closest && e.target.closest(r.sel)) r.fn() }, true));

  // 위치: 제목 줄의 위치 표시가 바뀌면 고른 것으로 봅니다.
  const chip = $('#placeChip');
  if (chip) {
    let first = chip.textContent;
    new MutationObserver(() => { if (chip.textContent && chip.textContent !== first) { first = chip.textContent; finish('place'); award('place') } }).observe(chip, { childList: true, characterData: true, subtree: true });
    chip.setAttribute('role', 'button'); chip.tabIndex = 0; chip.title = '위치 바꾸기';
    const toPlace = () => go('place'); chip.addEventListener('click', toPlace); chip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toPlace() } });
  }
  // 조립(일성정시의): 조립 단계 막대가 끝에 닿으면 완성.
  const sRange = $('#sRange'), stepCard = $('#stepCard');
  if (sRange && stepCard) new MutationObserver(() => { if (curTab() === 'make' && +sRange.value >= +sRange.max && +sRange.max > 0) { finish('make'); award('build') } }).observe(stepCard, { childList: true, subtree: true, characterData: true });
  // 문제: 정답 문구와 결과 문구를 지켜봅니다.
  const quizBox = $('#quizBox');
  if (quizBox) {
    const seenFb = new WeakSet(); let answered = false;
    new MutationObserver(() => {
      const fb = $('#qfb p.ok, #qfb p.no', quizBox);
      if (fb && !seenFb.has(fb)) { seenFb.add(fb); answered = true; if (fb.classList.contains('ok')) { award('quiz1'); beep(SND.ok) } else beep(SND.no) }
      const h = $('h3', quizBox);
      if (h && /^결과/.test(h.textContent.trim()) && answered) {
        const m = quizBox.textContent.match(/(\d+)\s*문제\s*가운데\s*(\d+)\s*문제/);
        if (m) { answered = false; const total = +m[1], score = +m[2]; P.quizRuns++; if (score >= P.quizBest || P.quizTotal !== total) { P.quizBest = Math.max(score, P.quizTotal === total ? P.quizBest : 0); P.quizTotal = total } save('progress', P); finish('quiz'); if (total && score / total >= 0.8) award('master'); renderProgress() }
      }
    }).observe(quizBox, { childList: true, subtree: true });
  }

  /* ── 시간 막대 접기 ── */
  const more = $('#tbMore'); if (more) more.onclick = () => setS('timebar', S.timebar === 'full' ? 'easy' : 'full');

  /* ── 설정 창 ── */
  const ICON_SET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  const bSet = $('#shSet'), bHelp = $('#shHelp');
  if (bSet) bSet.innerHTML = ICON_SET + '<span class="t">설정</span>';
  const seg = (key, opts, label) => `<div class="shrow"><span>${label}</span><div class="seg" role="group" aria-label="${label}">${opts.map(([v, t]) => `<button type="button" data-sh-set="${key}:${v}">${t}</button>`).join('')}</div></div>`;
  const backdrop = el('div', { id: 'shBackdrop', hidden: '' });
  const drawer = el('div', { class: 'shd', id: 'shDrawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'shDrawerT', hidden: '' },
    `<header><h2 id="shDrawerT">설정</h2><button type="button" class="shx" data-sh-close aria-label="설정 닫기">✕</button></header>
     <div class="shbody">
       <h3>화면</h3>
       ${seg('theme', [['auto', '자동'], ['light', '밝게'], ['dark', '어둡게']], '테마')}
       ${seg('textSize', [['normal', '보통'], ['large', '크게']], '글자 크기')}
       ${seg('timebar', [['easy', '간단'], ['full', '자세히']], '시간 막대')}
       <label class="chk"><input type="checkbox" id="shSound"> 효과음 (정답·도장)</label>
       <h3>기기</h3><div id="shSlotDevice"></div>
       <h3>위치 자료</h3><div id="shSlotData"></div>
       <h3 id="shRec" tabindex="-1">내 기록</h3>
       <div class="shrec"><p id="shRecSum"></p><div class="stamps" id="shStamps"></div></div>
       <div class="chips"><button type="button" class="btn" id="shGuide">처음 안내 다시 보기</button><button type="button" class="btn" id="shSrc">자료·출처 보기</button><button type="button" class="btn" id="shReset">기록 지우기</button></div>
       <p class="shver">${esc(APP.title)} · 화면 ${VERSION} · 기록은 이 기기에만 저장됩니다.</p>
     </div>`);
  document.body.append(backdrop, drawer);
  // 본문에 미리 써 둔 설정용 조각을 설정 창으로 옮깁니다(요소를 옮겨도 번들이 건 동작은 그대로입니다).
  $$('[data-sh-slot]').forEach(n => { const to = $('#shSlot' + n.dataset.shSlot[0].toUpperCase() + n.dataset.shSlot.slice(1)); if (to) { to.appendChild(n); n.hidden = false } });
  ['Device', 'Data'].forEach(k => { const s = $('#shSlot' + k); if (s && !s.children.length) { s.previousElementSibling.remove(); s.remove() } });

  function renderRecord() {
    const sum = $('#shRecSum'); if (!sum) return;
    const seen = stepIds.filter(s => P.visited[s]).length, did = stepIds.filter(s => P.done[s]).length, got = APP.stamps.filter(s => P.stamps[s.id]).length;
    sum.innerHTML = `열어 본 단계 <b>${seen}/${stepIds.length}</b> · 마친 할 일 <b>${did}/${stepIds.length}</b> · 도장 <b>${got}/${APP.stamps.length}</b><br>문제 최고 점수 <b>${P.quizRuns ? `${P.quizBest}/${P.quizTotal}` : '아직 없음'}</b>${P.quizRuns ? ` (${P.quizRuns}번 풂)` : ''}`;
    $('#shStamps').innerHTML = APP.stamps.map(s => { const d = P.stamps[s.id]; return `<div class="stamp${d ? ' on' : ''}"><b aria-hidden="true">${s.mark}</b>${esc(s.name)}<small>${d ? esc(d) : esc(s.how)}</small></div>` }).join('');
  }

  let lastFocus = null, openEl = null;
  function openModal(node, focusSel) {
    closeModal(); lastFocus = document.activeElement; openEl = node; backdrop.hidden = false; node.hidden = false;
    const f = (focusSel && $(focusSel, node)) || $('[data-sh-close]', node) || node; f.focus({ preventScroll: false });
  }
  function closeModal() { if (!openEl) return; openEl.hidden = true; backdrop.hidden = true; openEl = null; if (lastFocus && lastFocus.focus) lastFocus.focus() }
  function openDrawer(focusSel) { renderRecord(); applySettings(); openModal(drawer, focusSel); if (focusSel) { const t = $(focusSel, drawer); t && t.scrollIntoView({ block: 'start' }) } }
  backdrop.onclick = closeModal;
  document.addEventListener('keydown', e => {
    if (!openEl) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return }
    if (e.key === 'Tab') { const f = $$('button,[href],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])', openEl).filter(x => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() } }
  });
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-sh-close]'); if (c) { closeModal(); return }
    const b = e.target.closest('[data-sh-set]'); if (b) { const [k, v] = b.dataset.shSet.split(':'); setS(k, v) }
  });
  if (bSet) bSet.onclick = () => openDrawer();
  $('#shSound').onchange = e => { setS('sound', e.target.checked); beep(SND.ok) };
  $('#shSrc').onclick = () => { closeModal(); go('src') };
  $('#shReset').onclick = () => { if (!confirm('단계 진행, 도장, 문제 점수를 모두 지울까요? 설정은 그대로 둡니다.')) return; const seen = P.seenGuide; P = JSON.parse(JSON.stringify(DEF_P)); P.seenGuide = seen; P.visited[curTab()] = stepIds.includes(curTab()); if (!P.visited[curTab()]) delete P.visited[curTab()]; save('progress', P); renderProgress() };

  /* ── 도움말(처음 안내) ── */
  const help = el('div', { class: 'shhelp', id: 'shHelpBox', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'shHelpT', hidden: '' },
    `<h2 id="shHelpT">${esc(APP.title)} 쓰는 법</h2><p>세 가지만 알면 됩니다.</p>
     <ol>${APP.help.map(([b, s], i) => `<li><i aria-hidden="true">${i + 1}</i><div><b>${esc(b)}</b><span>${esc(s)}</span></div></li>`).join('')}</ol>
     <div class="go"><button type="button" class="btn primary" data-sh-close>시작하기</button></div>`);
  document.body.appendChild(help);
  const openHelp = () => { openModal(help); if (!P.seenGuide) { P.seenGuide = true; save('progress', P) } };
  if (bHelp) bHelp.onclick = openHelp;
  $('#shGuide').onclick = openHelp;

  /* ── 시작 ── */
  applySettings();
  visit(curTab());
  renderProgress();
  if (S.guide && !P.seenGuide) setTimeout(openHelp, 400);
  window.__shell = { version: VERSION, app: KEY, get settings() { return S }, get progress() { return P } };
})();
