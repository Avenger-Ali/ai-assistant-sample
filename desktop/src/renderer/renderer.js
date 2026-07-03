/**
 * Shadow AI Desktop — Renderer Process
 * All UI logic: session lifecycle, mic/ASR, screen scan, AI calls,
 * file uploads, answer rendering with copy buttons, themes, stealth.
 */

/* ════════════════════════════════════════════════════════════
   STATE
════════════════════════════════════════════════════════════ */
const state = {
  serverUrl:        'http://localhost:5000',
  token:            null,
  sessionInfo:      null,
  activeModel:      'gemini',
  activeProvider:   'gemini',
  theme:            'dark',
  stealthOn:        true,
  isListening:      false,
  context:          '',
  uploadedFiles:    [],  // { name, size, content (text|dataUrl) }
  answers:          [],
  activeTab:        'answer',
  secondsLeft:      0,
  tickTimer:        null,
  recognizer:       null,
  transcript:       '',
  autoDetectTimer:  null,
  qBuffer:          '',
  fillerCount:      0,
  generating:       false,
};

const MODEL_COLORS = {
  gemini: { bg:'rgba(251,191,36,.12)', color:'#fbbf24' },
  claude: { bg:'rgba(168,85,247,.12)', color:'#a855f7' },
  openai: { bg:'rgba(16,185,129,.12)', color:'#10b981' },
};

/* ════════════════════════════════════════════════════════════
   DOM REFS
════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const views = {
  login:   $('view-login'),
  expired: $('view-expired'),
  main:    $('view-main'),
  mini:    $('view-mini'),
};

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
async function init() {
  state.serverUrl  = await window.shadowAI.server.url();
  state.theme      = (await window.shadowAI.store.get('theme')) || 'dark';
  state.context    = (await window.shadowAI.store.get('context')) || '';
  applyTheme(state.theme);
  if ($('context-input')) $('context-input').value = state.context;

  setupDrag();
  setupControls();
  setupTabs();
  setupMic();
  setupScan();
  setupFileUpload();
  setupSearch();
  setupContext();
  setupMainEvents();
  subscribeEvents();

  // Try to resume an existing session
  const status = await window.shadowAI.session.recheck();
  if (status.valid) {
    activateSession(status);
  } else {
    showView('login');
  }
}

/* ════════════════════════════════════════════════════════════
   VIEWS
════════════════════════════════════════════════════════════ */
function showView(name) {
  Object.values(views).forEach(v => v && v.classList.add('hidden'));
  if (views[name]) views[name].classList.remove('hidden');
}

/* ════════════════════════════════════════════════════════════
   SESSION
════════════════════════════════════════════════════════════ */
function activateSession(info) {
  state.sessionInfo    = info;
  state.secondsLeft    = info.secondsRemaining || 75 * 60;
  $('badge-plan').textContent  = info.isAdmin ? 'ADMIN' : (info.plan || 'PREMIUM').toUpperCase();
  $('badge-email').textContent = info.email || '';
  updateCountdown(state.secondsLeft);
  startLocalTick();
  showView('main');
}

function startLocalTick() {
  clearInterval(state.tickTimer);
  state.tickTimer = setInterval(() => {
    if (state.secondsLeft <= 0) {
      clearInterval(state.tickTimer);
      showView('expired');
      $('expired-reason').textContent = 'Your 75-minute desktop session has expired.';
      return;
    }
    state.secondsLeft--;
    updateCountdown(state.secondsLeft);
  }, 1000);
}

function updateCountdown(secs) {
  const el = $('countdown');
  if (!el) return;
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  el.textContent = m + ':' + s;
  if (secs < 5 * 60) el.classList.add('low');
  else el.classList.remove('low');
}

