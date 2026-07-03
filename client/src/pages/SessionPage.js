import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Mic, MicOff, Square, Brain, Send, Copy, ChevronLeft,
  Zap, Settings, StickyNote, Volume2, Eye, EyeOff,
  RefreshCw, Clock, MessageSquare, Shield, Star,
  List, Code2, Maximize2, Minimize2, AlertTriangle,
  Check, FileText, Globe, Key, ChevronDown, ChevronUp,
  Sparkles, X, BarChart2
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { endSession, setListening, setLiveQuestion, addAnswer, clearLiveSession } from '../store/slices/sessionsSlice';
import './SessionPage.css';

const API = process.env.REACT_APP_API_URL || "ai-assistant-sample.vercel.app" || '/api';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('shadow_token')}` });
const FILLER_WORDS = ['um','uh','like','you know','basically','literally','actually','right','sort of','kind of'];
const PROCESS_ALIASES = ['chrome_helper','spotify_service','system_updater','audio_daemon','net_monitor'];

/* ─── AI Model Definitions ──────────────────────────────────────────────── */
const AI_MODELS = [
  // OpenAI
  { id:'gpt-4o',        label:'GPT-4o',         provider:'openai',    badge:'Fastest',  color:'#10b981', keyEnv:'REACT_APP_OPENAI_KEY',   free:false },
  { id:'gpt-4',         label:'GPT-4',           provider:'openai',    badge:'Smart',    color:'#6366f1', keyEnv:'REACT_APP_OPENAI_KEY',   free:false },
  { id:'gpt-4o-mini',   label:'GPT-4o Mini',     provider:'openai',    badge:'Cheap',    color:'#22d3ee', keyEnv:'REACT_APP_OPENAI_KEY',   free:false },
  // Anthropic Claude
  { id:'claude-sonnet-4-6',label:'Claude Sonnet',provider:'anthropic', badge:'Best',     color:'#a855f7', keyEnv:'REACT_APP_ANTHROPIC_KEY',free:false },
  { id:'claude-haiku',  label:'Claude Haiku',    provider:'anthropic', badge:'Fast',     color:'#c084fc', keyEnv:'REACT_APP_ANTHROPIC_KEY',free:false },
  // Google Gemini
  { id:'gemini-2.5-flash',label:'Gemini 2.5 Flash',provider:'gemini', badge:'Free ✓',   color:'#fbbf24', keyEnv:'REACT_APP_GEMINI_KEY',   free:true  },
  { id:'gemini-2.0-flash',label:'Gemini 2.0 Flash',provider:'gemini', badge:'Free ✓',   color:'#f59e0b', keyEnv:'REACT_APP_GEMINI_KEY',   free:true  },
  { id:'gemini-1.5-pro',label:'Gemini 1.5 Pro',  provider:'gemini',   badge:'Free ✓',   color:'#fb923c', keyEnv:'REACT_APP_GEMINI_KEY',   free:true  },
];

const LS_KEYS = {
  openai:    'shadow_ai_openai_key',
  anthropic: 'shadow_ai_anthropic_key',
  gemini:    'shadow_ai_gemini_key',
};

const ENV_KEYS = {
  gemini:    process.env.REACT_APP_GEMINI_KEY    || '',
  anthropic: process.env.REACT_APP_ANTHROPIC_KEY || '',
  openai:    process.env.REACT_APP_OPENAI_KEY    || '',
};
const getKey = p => {
  try {
    return localStorage.getItem(LS_KEYS[p]) || ENV_KEYS[p] || '';
  } catch { return ENV_KEYS[p] || ''; }
};
const saveKey = (p, k) => { try { localStorage.setItem(LS_KEYS[p], k.trim()); } catch {} };

/* ─── Call each AI provider ─────────────────────────────────────────────── */
async function callAI({ modelId, provider, prompt, system, apiKey }) {
  if (!apiKey || !apiKey.trim()) throw new Error(`NO_KEY_${provider.toUpperCase()}`);

  // ── OpenAI ──────────────────────────────────────────────────────────────
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 700,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: prompt },
        ],
      }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.choices?.[0]?.message?.content || '';
  }

  // ── Anthropic Claude ─────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.content?.[0]?.text || '';
  }

  // ── Google Gemini ────────────────────────────────────────────────────────
  if (provider === 'gemini') {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      system_instruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: 700, temperature: 0.7 },
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  throw new Error('Unknown provider: ' + provider);
}

/* ─── Cheat Sheet renderer ──────────────────────────────────────────────── */
function CheatSheet({ content, mode }) {
  if (!content) return null;
  if (mode === 'bullets') {
    const lines = (content || '').split('\n').filter(l => l.trim());
    const bullets = lines.filter(l => l.match(/^[-•*]|^\d+\./));
    const display = bullets.length > 0 ? bullets : lines.slice(0, 8);
    return (
      <div className="cheatsheet-bullets">
        {display.map((l, i) => (
          <div key={i} className="cheatsheet-bullet">
            <span className="cheatsheet-dot" />
            <span>{l.replace(/^[-•*]\s*|\d+\.\s*/, '')}</span>
          </div>
        ))}
      </div>
    );
  }
  if (mode === 'code-only') {
    const m = (content || '').match(/```[\w]*\n?([\s\S]*?)```/);
    if (m) return <pre className="cheatsheet-code">{m[1]}</pre>;
    const codeLines = (content || '').split('\n').filter(l =>
      l.match(/^\s*(def |function |class |const |let |var |return |for |while |if |import |from )/)
    );
    if (codeLines.length > 0) return <pre className="cheatsheet-code">{codeLines.join('\n')}</pre>;
    return <p className="cheatsheet-no-code">No code block detected. Switch to Bullets mode.</p>;
  }
  return <pre className="cheatsheet-full">{content}</pre>;
}

/* ─── API Key Setup Panel ───────────────────────────────────────────────── */
function APIKeyPanel({ selectedModel, onClose }) {
  const model = AI_MODELS.find(m => m.id === selectedModel);
  const provider = model?.provider || 'gemini';
  const [key, setKey] = useState(getKey(provider));
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);

  const testAndSave = async () => {
    if (!key.trim()) { toast.error('Enter your API key'); return; }
    setTesting(true);
    try {
      const testPrompt = 'Reply with the single word: OK';
      await callAI({ modelId: selectedModel, provider, prompt: testPrompt, system: 'You are a test.', apiKey: key.trim() });
      saveKey(provider, key.trim());
      toast.success(`✅ ${provider.toUpperCase()} API key verified and saved!`);
      onClose();
    } catch (e) {
      toast.error(`Key test failed: ${e.message}`);
    } finally { setTesting(false); }
  };

  const providerInfo = {
    openai:    { name:'OpenAI',    url:'https://platform.openai.com/api-keys',       hint:'sk-...',       free:false },
    anthropic: { name:'Anthropic', url:'https://console.anthropic.com/settings/keys', hint:'sk-ant-...',   free:false },
    gemini:    { name:'Google',    url:'https://aistudio.google.com/apikey',          hint:'AIza...',      free:true  },
  };
  const info = providerInfo[provider];

  return (
    <div className="api-key-panel card">
      <div className="api-key-panel__header">
        <Key size={14} color="var(--accent-secondary)" />
        <span>{info?.name} API Key</span>
        {info?.free && <span className="api-key-panel__free-badge">Free Tier ✓</span>}
        <button className="api-key-panel__close" onClick={onClose}>×</button>
      </div>

      <div className="api-key-panel__body">
        {info?.free && (
          <div className="api-key-panel__free-note">
            <Check size={12} color="#6ee7b7" />
            Gemini has a generous free tier — 15 req/min, 1,000 req/day. No billing needed.
          </div>
        )}

        <div className="api-key-panel__get">
          <span>Get your key:</span>
          <a href={info?.url} target="_blank" rel="noreferrer" className="api-key-panel__link">
            {info?.url?.replace('https://', '')} →
          </a>
        </div>

        <div className="api-key-panel__input-row">
          <div className="api-key-panel__input-wrap">
            <input
              type={show ? 'text' : 'password'}
              className="input api-key-panel__input"
              placeholder={info?.hint}
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && testAndSave()}
              autoFocus
            />
            <button className="api-key-panel__eye" onClick={() => setShow(s => !s)}>
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <button className="btn-primary api-key-panel__save" onClick={testAndSave} disabled={testing}>
            {testing ? <RefreshCw size={13} className="spin-icon" /> : <Check size={13} />}
            {testing ? 'Testing...' : 'Save'}
          </button>
        </div>

        {getKey(provider) && (
          <div className="api-key-panel__saved">
            <Check size={12} color="#6ee7b7" />
            Key saved: {getKey(provider).slice(0, 8)}••••••••{getKey(provider).slice(-4)}
            <button className="api-key-panel__clear" onClick={() => { localStorage.removeItem(LS_KEYS[provider]); setKey(''); toast('Key removed'); }}>
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Model Switcher ────────────────────────────────────────────────────── */
function ModelSwitcher({ activeModelId, onSelect }) {
  const [open, setOpen] = useState(false);
  const active = AI_MODELS.find(m => m.id === activeModelId) || AI_MODELS[5];
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="model-switcher" ref={ref}>
      <button className="model-switcher__btn" onClick={() => setOpen(o => !o)}>
        <span className="model-switcher__dot" style={{ background: active.color }} />
        <span className="model-switcher__label">{active.label}</span>
        <span className="model-switcher__badge" style={{ background: active.color + '22', color: active.color }}>{active.badge}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="model-switcher__dropdown">
          {['openai','anthropic','gemini'].map(prov => {
            const models = AI_MODELS.filter(m => m.provider === prov);
            const provLabel = { openai:'OpenAI', anthropic:'Anthropic Claude', gemini:'Google Gemini' }[prov];
            const hasKey = !!getKey(prov);
            return (
              <div key={prov} className="model-switcher__group">
                <div className="model-switcher__group-label">
                  {provLabel}
                  {!hasKey && <span className="model-switcher__no-key">⚠ No key</span>}
                  {hasKey  && <span className="model-switcher__has-key">✓</span>}
                </div>
                {models.map(m => (
                  <button key={m.id}
                    className={`model-switcher__item ${activeModelId === m.id ? 'model-switcher__item--active' : ''}`}
                    style={activeModelId === m.id ? { borderColor: m.color, background: m.color + '18' } : {}}
                    onClick={() => { onSelect(m.id); setOpen(false); }}>
                    <span className="model-switcher__item-dot" style={{ background: m.color }} />
                    <span className="model-switcher__item-label">{m.label}</span>
                    <span className="model-switcher__item-badge" style={{ background: m.color + '22', color: m.color }}>{m.badge}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main SessionPage ──────────────────────────────────────────────────── */
export default function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isListening } = useSelector(s => s.sessions || {});
  const { user } = useSelector(s => s.auth || {});

  const [session,        setSession]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [manualQ,        setManualQ]        = useState('');
  const [generating,     setGenerating]     = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showKeyPanel,   setShowKeyPanel]   = useState(false);
  const [aiVisible,      setAiVisible]      = useState(true);
  const [elapsed,        setElapsed]        = useState(0);
  const [sessionEnded,   setSessionEnded]   = useState(false);
  const [aiNotes,        setAiNotes]        = useState(null);
  const [transcript,     setTranscript]     = useState('');
  const [interimText,    setInterimText]    = useState('');
  const [allAnswers,     setAllAnswers]     = useState([]);
  const [activeModelId,  setActiveModelId]  = useState('gemini-2.5-flash');
  const [cheatMode,      setCheatMode]      = useState('bullets');
  const [maskEnabled,    setMaskEnabled]    = useState(false);
  const [processAlias,   setProcessAlias]   = useState('chrome_helper');
  const [fillerCount,    setFillerCount]    = useState(0);
  const [paceWPM,        setPaceWPM]        = useState(0);
  const [expandedId,     setExpandedId]     = useState(null);
  const [extraContext,   setExtraContext]    = useState('');
  const [showCtxBox,     setShowCtxBox]     = useState(false);
  const [pendingQ,       setPendingQ]       = useState('');
  // Screen-share invisibility
  const [stealthMode,    setStealthMode]    = useState(false);

  const recRef        = useRef(null);
  const timerRef      = useRef(null);
  const wordCountRef  = useRef(0);
  const startTimeRef  = useRef(null);
  const answersEndRef = useRef(null);
  const qTimerRef     = useRef(null);

  // Active model definition
  const activeModel = useMemo(() => AI_MODELS.find(m => m.id === activeModelId) || AI_MODELS[5], [activeModelId]);

  /* ── Fetch session ── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/sessions/${id}`, { headers: H() });
        setSession(res.data.session);
        setActiveModelId(res.data.session?.aiModel || 'gemini-2.5-flash');
        setExtraContext(res.data.session?.extraContext || '');
      } catch { toast.error('Session not found'); navigate('/dashboard'); }
      finally { setLoading(false); }
    };
    load();
    return () => {
      stopRecognition();
      clearInterval(timerRef.current);
      clearTimeout(qTimerRef.current);
      dispatch(clearLiveSession());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── Timer ── */
  useEffect(() => {
    if (isListening && !sessionEnded) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isListening, sessionEnded]);

  /* ── Scroll to latest answer — use requestAnimationFrame to avoid ResizeObserver loop ── */
  useEffect(() => {
    if (allAnswers.length === 0) return;
    const raf = requestAnimationFrame(() => {
      answersEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(raf);
  }, [allAnswers]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ── Filler detection ── */
  const detectFillers = useCallback((text) => {
    const l = text.toLowerCase();
    const found = FILLER_WORDS.filter(fw => l.includes(` ${fw} `) || l.startsWith(`${fw} `));
    if (found.length > 0) setFillerCount(c => c + found.length);
  }, []);

  /* ── Speech recognition ── */
  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition needs Chrome or Edge.'); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    startTimeRef.current = Date.now(); wordCountRef.current = 0;
    let qBuffer = '';

    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const txt = e.results[i][0].transcript;
          setTranscript(t => t + txt + ' ');
          wordCountRef.current += txt.trim().split(/\s+/).length;
          detectFillers(txt);
          const secs = (Date.now() - startTimeRef.current) / 1000;
          if (secs > 3) setPaceWPM(Math.round((wordCountRef.current / secs) * 60));
          qBuffer += txt + ' ';
          clearTimeout(qTimerRef.current);
          qTimerRef.current = setTimeout(() => {
            const q = qBuffer.trim();
            if (q.length > 10 && user?.settings?.autoGenerateAnswers !== false) {
              dispatch(setLiveQuestion(q));
              qBuffer = '';
              generateAnswer(q, false);
            }
          }, 2500);
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setInterimText(interim);
    };

    rec.onerror = ev => {
      if (ev.error !== 'no-speech') { toast.error(`Mic error: ${ev.error}`); dispatch(setListening(false)); }
    };
    rec.onend = () => { if (isListening) { try { rec.start(); } catch (_) {} } };
    rec.start();
    recRef.current = rec;
    dispatch(setListening(true));
    toast.success('🎙️ Listening started');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isListening, user, detectFillers, activeModelId]);

  const stopRecognition = () => {
    try { recRef.current?.stop(); } catch (_) {}
    setInterimText('');
    dispatch(setListening(false));
  };

  const toggleListening = () => { if (isListening) stopRecognition(); else startRecognition(); };

  /* ── Generate answer with any AI model ── */
  const generateAnswer = useCallback(async (question, isManual = true) => {
    const q = (question || '').trim();
    if (!q) { if (isManual) toast.error('Enter or speak a question first'); return; }

    const apiKey = getKey(activeModel.provider);
    if (!apiKey) {
      toast.error(`No ${activeModel.provider.toUpperCase()} API key. Click the Key icon to add one.`, { duration: 5000 });
      setShowKeyPanel(true);
      return;
    }

    setGenerating(true);
    const ctx = [extraContext, session?.extraContext].filter(Boolean).join('\n');

    const systemPrompt = `You are Shadow AI — an elite, invisible, real-time interview assistant.
${ctx ? `\nContext about the candidate:\n${ctx}` : ''}
Rules:
- Answer interview questions concisely, confidently, and impressively
- For behavioral: use STAR method (Situation→Task→Action→Result)
- For technical: be precise, mention time/space complexity for algorithms
- For coding: provide clean code with brief explanation
- For system design: mention scalability, trade-offs, and key components
- ${cheatMode === 'bullets' ? 'Format as bullet points — max 6 bullets, each starting with a dash' : ''}
- ${cheatMode === 'code-only' ? 'Provide code solution in a code block, then 2-line explanation' : ''}
- Keep answers under 280 words. Be specific and impressive.`;

    try {
      const text = await callAI({
        modelId: activeModelId,
        provider: activeModel.provider,
        prompt: `Interview question: "${q}"`,
        system: systemPrompt,
        apiKey,
      });

      const newAns = {
        id: Date.now(), question: q, answer: text,
        model: activeModel.label, provider: activeModel.provider,
        color: activeModel.color, timestamp: new Date().toLocaleTimeString(),
        isManual,
      };
      setAllAnswers(prev => [...prev, newAns]);
      dispatch(addAnswer(newAns));
      if (isManual) setManualQ('');
    } catch (e) {
      if (e.message?.startsWith('NO_KEY_')) {
        toast.error(`Add your ${activeModel.provider.toUpperCase()} API key to use ${activeModel.label}`, { duration: 5000 });
        setShowKeyPanel(true);
      } else {
        toast.error(`AI error: ${e.message}`);
        // Fallback bullet answer
        const fallback = {
          id: Date.now(), question: q,
          answer: `• Approached this systematically by breaking the problem into components\n• Identified core requirements and edge cases upfront\n• Implemented a scalable solution using proven design patterns\n• Measured results: delivered on time with clear metrics\n• Collaborated cross-functionally and communicated progress transparently`,
          model: 'Fallback', provider: activeModel.provider, color: '#6b7280',
          timestamp: new Date().toLocaleTimeString(), isManual,
        };
        setAllAnswers(prev => [...prev, fallback]);
        if (isManual) setManualQ('');
      }
    } finally {
      setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModelId, activeModel, extraContext, session, cheatMode, dispatch]);

  /* ── End session + generate notes ── */
  const handleEndSession = async () => {
    stopRecognition();
    setSessionEnded(true);
    const apiKey = getKey(activeModel.provider);
    if (!apiKey) {
      setAiNotes({ summary: 'Session complete. Add an API key to generate AI notes.', keyPoints: [], actionItems: [] });
      return;
    }
    try {
      const qs = allAnswers.map(a => a.question).join('; ');
      const text = await callAI({
        modelId: activeModelId, provider: activeModel.provider,
        system: 'You generate structured interview session notes. Reply ONLY in valid JSON — no markdown fences.',
        prompt: `Generate notes for this interview session.\nQuestions: ${qs}\nReply in JSON: {"summary":"...","keyPoints":["..."],"actionItems":["..."]}`,
        apiKey,
      });
      let notes = { summary:'Session complete.', keyPoints:[], actionItems:[] };
      try { notes = JSON.parse(text.replace(/```json|```/g,'').trim()); } catch (_) {}
      setAiNotes(notes);
      try { await dispatch(endSession({ id, aiNotes: notes })); } catch (_) {}
      toast.success('✅ Session ended — AI notes generated!');
    } catch { setAiNotes({ summary:'Session complete.', keyPoints:[], actionItems:[] }); }
  };

  const copyAnswer = text => { navigator.clipboard.writeText(text || ''); toast.success('Copied!'); };

  if (loading) return (
    <div className="session-loading"><div className="spinner" /><p>Loading session…</p></div>
  );

  /* ════════════════════════════════════════════════════════
     STEALTH / SCREEN-SHARE INVISIBLE MODE
     Uses CSS `mix-blend-mode: difference` + translucent
     overlay that is invisible on shared screens but
     readable to the local user via the inverted blend.
  ════════════════════════════════════════════════════════ */
  if (stealthMode) return (
    <div className="stealth-overlay" onClick={() => setStealthMode(false)}>
      <div className="stealth-content" onClick={e => e.stopPropagation()}>
        <div className="stealth-header">
          <span className="stealth-badge"><Shield size={11} /> Stealth Mode — Invisible on Screen Share</span>
          <button className="stealth-exit" onClick={() => setStealthMode(false)}>Exit Stealth</button>
        </div>
        <div className="stealth-answers">
          {allAnswers.length === 0 ? (
            <div className="stealth-empty">
              <p>Speak or type a question to get AI answers here</p>
              <p style={{fontSize:11,marginTop:6}}>This panel is invisible to screen share viewers</p>
            </div>
          ) : (
            [...allAnswers].reverse().slice(0, 3).map(a => (
              <div key={a.id} className="stealth-answer">
                <div className="stealth-q">{a.question}</div>
                <div className="stealth-a"><CheatSheet content={a.answer} mode={cheatMode} /></div>
              </div>
            ))
          )}
          {generating && <div className="stealth-generating"><RefreshCw size={13} className="spin-icon" /> Generating…</div>}
        </div>
        <div className="stealth-input-row">
          <input className="stealth-input" placeholder="Type question here (Enter to ask)…"
            value={pendingQ} onChange={e => setPendingQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && pendingQ.trim()) { generateAnswer(pendingQ); setPendingQ(''); } }} />
          <button className="stealth-send" onClick={() => { if (pendingQ.trim()) { generateAnswer(pendingQ); setPendingQ(''); } }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════
     NORMAL MODE
  ════════════════════════════════════════════════════════ */
  return (
    <div className="session-page">

      {/* ── TOP BAR ── */}
      <div className="session-topbar">
        <button className="session-back" onClick={() => navigate('/dashboard')}>
          <ChevronLeft size={16} /> Dashboard
        </button>

        <div className="session-title">
          <Zap size={14} color="var(--accent-secondary)" fill="currentColor" />
          <span>{session?.title}</span>
          <span className="session-platform">{session?.platform}</span>
          {maskEnabled && <span className="session-mask-badge"><Shield size={9} /> {processAlias}</span>}
        </div>

        <div className="session-topbar-right">
          {/* Timer */}
          <div className="session-timer"><Clock size={12} />{fmt(elapsed)}</div>

          {/* Pace */}
          {paceWPM > 0 && (
            <div className="session-pace-badge" style={{ color: paceWPM > 170 ? '#f87171' : paceWPM > 0 ? '#6ee7b7' : 'var(--text-muted)' }}>
              {paceWPM} WPM
            </div>
          )}

          {/* Fillers */}
          {fillerCount > 0 && (
            <div className="session-filler-badge" title="Filler words detected">
              <AlertTriangle size={11} /> {fillerCount}
            </div>
          )}

          {/* Live status */}
          <div className={`session-status ${isListening ? 'session-status--live' : 'session-status--idle'}`}>
            {isListening ? <><span className="dot-green" /> Live</> : 'Idle'}
          </div>

          {/* Model switcher */}
          <ModelSwitcher activeModelId={activeModelId} onSelect={setActiveModelId} />

          {/* Key setup */}
          <button className="session-icon-btn" onClick={() => setShowKeyPanel(p => !p)} title="API Keys">
            <Key size={14} />
          </button>

          {/* Stealth */}
          <button className="session-icon-btn session-stealth-btn" onClick={() => setStealthMode(true)} title="Enable Stealth Mode (invisible on screen share)">
            <EyeOff size={14} />
          </button>

          {/* Toggle AI panel */}
          <button className="session-icon-btn" onClick={() => setAiVisible(v => !v)} title="Toggle AI panel">
            {aiVisible ? <Eye size={14} /> : <Eye size={14} style={{ opacity: 0.4 }} />}
          </button>

          {/* Settings */}
          <button className="session-icon-btn" onClick={() => setShowSettings(p => !p)}>
            <Settings size={14} />
          </button>

          {/* End */}
          {!sessionEnded && (
            <button className="session-end-btn" onClick={handleEndSession}>
              <Square size={11} fill="currentColor" /> End
            </button>
          )}
        </div>
      </div>

      {/* ── API KEY PANEL ── */}
      {showKeyPanel && (
        <div className="api-key-overlay">
          <APIKeyPanel selectedModel={activeModelId} onClose={() => setShowKeyPanel(false)} />
        </div>
      )}

      {/* ── BODY ── */}
      <div className="session-body">

        {/* ── LEFT PANEL ── */}
        <div className="session-left">

          {/* Mic */}
          {!sessionEnded && (
            <div className="session-mic-panel">
              <button className={`session-mic-btn ${isListening ? 'session-mic-btn--active' : ''}`} onClick={toggleListening}>
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <div className="session-mic-info">
                <div className="session-mic-status">{isListening ? '🎙️ Listening...' : '⏸️ Mic paused'}</div>
                <div className="session-mic-hint">
                  {isListening
                    ? 'Auto-detects questions after 2.5s silence'
                    : 'Click to start — questions auto-generate answers'
                  }
                </div>
                {fillerCount > 2 && (
                  <div className="session-filler-warn">
                    <AlertTriangle size={11} /> {fillerCount} filler words — slow down
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          {showSettings && (
            <div className="session-settings card">
              <h4>Session Settings</h4>
              <div className="ss-row">
                <label>Answer Format</label>
                <div className="ss-pills">
                  {[{m:'bullets',l:'Bullets'},{m:'full',l:'Full'},{m:'code-only',l:'Code'}].map(({m,l}) => (
                    <button key={m} className={`ss-pill ${cheatMode===m ? 'ss-pill--active' : ''}`}
                      onClick={() => setCheatMode(m)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="ss-row">
                <label><Shield size={11} /> Process Masking</label>
                <label className="settings-toggle">
                  <input type="checkbox" checked={maskEnabled} onChange={e => setMaskEnabled(e.target.checked)} />
                  <span className="settings-toggle__slider" />
                  <span>{maskEnabled ? 'On' : 'Off'}</span>
                </label>
              </div>
              {maskEnabled && (
                <div className="ss-row">
                  <label>Process Name</label>
                  <select className="input" style={{fontSize:12}} value={processAlias} onChange={e => setProcessAlias(e.target.value)}>
                    {PROCESS_ALIASES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              )}
              <div className="ss-row">
                <label><EyeOff size={11} /> Stealth Mode</label>
                <button className="btn-secondary" style={{fontSize:11,padding:'5px 12px'}} onClick={() => setStealthMode(true)}>
                  Activate
                </button>
              </div>
            </div>
          )}

          {/* Live transcript */}
          <div className="session-transcript card">
            <div className="session-transcript__header">
              <Volume2 size={12} /> Live Transcript
              {isListening && <span className="transcript-live-badge">LIVE</span>}
              {transcript && (
                <button className="transcript-clear-btn" onClick={() => setTranscript('')} title="Clear transcript">
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="session-transcript__body">
              {transcript
                ? <>{transcript}<span className="session-interim">{interimText}</span></>
                : <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>Transcript appears here as you speak…</span>
              }
            </div>
          </div>

          {/* Context injector */}
          {!sessionEnded && (
            <div className="session-context card">
              <button className="session-context__toggle" onClick={() => setShowCtxBox(v => !v)}>
                <FileText size={11} /> Context Injector
                {showCtxBox ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {showCtxBox && (
                <>
                  <textarea className="input" rows={3} style={{marginTop:8,fontSize:12,resize:'vertical'}}
                    placeholder="Paste job description, company notes, or your background for AI to reference…"
                    value={extraContext} onChange={e => setExtraContext(e.target.value)} />
                  <div style={{fontSize:10,color:'var(--text-muted)',marginTop:3}}>Used in all answers for this session</div>
                </>
              )}
            </div>
          )}

          {/* Manual question */}
          {!sessionEnded && (
            <div className="session-manual card">
              <div className="session-manual__header">
                <MessageSquare size={12} /> Manual Question
                <span style={{marginLeft:'auto',fontSize:10,color:'var(--text-muted)'}}>Ctrl+Enter</span>
              </div>
              <div className="session-manual__input-row">
                <textarea className="input session-manual__textarea" rows={2}
                  placeholder="Type any interview question for instant AI answer…"
                  value={manualQ} onChange={e => setManualQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generateAnswer(manualQ); }} />
                <button className="btn-primary session-manual__send"
                  onClick={() => generateAnswer(manualQ)} disabled={generating || !(manualQ||'').trim()}>
                  {generating ? <RefreshCw size={14} className="spin-icon" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Pacing coach */}
          {isListening && paceWPM > 0 && (
            <div className="session-pacing card">
              <div className="session-pacing__title"><BarChart2 size={12} /> Pacing Coach</div>
              <div className="session-pacing__bar-bg">
                <div className="session-pacing__bar-fill"
                  style={{ width:`${Math.min(100,(paceWPM/200)*100)}%`,
                    background: paceWPM > 170 ? '#ef4444' : paceWPM > 130 ? '#10b981' : '#3b82f6' }} />
              </div>
              <div className="session-pacing__meta">
                <span style={{fontWeight:700, color: paceWPM > 170 ? '#f87171' : '#6ee7b7'}}>{paceWPM} WPM</span>
                <span style={{color:'var(--text-muted)',fontSize:11}}>
                  {paceWPM > 170 ? '⚡ Too fast' : paceWPM > 130 ? '✓ Good pace' : '🐢 Too slow'} · Target 130–160
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL — AI Answers ── */}
        {aiVisible && (
          <div className="session-right">
            {/* Header row */}
            <div className="session-answers-header">
              <Brain size={14} color="var(--accent-secondary)" />
              <span>AI Answers</span>
              <div className="cheatsheet-mode-pills" style={{marginLeft:'auto'}}>
                {[{m:'bullets',icon:<List size={10}/>},{m:'full',icon:<Eye size={10}/>},{m:'code-only',icon:<Code2 size={10}/>}].map(({m,icon}) => (
                  <button key={m} className={`cheatsheet-pill ${cheatMode===m ? 'cheatsheet-pill--active' : ''}`}
                    onClick={() => setCheatMode(m)} title={m}>{icon}</button>
                ))}
              </div>
              <button className="session-icon-btn" style={{width:26,height:26}} onClick={() => setStealthMode(true)} title="Stealth mode">
                <EyeOff size={12} />
              </button>
            </div>

            {/* Keys status row */}
            <div className="session-keys-status">
              {['openai','anthropic','gemini'].map(p => (
                <div key={p} className={`session-key-chip ${getKey(p) ? 'session-key-chip--active' : ''}`}
                  onClick={() => { setShowKeyPanel(true); setActiveModelId(AI_MODELS.find(m => m.provider === p)?.id || activeModelId); }}>
                  {getKey(p) ? <Check size={10} /> : <Key size={10} />}
                  {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Claude' : 'Gemini'}
                </div>
              ))}
            </div>

            {/* AI notes after session ends */}
            {sessionEnded && aiNotes && (
              <div className="session-notes card">
                <div className="session-notes__header"><StickyNote size={14} /> AI Session Notes</div>
                <p className="session-notes__summary">{aiNotes.summary}</p>
                {aiNotes.keyPoints?.length > 0 && (<>
                  <div className="session-notes__label">Key Points</div>
                  <ul className="session-notes__list">{aiNotes.keyPoints.map((p,i) => <li key={i}>{p}</li>)}</ul>
                </>)}
                {aiNotes.actionItems?.length > 0 && (<>
                  <div className="session-notes__label">Action Items</div>
                  <ul className="session-notes__list session-notes__list--action">{aiNotes.actionItems.map((a,i) => <li key={i}>{a}</li>)}</ul>
                </>)}
              </div>
            )}

            {/* Answer list */}
            <div className="session-answers-list">
              {allAnswers.length === 0 ? (
                <div className="session-answers-empty">
                  <Brain size={36} color="var(--text-muted)" />
                  <p>AI answers appear here in real-time</p>
                  <div className="session-answers-tips">
                    <div><Mic size={11} /> Speak — questions auto-detected after 2.5s silence</div>
                    <div><MessageSquare size={11} /> Or type any question in the panel on the left</div>
                    <div><Code2 size={11} /> Switch to Code mode for coding questions</div>
                    <div><EyeOff size={11} /> Click stealth mode to hide from screen share</div>
                  </div>
                </div>
              ) : (
                allAnswers.map(a => (
                  <div key={a.id} className="answer-card card">
                    {/* Question */}
                    <div className="answer-card__q">
                      <span className="answer-card__q-label" style={{background: (a.color||'#7c3aed') + '25', color: a.color||'var(--accent-tertiary)'}}>Q</span>
                      <span>{a.question}</span>
                    </div>
                    {/* Answer body */}
                    <div className="answer-card__a">
                      {expandedId === a.id
                        ? <pre className="answer-card__text">{a.answer}</pre>
                        : <CheatSheet content={a.answer} mode={cheatMode} />
                      }
                    </div>
                    {/* Footer */}
                    <div className="answer-card__footer">
                      <span className="answer-card__time">{a.timestamp}</span>
                      <span className="answer-card__model" style={{background:(a.color||'#7c3aed')+'22', color:a.color||'var(--accent-tertiary)'}}>
                        {a.model}
                      </span>
                      <button className="answer-expand-btn"
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                        title={expandedId === a.id ? 'Collapse' : 'Expand full answer'}>
                        {expandedId === a.id ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
                      </button>
                      <button className="answer-card__copy" onClick={() => copyAnswer(a.answer)}>
                        <Copy size={11} /> Copy
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Generating indicator */}
              {generating && (
                <div className="answer-card answer-card--loading card">
                  <div className="answer-loading">
                    <span className="answer-loading__dot" style={{background: activeModel.color}} />
                    <span className="answer-loading__dot" style={{background: activeModel.color, animationDelay:'.15s'}} />
                    <span className="answer-loading__dot" style={{background: activeModel.color, animationDelay:'.3s'}} />
                    <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:4}}>
                      {activeModel.label} is thinking…
                    </span>
                  </div>
                </div>
              )}

              <div ref={answersEndRef} style={{height:1}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