/* ════════════════════════════════════════════════════════════
   DRAG (custom, since frame=false)
════════════════════════════════════════════════════════════ */
function setupDrag() {
  const handle = document.querySelector('.drag-handle');
  if (!handle) return;
  let dragging = false, startX = 0, startY = 0;

  handle.addEventListener('mousedown', e => {
    if (e.target.closest('.drag-handle__controls')) return;
    dragging = true; startX = e.screenX; startY = e.screenY;
  });
  document.addEventListener('mousemove', async e => {
    if (!dragging) return;
    const pos = await window.shadowAI.window.getPos();
    if (!pos) return;
    const dx = e.screenX - startX, dy = e.screenY - startY;
    startX = e.screenX; startY = e.screenY;
    await window.shadowAI.window.drag(pos.x + dx, pos.y + dy);
  });
  document.addEventListener('mouseup', () => { dragging = false; });
}

/* ════════════════════════════════════════════════════════════
   CONTROLS (minimize, close, theme, stealth)
════════════════════════════════════════════════════════════ */
function setupControls() {
  $('btn-minimize')?.addEventListener('click', () => window.shadowAI.window.minimize());
  $('btn-close')?.addEventListener('click',    () => window.shadowAI.window.close());

  $('btn-theme')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    window.shadowAI.store.set('theme', state.theme);
  });

  $('btn-stealth')?.addEventListener('click', toggleStealth);
  $('chk-stealth')?.addEventListener('change', e => {
    state.stealthOn = e.target.checked;
    window.shadowAI.stealth.toggle(state.stealthOn);
    $('btn-stealth')?.classList.toggle('active', state.stealthOn);
  });

  $('btn-recheck')?.addEventListener('click',  recheckSession);
  $('btn-recheck2')?.addEventListener('click', recheckSession);
  $('btn-open-web')?.addEventListener('click', () => window.shadowAI.shell.open('http://localhost:3000'));
  $('btn-renew')?.addEventListener('click',    () => window.shadowAI.shell.open('http://localhost:3000/dashboard'));
  $('btn-end-session')?.addEventListener('click', async () => {
    await window.shadowAI.session.end();
    clearInterval(state.tickTimer);
    showView('login');
  });

  // Mini view — double-click to restore
  $('mini-icon')?.addEventListener('dblclick', () => window.shadowAI.window.restore());
  $('mini-restart')?.addEventListener('click',  () => window.shadowAI.window.restart());
}

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  if ($('btn-theme')) $('btn-theme').title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
}

function toggleStealth() {
  state.stealthOn = !state.stealthOn;
  window.shadowAI.stealth.toggle(state.stealthOn);
  if ($('btn-stealth')) $('btn-stealth').classList.toggle('active', state.stealthOn);
  if ($('chk-stealth')) $('chk-stealth').checked = state.stealthOn;
}

async function recheckSession() {
  if ($('login-status')) { $('login-status').textContent = 'Checking session…'; }

  // 1. Try existing token first
  let status = await window.shadowAI.session.recheck();
  if (status.valid) { activateSession(status); return; }

  // 2. If no valid session, check if the user is admin via the web JWT
  //    Admin users bypass the deep-link/premium flow entirely.
  const serverUrl = await window.shadowAI.server.url();
  const webToken  = await window.shadowAI.store.get('webToken');
  if (webToken) {
    try {
      const r = await fetch(serverUrl + '/api/desktop/admin-launch', {
        method:  'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + webToken },
      });
      if (r.ok) {
        const data = await r.json();
        await window.shadowAI.store.set('lastToken', data.token);
        status = await window.shadowAI.session.recheck();
        if (status.valid) { activateSession(status); return; }
      }
    } catch (_) { /* not an admin or server not running */ }
  }

  // 3. Show appropriate error
  const msg = {
    TOKEN_EXPIRED:           'Session expired — launch again from the dashboard.',
    SUBSCRIPTION_CANCELLED:  'Subscription cancelled.',
    NO_TOKEN:                'No session found — launch from the Shadow AI dashboard.',
    PREMIUM_REQUIRED:        'Premium subscription required.',
    NETWORK_ERROR:           'Cannot reach server — make sure it is running.',
  }[status.reason] || ('Session invalid: ' + (status.reason || 'unknown'));
  if ($('login-status')) { $('login-status').textContent = msg; }
  if ($('login-error'))  { $('login-error').textContent = msg; $('login-error').classList.remove('hidden'); }
}

/* ════════════════════════════════════════════════════════════
   TABS
════════════════════════════════════════════════════════════ */
function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('tab--active'));
      btn.classList.add('tab--active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      const panel = $('tab-' + tab);
      if (panel) panel.classList.remove('hidden');
      state.activeTab = tab;
    });
  });

  // Model pills
  document.querySelectorAll('.model-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.model-pill').forEach(b => b.classList.remove('model-pill--active'));
      btn.classList.add('model-pill--active');
      state.activeModel    = btn.dataset.model;
      state.activeProvider = btn.dataset.provider;
    });
  });
}

/* ════════════════════════════════════════════════════════════
   MICROPHONE / SPEECH RECOGNITION
════════════════════════════════════════════════════════════ */
function setupMic() {
  $('btn-mic')?.addEventListener('click', () => {
    if (state.isListening) stopMic();
    else startMic();
  });
  $('btn-ask')?.addEventListener('click', () => {
    const q = $('manual-question')?.value.trim();
    if (q) generateAnswer(q);
  });
  $('manual-question')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      const q = $('manual-question')?.value.trim();
      if (q) generateAnswer(q);
    }
  });
}

function startMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setMicStatus('Speech recognition requires Chrome or Edge.'); return;
  }
  const rec = new SpeechRecognition();
  rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
  state.qBuffer = '';

  rec.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        const txt = e.results[i][0].transcript;
        state.transcript += txt + ' ';
        const el = $('transcript-text');
        if (el) el.textContent = state.transcript;
        state.qBuffer += txt + ' ';
        clearTimeout(state.autoDetectTimer);
        state.autoDetectTimer = setTimeout(() => {
          const q = state.qBuffer.trim();
          if (q.length > 10) { state.qBuffer = ''; generateAnswer(q); }
        }, 2500);
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    const el = $('interim-text');
    if (el) el.textContent = interim;
  };

  rec.onerror = ev => {
    if (ev.error !== 'no-speech') { setMicStatus('Mic error: ' + ev.error); stopMic(); }
  };
  rec.onend = () => { if (state.isListening) { try { rec.start(); } catch(_) {} } };
  rec.start();
  state.recognizer   = rec;
  state.isListening  = true;
  $('btn-mic')?.classList.add('active');
  setMicStatus('🎙 Listening — auto-detecting questions…');
}

function stopMic() {
  try { state.recognizer?.stop(); } catch(_) {}
  state.isListening = false;
  state.recognizer  = null;
  $('btn-mic')?.classList.remove('active');
  setMicStatus('Mic off');
  const el = $('interim-text');
  if (el) el.textContent = '';
}

function setMicStatus(msg) { if ($('mic-status')) $('mic-status').textContent = msg; }

/* ════════════════════════════════════════════════════════════
   SCREEN SCAN
════════════════════════════════════════════════════════════ */
function setupScan() {
  $('btn-scan')?.addEventListener('click', scanScreen);
}

async function scanScreen() {
  const btn = $('btn-scan');
  const ss  = $('scan-status');
  btn?.classList.add('scanning');
  if (ss) { ss.textContent = 'Scanning screen…'; ss.classList.remove('hidden'); }

  try {
    const result = await window.shadowAI.screen.capture();
    if (!result.ok) {
      if (ss) ss.textContent = 'Scan failed: ' + result.error;
      btn?.classList.remove('scanning');
      return;
    }
    if (ss) ss.textContent = 'Analysing…';
    const b64 = result.dataUrl.split(',')[1] || result.dataUrl;
    await generateAnswer(
      'Look at this screenshot carefully. Identify any technical interview question, coding problem, or algorithm challenge visible on screen. Then provide a detailed, accurate answer or solution.',
      b64
    );
  } catch (e) {
    if (ss) ss.textContent = 'Scan error: ' + e.message;
  } finally {
    btn?.classList.remove('scanning');
    setTimeout(() => { if (ss) ss.classList.add('hidden'); }, 3000);
  }
}

/* ════════════════════════════════════════════════════════════
   FILE UPLOAD
════════════════════════════════════════════════════════════ */
function setupFileUpload() {
  const dz   = $('drop-zone');
  const inp  = $('file-input');
  if (!dz || !inp) return;

  dz.addEventListener('click', () => inp.click());
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', e => { e.preventDefault(); dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
  inp.addEventListener('change', () => handleFiles(inp.files));

  $('btn-file-ask')?.addEventListener('click', () => {
    const q = $('file-question')?.value.trim();
    if (q && state.uploadedFiles.length > 0) generateAnswerWithFiles(q);
  });
  $('file-question')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      const q = $('file-question')?.value.trim();
      if (q && state.uploadedFiles.length > 0) generateAnswerWithFiles(q);
    }
  });
}

function handleFiles(fileList) {
  Array.from(fileList).forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    const isImage = ['jpeg','jpg','png','img','gif','webp'].includes(ext);
    const reader  = new FileReader();
    if (isImage) {
      reader.onload = e => {
        state.uploadedFiles.push({ name:file.name, size:file.size, content:e.target.result, type:'image' });
        renderFileList(); showFileQuestion();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = e => {
        state.uploadedFiles.push({ name:file.name, size:file.size, content:e.target.result, type:'text' });
        renderFileList(); showFileQuestion();
      };
      reader.readAsText(file);
    }
  });
}

function renderFileList() {
  const el = $('file-list');
  if (!el) return;
  el.innerHTML = state.uploadedFiles.map((f,i) => `
    <div class="file-item">
      <span>${f.type==='image'?'🖼':'📄'}</span>
      <span class="file-item__name">${f.name}</span>
      <span class="file-item__size">${(f.size/1024).toFixed(1)}KB</span>
      <button class="file-item__remove" data-idx="${i}">×</button>
    </div>
  `).join('');
  el.querySelectorAll('.file-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.uploadedFiles.splice(Number(btn.dataset.idx), 1);
      renderFileList();
      if (state.uploadedFiles.length === 0) hideFileQuestion();
    });
  });
}

function showFileQuestion() {
  const r = $('file-question-row');
  if (r) { r.style.display = 'flex'; $('drop-zone').style.display = 'none'; }
}
function hideFileQuestion() {
  const r = $('file-question-row');
  if (r) { r.style.display = 'none'; $('drop-zone').style.display = 'flex'; }
}

async function generateAnswerWithFiles(question) {
  const file = state.uploadedFiles[0];
  if (file.type === 'image') {
    const b64 = file.content.split(',')[1] || file.content;
    await generateAnswer(question, b64);
  } else {
    const combinedContent = state.uploadedFiles.map(f => `[${f.name}]\n${f.content}`).join('\n\n---\n\n');
    await generateAnswer(question + '\n\nFile content:\n' + combinedContent.slice(0, 8000));
  }
}

/* ════════════════════════════════════════════════════════════
   SEARCH TAB
════════════════════════════════════════════════════════════ */
function setupSearch() {
  $('btn-search')?.addEventListener('click', () => {
    const q = $('search-input')?.value.trim();
    if (q) generateAnswerToPanel(q, $('search-results'));
  });
  $('search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const q = e.target.value.trim(); if (q) generateAnswerToPanel(q, $('search-results')); }
  });
}

async function generateAnswerToPanel(question, panel) {
  if (!panel) return;
  panel.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3)">Searching…</div>';
  const answer = await callAI(question, null);
  if (!answer) { panel.innerHTML = '<div style="padding:20px;text-align:center;color:#f87171">AI call failed</div>'; return; }
  panel.innerHTML = '';
  panel.appendChild(buildAnswerCard({ question, answer, timestamp: new Date().toLocaleTimeString() }));
}

/* ════════════════════════════════════════════════════════════
   CONTEXT TAB
════════════════════════════════════════════════════════════ */
function setupContext() {
  $('btn-save-ctx')?.addEventListener('click', () => {
    state.context = $('context-input')?.value || '';
    window.shadowAI.store.set('context', state.context);
    const saved = $('ctx-saved');
    if (saved) { saved.classList.remove('hidden'); setTimeout(() => saved.classList.add('hidden'), 2000); }
  });
}

/* ════════════════════════════════════════════════════════════
   MAIN EVENTS: shortcuts + session events from main process
════════════════════════════════════════════════════════════ */
function subscribeEvents() {
  window.shadowAI.on('session:active',   info   => activateSession(info));
  window.shadowAI.on('session:tick',     data   => { state.secondsLeft = data.secondsRemaining; updateCountdown(state.secondsLeft); });
  window.shadowAI.on('session:ended',    data   => { clearInterval(state.tickTimer); showView('expired'); const r=$('expired-reason'); if(r) r.textContent = reasonMsg(data.reason); });
  window.shadowAI.on('session:invalid',  data   => { showView('login'); const e=$('login-error'); if(e){e.textContent=reasonMsg(data.reason);e.classList.remove('hidden');} });
  window.shadowAI.on('window:minimized', ()     => showMini(false));
  window.shadowAI.on('window:restored',  ()     => hideMini());
  window.shadowAI.on('shortcut:scan',    ()     => { if (state.activeTab === 'answer') scanScreen(); });
  window.shadowAI.on('shortcut:mic',     ()     => { if (state.isListening) stopMic(); else startMic(); });
}

function setupMainEvents() {}

function reasonMsg(reason) {
  return { TOKEN_EXPIRED:'Session expired (75 min limit reached). Launch a new session from the dashboard.',
           REVOKED:'Session was revoked from the dashboard.',
           SUBSCRIPTION_CANCELLED:'Your subscription was cancelled.',
           MANUAL:'Session ended manually.',
           NETWORK_ERROR:'Server unreachable.',
         }[reason] || ('Session ended: ' + (reason||'unknown'));
}

/* ════════════════════════════════════════════════════════════
   MINI / CRASH STATE
════════════════════════════════════════════════════════════ */
function showMini(crashed) {
  document.querySelectorAll('.view, #view-login, #view-expired, #view-main').forEach(v => v.classList.add('hidden'));
  views.mini.classList.remove('hidden');
  if (crashed) $('mini-restart')?.classList.remove('hidden');
}
function hideMini() {
  views.mini.classList.add('hidden');
  // restore the correct view
  if (state.sessionInfo) showView('main');
  else showView('login');
}

/* ════════════════════════════════════════════════════════════
   AI CALLS (via /api/ai/generate on the server — never raw API keys)
════════════════════════════════════════════════════════════ */
async function callAI(prompt, imageBase64) {
  const token = await window.shadowAI.session.getToken();
  if (!token) { alert('No active session token — please re-launch from the dashboard.'); return null; }

  const systemPrompt = [
    'You are Shadow AI — an elite, invisible, real-time interview assistant.',
    state.context ? ('Context about the candidate:\n' + state.context) : '',
    'Rules:',
    '- For behavioral questions: use STAR method (Situation→Task→Action→Result)',
    '- For technical/algorithmic: be precise, include time and space complexity',
    '- For coding problems: provide clean, well-commented code with an explanation',
    '- For system design: mention scalability, trade-offs, and key architectural decisions',
    '- Format code in ```lang blocks',
    '- Keep answers focused and under 350 words unless the question requires more',
    '- Be specific, confident, and impressive',
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch(state.serverUrl + '/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + token },
      body: JSON.stringify({ provider:state.activeProvider, prompt, systemPrompt, imageBase64 }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message || data.error);
    return data.text || '';
  } catch (e) {
    console.error('AI call failed:', e.message);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════
   GENERATE ANSWER + ADD TO LIST
════════════════════════════════════════════════════════════ */
async function generateAnswer(question, imageBase64) {
  if (state.generating) return;
  state.generating = true;
  setGenerating(true);
  if ($('manual-question')) $('manual-question').value = '';

  const text = await callAI(question, imageBase64 || null);
  setGenerating(false);
  state.generating = false;

  if (!text) return;

  const card = buildAnswerCard({
    question: imageBase64 ? ('📸 Screen scan: ' + question.slice(0,80)+'…') : question,
    answer: text,
    timestamp: new Date().toLocaleTimeString(),
  });

  const list = $('answers-list');
  if (list) {
    const empty = list.querySelector('.answers-empty');
    if (empty) empty.remove();
    list.appendChild(card);
    requestAnimationFrame(() => card.scrollIntoView({ behavior:'smooth', block:'end' }));
  }
  state.answers.push({ question, answer:text });
}

function setGenerating(on) {
  const bar = $('generating-bar');
  if (!bar) return;
  if (on) {
    bar.classList.remove('hidden');
    const lbl = $('gen-model-label');
    if (lbl) lbl.textContent = { gemini:'Gemini thinking…', claude:'Claude thinking…', openai:'ChatGPT thinking…' }[state.activeModel] || 'Generating…';
  } else {
    bar.classList.add('hidden');
  }
}

/* ════════════════════════════════════════════════════════════
   BUILD ANSWER CARD DOM
   Each code block gets a COPY button above AND below it.
   The full card also has a COPY ALL button in the footer.
════════════════════════════════════════════════════════════ */
function buildAnswerCard({ question, answer, timestamp }) {
  const card = document.createElement('div');
  card.className = 'answer-card';

  // Question row
  const qRow = document.createElement('div');
  qRow.className = 'answer-card__q';
  const badge = document.createElement('div'); badge.className = 'answer-card__q-badge'; badge.textContent = 'Q';
  const qText = document.createElement('div'); qText.className = 'answer-card__q-text'; qText.textContent = question;
  qRow.append(badge, qText);
  card.appendChild(qRow);

  // Parse answer: split on ``` fences
  const segments = parseAnswer(answer);
  segments.forEach(seg => {
    if (seg.type === 'code') {
      // Copy button ABOVE the code block
      card.appendChild(makeCopyBar(seg.content, false));
      const pre = document.createElement('pre');
      pre.className = 'answer-code-block';
      pre.textContent = seg.content;
      const bodyDiv = document.createElement('div'); bodyDiv.className = 'answer-card__body'; bodyDiv.appendChild(pre);
      card.appendChild(bodyDiv);
      // Copy button BELOW the code block
      card.appendChild(makeCopyBar(seg.content, true));
    } else {
      const bodyDiv = document.createElement('div'); bodyDiv.className = 'answer-card__body';
      const p = document.createElement('div'); p.className = 'answer-body-text'; p.textContent = seg.content;
      bodyDiv.appendChild(p); card.appendChild(bodyDiv);
    }
  });

  // Footer with model badge + copy ALL
  const footer = document.createElement('div'); footer.className = 'answer-card__footer';
  const timeEl = document.createElement('span'); timeEl.className = 'answer-card__time'; timeEl.textContent = timestamp;
  const modelEl = document.createElement('span');
  modelEl.className = 'answer-card__model';
  const mc = MODEL_COLORS[state.activeModel] || {};
  modelEl.style.background = mc.bg || 'rgba(124,58,237,.12)';
  modelEl.style.color = mc.color || '#a855f7';
  modelEl.textContent = { gemini:'Gemini', claude:'Claude', openai:'ChatGPT' }[state.activeModel] || state.activeModel;
  const copyAllBtn = makeCopyButton(answer, 'Copy All');
  copyAllBtn.style.marginLeft = 'auto';
  footer.append(timeEl, modelEl, copyAllBtn);
  card.appendChild(footer);

  return card;
}

function parseAnswer(text) {
  const segments = [];
  const fenceRe = /```(?:\w+)?\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = fenceRe.exec(text)) !== null) {
    if (m.index > last) segments.push({ type:'text', content: text.slice(last, m.index).trim() });
    segments.push({ type:'code', content: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type:'text', content: text.slice(last).trim() });
  return segments.filter(s => s.content);
}

function makeCopyBar(content, isBottom) {
  const bar = document.createElement('div');
  bar.className = 'copy-bar' + (isBottom ? ' copy-bar--bottom' : '');
  bar.appendChild(makeCopyButton(content, isBottom ? '⎘ Copy' : '⎘ Copy'));
  return bar;
}

function makeCopyButton(content, label) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ${label}`;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(content).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied'; btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
    });
  });
  return btn;
}

/* ════════════════════════════════════════════════════════════
   KICK OFF
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
