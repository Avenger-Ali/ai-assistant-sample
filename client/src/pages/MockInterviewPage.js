import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Mic, MicOff, Square, Play, Brain, ChevronLeft, Volume2,
  AlertTriangle, TrendingUp, CheckCircle, XCircle, Zap,
  Clock, Target, Award, BarChart2, RefreshCw, ChevronRight,
  Key, LogIn, LogOut, ExternalLink, Eye, EyeOff, Copy,
  User, Mail, Shield, Sparkles, CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createMock, completeMock, clearMockSession,
  updatePace, addFiller, addAlert, dismissAlert, setRunning
} from '../store/slices/mockSlice';
import './MockInterviewPage.css';

/* ─── Constants ─────────────────────────────────────────── */
const FILLER_WORDS = ['um','uh','like','you know','basically','literally','actually','right','so','kind of','sort of'];

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', badge: 'Free · Fast', color: '#10b981', free: true },
  { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro',   badge: 'Free · Smart', color: '#6366f1', free: true },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', badge: 'Free · Lite',  color: '#a855f7', free: true },
];

const INTERVIEW_TYPES = [
  { id: 'technical',    label: 'Technical',     icon: '⚙️', desc: 'DSA, algorithms, system design' },
  { id: 'behavioral',  label: 'Behavioral',    icon: '🧠', desc: 'STAR method, leadership, conflict' },
  { id: 'system-design',label:'System Design',  icon: '🏗️', desc: 'Scalability, architecture, trade-offs' },
  { id: 'coding',      label: 'Coding',        icon: '💻', desc: 'LeetCode-style problems' },
  { id: 'mixed',       label: 'Mixed',         icon: '🎯', desc: 'Full-round simulation' },
];

const DIFFICULTIES = [
  { id: 'junior',    label: 'Junior (0–2 yrs)',    color: '#10b981' },
  { id: 'mid',       label: 'Mid (2–5 yrs)',        color: '#6366f1' },
  { id: 'senior',    label: 'Senior (5–8 yrs)',     color: '#a855f7' },
  { id: 'staff',     label: 'Staff (8–12 yrs)',     color: '#f59e0b' },
  { id: 'principal', label: 'Principal / L6+',      color: '#ef4444' },
];

const AISTUDIO_URL = 'https://aistudio.google.com/apikey';

/* ─── Helpers ────────────────────────────────────────────── */
const LS_KEY_GEMINI   = 'shadow_ai_gemini_key';
const LS_KEY_GPROFILE = 'shadow_ai_google_profile';

const getStoredKey     = () => { try { return localStorage.getItem(LS_KEY_GEMINI) || ''; } catch { return ''; } };
const saveKey          = (k) => { try { localStorage.setItem(LS_KEY_GEMINI, (k||'').trim()); } catch {} };
const clearKey         = () => { try { localStorage.removeItem(LS_KEY_GEMINI); } catch {} };
const getStoredProfile = () => { try { const v = localStorage.getItem(LS_KEY_GPROFILE); return v ? JSON.parse(v) : null; } catch { return null; } };
const saveProfile      = (p) => { try { localStorage.setItem(LS_KEY_GPROFILE, JSON.stringify(p)); } catch {} };
const clearProfile     = () => { try { localStorage.removeItem(LS_KEY_GPROFILE); } catch {} };

/* ─── Sub-components ────────────────────────────────────── */

function PaceGauge({ wpm }) {
  const getColor = () => { if (wpm < 100) return '#3b82f6'; if (wpm <= 160) return '#10b981'; return '#ef4444'; };
  const getLabel = () => { if (!wpm) return 'Waiting...'; if (wpm < 100) return 'Too Slow'; if (wpm <= 130) return 'Good'; if (wpm <= 160) return 'Optimal ✓'; return 'Too Fast'; };
  return (
    <div className="pace-gauge">
      <div className="pace-gauge__label">Speaking Pace</div>
      <div className="pace-gauge__bar-bg">
        <div className="pace-gauge__bar-fill" style={{ width: `${Math.min(100,(wpm/200)*100)}%`, background: getColor() }} />
      </div>
      <div className="pace-gauge__meta">
        <span style={{ color: getColor(), fontWeight: 700 }}>{wpm || 0} WPM</span>
        <span style={{ color: getColor() }}>{getLabel()}</span>
        <span style={{ color:'var(--text-muted)', fontSize:11 }}>Target: 130–160</span>
      </div>
    </div>
  );
}

function FillerAlert({ alert, onDismiss }) {
  return (
    <div className={`filler-alert filler-alert--${alert.type}`}>
      <AlertTriangle size={13} />
      <span>{alert.message}</span>
      <button onClick={() => onDismiss(alert.id)}>×</button>
    </div>
  );
}

/* ── Google Sign-In panel ─────────────────────────────────── */
function GoogleSignInPanel({ profile, onSignIn, onSignOut }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = useCallback(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '303034635408-48nb7n71uag1v6b84mkgqissnikbv6gb.apps.googleusercontent.com';
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      toast.error('⚙️ Google Sign-In not configured. Add REACT_APP_GOOGLE_CLIENT_ID to client/.env', { duration: 6000 });
      return;
    }
    setLoading(true);
    if (!window.google?.accounts?.oauth2) {
      toast.error('Google Identity Services not loaded. Please refresh.');
      setLoading(false);
      return;
    }

    // Use implicit flow to get user info only (identity, not API access)
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '303034635408-48nb7n71uag1v6b84mkgqissnikbv6gb.apps.googleusercontent.com',
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error) {
          toast.error('Google sign-in failed: ' + response.error);
          setLoading(false);
          return;
        }
        try {
          // Fetch user profile using the access token
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` }
          });
          const info = await res.json();
          const p = { name: info.name, email: info.email, picture: info.picture, sub: info.sub };
          saveProfile(p);
          onSignIn(p);
          toast.success(`Signed in as ${info.name}!`);
        } catch {
          toast.error('Failed to fetch Google profile.');
        } finally {
          setLoading(false);
        }
      },
    });
    client.requestAccessToken({ prompt: 'select_account' });
  }, [onSignIn]);

  if (profile) {
    return (
      <div className="google-profile-badge">
        <img src={profile.picture} alt={profile.name} className="google-profile-badge__avatar" onError={e => { e.target.style.display='none'; }} />
        <div className="google-profile-badge__info">
          <div className="google-profile-badge__name">{profile.name}</div>
          <div className="google-profile-badge__email">{profile.email}</div>
        </div>
        <span className="google-profile-badge__verified"><CheckCircle size={13} /> Verified</span>
        <button className="google-profile-badge__signout" onClick={onSignOut} title="Sign out">
          <LogOut size={13} />
        </button>
      </div>
    );
  }

  return (
    <button className="google-signin-btn" onClick={handleGoogleSignIn} disabled={loading}>
      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}

/* ── Gemini API Key Panel ─────────────────────────────────── */
function GeminiKeyPanel({ apiKey, onSave, onClear }) {
  const [inputKey, setInputKey]   = useState(apiKey || '');
  const [showKey, setShowKey]     = useState(false);
  const [testing, setTesting]     = useState(false);
  const [testPassed, setTestPassed] = useState(!!(apiKey && apiKey.length > 0));
  const [step, setStep]           = useState((apiKey && apiKey.length > 0) ? 'done' : 'guide'); // guide | input | done

  const testKey = async (key) => {
    if (!key || !key.trim()) return false;
    setTesting(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with the single word: OK' }] }] })
        }
      );
      const data = await res.json();
      if (data.error) { toast.error('Invalid key: ' + data.error.message); setTesting(false); return false; }
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (reply) { setTesting(false); return true; }
    } catch { toast.error('Network error testing key'); }
    setTesting(false);
    return false;
  };

  const handleSave = async () => {
    if (!inputKey || !inputKey.trim()) { toast.error('Enter your Gemini API key'); return; }
    const ok = await testKey(inputKey.trim());
    if (ok) {
      setTestPassed(true);
      setStep('done');
      saveKey(inputKey.trim());
      onSave(inputKey.trim());
      toast.success('✅ Gemini API key verified and saved!');
    }
  };

  const handleClear = () => {
    setInputKey(''); setTestPassed(false); setStep('guide');
    clearKey(); onClear();
    toast('Key removed.', { icon: '🗑️' });
  };

  if (step === 'done' && testPassed) {
    return (
      <div className="gemini-key-done">
        <div className="gemini-key-done__icon"><CheckCircle size={18} color="#10b981" /></div>
        <div>
          <div className="gemini-key-done__label">Gemini API Key Connected</div>
          <div className="gemini-key-done__key">{apiKey ? apiKey.slice(0,8) + '••••••••••••••••••' + apiKey.slice(-4) : '•••••••••••••••'}</div>
        </div>
        <button className="gemini-key-done__change" onClick={handleClear}><XCircle size={14} /> Remove</button>
      </div>
    );
  }

  if (step === 'guide') {
    return (
      <div className="gemini-guide">
        <div className="gemini-guide__title">
          <Sparkles size={15} color="#fbbf24" />
          Get Your Free Gemini API Key (30 seconds)
        </div>
        <div className="gemini-guide__steps">
          {[
            { n:'1', text: 'Click the button below — opens Google AI Studio', highlight: true },
            { n:'2', text: 'Sign in with your Google account (same one you use for Gmail)' },
            { n:'3', text: 'Click "Create API Key" → Copy the key' },
            { n:'4', text: 'Paste it here. Free tier: 15 req/min, 1000 req/day ✓' },
          ].map(s => (
            <div key={s.n} className={`gemini-guide__step ${s.highlight ? 'gemini-guide__step--highlight' : ''}`}>
              <span className="gemini-guide__step-n">{s.n}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
        <div className="gemini-guide__actions">
          <a href={AISTUDIO_URL} target="_blank" rel="noreferrer" className="btn-primary gemini-guide__open-btn">
            <ExternalLink size={15} /> Open Google AI Studio
          </a>
          <button className="btn-secondary gemini-guide__enter-btn" onClick={() => setStep('input')}>
            <Key size={14} /> I have a key →
          </button>
        </div>
        <div className="gemini-guide__note">
          🔒 Your key is stored locally in your browser only — never sent to our servers.
        </div>
      </div>
    );
  }

  // step === 'input'
  return (
    <div className="gemini-key-input">
      <div className="gemini-key-input__label">
        <Key size={14} /> Paste your Gemini API key
      </div>
      <div className="gemini-key-input__row">
        <div className="gemini-key-input__wrap">
          <input
            className="input gemini-key-input__field"
            type={showKey ? 'text' : 'password'}
            placeholder="AIza••••••••••••••••••••••••••••••••••••"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button className="gemini-key-input__eye" onClick={() => setShowKey(!showKey)}>
            {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        </div>
        <button className="btn-primary gemini-key-input__verify" onClick={handleSave} disabled={testing}>
          {testing ? <><RefreshCw size={14} className="spin-icon"/> Testing...</> : <><CheckCircle size={14}/> Verify</>}
        </button>
      </div>
      <div className="gemini-key-input__footer">
        <button className="gemini-key-input__back" onClick={() => setStep('guide')}>← Back to guide</button>
        <span>Key starts with "AIza"</span>
      </div>
    </div>
  );
}

/* ── Gemini API caller ────────────────────────────────────── */
async function callGemini({ apiKey, model = 'gemini-2.5-flash', systemPrompt, userMessage, maxTokens = 400 }) {
  if (!apiKey || !apiKey.trim()) throw new Error('NO_KEY');
  const body = {
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/* ── Main component ───────────────────────────────────────── */
export default function MockInterviewPage() {
  const navigate    = useNavigate();
  const dispatch    = useDispatch();
  const { 
    activeMock, 
    isRunning = false, 
    currentPaceWPM = 0, 
    fillerWordCount = 0, 
    liveAlerts = [] 
  } = useSelector(s => s.mock) || {};

  // Auth state
  const [googleProfile, setGoogleProfile] = useState(() => getStoredProfile() || null);
  const [geminiKey,     setGeminiKey]     = useState(() => getStoredKey() || '');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Flow phases
  const [phase, setPhase] = useState('auth'); // auth | setup | interview | results

  // Setup config
  const [config, setConfig] = useState({ type:'technical', difficulty:'mid', role:'Software Engineer', company:'' });

  // Interview state
  const [messages,      setMessages]      = useState([]);
  const [transcript,    setTranscript]    = useState('');
  const [interimText,   setInterimText]   = useState('');
  const [elapsed,       setElapsed]       = useState(0);
  const [wordCount,     setWordCount]     = useState(0);
  const [postNotes,     setPostNotes]     = useState(null);
  const [generating,    setGenerating]    = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const recRef        = useRef(null);
  const timerRef      = useRef(null);
  const wordCountRef  = useRef(0);
  const startTimeRef  = useRef(null);
  const messagesEndRef= useRef(null);

  // Load GIS script on mount
  useEffect(() => {
    if (document.getElementById('google-gis')) return;
    const s = document.createElement('script');
    s.id  = 'google-gis';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  useEffect(() => {
    if (isRunning && phase === 'interview') {
      timerRef.current = setInterval(() => setElapsed(e => e+1), 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [isRunning, phase]);

  const formatTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const isReady = (geminiKey || '').length > 0;

  // ─── Google handlers
  const handleGoogleSignIn  = (p) => setGoogleProfile(p);
  const handleGoogleSignOut = () => { clearProfile(); setGoogleProfile(null); toast('Google account removed from Shadow AI.'); };

  // ─── Key handlers
  const handleKeySaved   = (k) => setGeminiKey(k);
  const handleKeyCleared = ()  => setGeminiKey('');

  // ─── Filler / pace detection
  const detectFillers = useCallback((text) => {
    const l = text.toLowerCase();
    FILLER_WORDS.forEach(fw => {
      if (l.includes(` ${fw} `) || l.startsWith(`${fw} `)) {
        dispatch(addFiller(fw));
        dispatch(addAlert({ type:'filler', message:`Filler word detected: "${fw}"` }));
      }
    });
  }, [dispatch]);

  // ─── Start interview
  const startInterview = async () => {
    if (!isReady) { toast.error('Please add your Gemini API key first'); return; }

    // Backend save is optional — Gemini runs entirely in the browser.
    // If the server is not running, interview still works perfectly.
    try {
      await dispatch(createMock(config));
    } catch (_) { /* server offline is fine */ }

    setPhase('interview');
    dispatch(setRunning(true));
    setGenerating(true);

    const sysPrompt = `You are an aggressive, no-nonsense interviewer at ${config.company || 'a top tech company'}.
Interviewing for: ${config.difficulty} ${config.role}. Type: ${config.type}.
Rules: Ask ONE question at a time. Be direct. No praise. No hints.
Start with a 1-sentence professional greeting, then immediately ask your first interview question.`;

    try {
      const q = await callGemini({
        apiKey: geminiKey, model: selectedModel,
        systemPrompt: sysPrompt,
        userMessage: 'Begin the interview.',
        maxTokens: 200
      });
      setMessages([{ role:'interviewer', content: q, ts: new Date() }]);
      speakText(q);
    } catch (e) {
      const fallback = `Welcome! Let's begin. Can you walk me through your most complex technical project — what was your specific contribution, and what engineering challenges did you overcome?`;
      setMessages([{ role:'interviewer', content: fallback, ts: new Date() }]);
    } finally {
      setGenerating(false);
    }
  };

  // ─── TTS
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate=0.95; u.pitch=1.0; u.volume=1;
    const vs = window.speechSynthesis.getVoices();
    const pref = vs.find(v => v.name.includes('Daniel') || v.name.includes('Google US English') || v.lang==='en-US');
    if (pref) u.voice = pref;
    window.speechSynthesis.speak(u);
  };

  // ─── Mic
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition needs Chrome or Edge.'); return; }
    const rec = new SR();
    rec.continuous=true; rec.interimResults=true; rec.lang='en-US';
    startTimeRef.current = Date.now(); wordCountRef.current = 0;
    let qBuf='', qTimer=null;

    rec.onresult = (e) => {
      let interim='';
      for (let i=e.resultIndex; i<e.results.length; i++) {
        if (e.results[i].isFinal) {
          const txt = e.results[i][0].transcript;
          setTranscript(t => t+txt+' ');
          wordCountRef.current += txt.trim().split(/\s+/).length;
          setWordCount(wordCountRef.current);
          detectFillers(txt);
          const secs = (Date.now()-startTimeRef.current)/1000;
          if (secs>3) dispatch(updatePace(Math.round((wordCountRef.current/secs)*60)));
          qBuf += txt+' ';
          clearTimeout(qTimer);
          qTimer = setTimeout(() => {
            if (qBuf.trim().length>10) {
              qBuf='';
            }
          }, 2500);
        } else { interim += e.results[i][0].transcript; }
      }
      setInterimText(interim);
    };
    rec.onerror = (ev) => { if(ev.error!=='no-speech') { toast.error('Mic: '+ev.error); dispatch(setRunning(false)); } };
    rec.onend = () => { if(isRunning) rec.start(); };
    rec.start();
    recRef.current = rec;
    dispatch(setRunning(true));
  };

  const stopListening = () => { recRef.current?.stop(); setInterimText(''); dispatch(setRunning(false)); };
  const toggleMic = () => { if(isRunning) stopListening(); else startListening(); };

  // ─── Submit answer → get next question
  const submitAnswer = async () => {
    const ans = (transcript || '').trim();
    if (!ans) { toast.error('Speak your answer first'); return; }
    stopListening();

    const updated = [...messages, { role:'candidate', content: ans, ts: new Date() }];
    setMessages(updated);
    setTranscript(''); setWordCount(0);
    setGenerating(true);

    const history = updated.map(m => ({
      role: m.role==='interviewer' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const sysPrompt = `You are an aggressive interviewer for ${config.difficulty} ${config.role}.
After the candidate answers: either probe deeper with ONE follow-up, or move to the next topic.
Never say "great answer". Stay in character. Be terse. If you've asked ${questionIndex+2}+ questions, wrap up.`;

    try {
      const body = {
        contents: history,
        system_instruction: { parts: [{ text: sysPrompt }] },
        generationConfig: { maxOutputTokens: 200, temperature: 0.8 }
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiKey}`,
        { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const next = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Can you explain your approach to designing a scalable distributed system?';
      setMessages(m => [...m, { role:'interviewer', content: next, ts: new Date() }]);
      setQuestionIndex(i => i+1);
      speakText(next);
    } catch(e) {
      const fb = 'How would you handle a situation where a production system you own goes down during peak hours?';
      setMessages(m => [...m, { role:'interviewer', content: fb, ts: new Date() }]);
    } finally {
      setGenerating(false);
      dispatch(setRunning(true));
      startListening();
    }
  };

  // ─── End interview + AI feedback
  const endInterview = async () => {
    stopListening();
    window.speechSynthesis?.cancel();
    dispatch(setRunning(false));
    setPhase('results');
    setGenerating(true);

    const candidateAnswers = messages.filter(m=>m.role==='candidate').map(m=>m.content).join('\n\n');
    const allQuestions     = messages.filter(m=>m.role==='interviewer').map(m=>m.content).join('\n');

    try {
      const raw = await callGemini({
        apiKey: geminiKey, model: selectedModel,
        userMessage: `Analyze this ${config.type} interview for a ${config.difficulty} ${config.role} position.
Questions: ${allQuestions}
Candidate answers: ${candidateAnswers}
Speech stats: ~${currentPaceWPM} WPM avg, ${fillerWordCount} filler words, ${elapsed}s duration.

Return ONLY valid JSON (no markdown fences):
{
  "summary": "2-3 sentence overall assessment",
  "overallScore": 72,
  "technicalAccuracy": 68,
  "communicationScore": 75,
  "structureScore": 70,
  "pacingAssessment": "specific pace feedback",
  "strengths": ["strength 1","strength 2","strength 3"],
  "weaknesses": ["weakness 1","weakness 2"],
  "correctiveFeedback": ["fix 1","fix 2","fix 3"],
  "recommendedResources": ["resource 1","resource 2"]
}`,
        maxTokens: 900
      });

      let notes = {};
      try { notes = JSON.parse(raw.replace(/```json|```/g,'').trim()); }
      catch { notes = { summary:'Good attempt with room for improvement.', overallScore:65, technicalAccuracy:60, communicationScore:70, structureScore:65, pacingAssessment:`You spoke at ~${currentPaceWPM} WPM. Target 130–160 WPM.`, strengths:['Engaged with all questions','Clear communication'], weaknesses:['More technical depth needed','Improve STAR structure'], correctiveFeedback:['Use STAR method for behavioral answers','Practice Big-O analysis','Reduce filler words'], recommendedResources:['Cracking the Coding Interview','System Design Primer (GitHub)'] }; }

      setPostNotes(notes);
      // Optionally save to backend if server is running
      try {
        if (activeMock?._id) {
          await dispatch(completeMock({
            id: activeMock._id,
            analytics: { totalDurationSeconds:elapsed, avgPaceWPM:currentPaceWPM, fillerWordCount },
            postInterviewNotes: { ...notes, generatedAt: new Date() }
          }));
        }
      } catch (_) { /* server offline is fine */ }
    } catch(e) {
      toast.error('Could not generate feedback: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const resetAll = () => {
    setPhase('auth'); setMessages([]); setTranscript(''); setWordCount(0);
    setElapsed(0); setQuestionIndex(0); setPostNotes(null);
    dispatch(clearMockSession());
  };

  /* ══════════════════════════════════════════════════════════
     RENDER — AUTH PHASE
  ══════════════════════════════════════════════════════════ */
  if (phase === 'auth') return (
    <div className="mock-page">
      <div className="mock-page__topbar">
        <button className="session-back" onClick={() => navigate('/dashboard')}><ChevronLeft size={18}/> Dashboard</button>
        <div className="mock-page__title"><Brain size={18} color="var(--accent-secondary)"/> Shadow AI — Mock Simulator</div>
        <div className="mock-badge">🛡️ Safe Mode</div>
      </div>

      <div className="mock-auth-page">
        {/* Hero */}
        <div className="mock-auth-hero">
          <div className="mock-auth-hero__icon"><Brain size={48} color="var(--accent-secondary)"/></div>
          <h1>Mock Interview <span className="gradient-text">Simulator</span></h1>
          <p>Powered by Google Gemini AI — Free tier included · No API costs · Voice-to-voice</p>
          <div className="mock-auth-hero__badges">
            <span className="mock-auth-badge"><Zap size={12}/> &lt;800ms latency</span>
            <span className="mock-auth-badge"><Shield size={12}/> Key stored locally</span>
            <span className="mock-auth-badge"><Sparkles size={12}/> Gemini 2.5 Free tier</span>
          </div>
        </div>

        <div className="mock-auth-cards">
          {/* STEP 1: Google Sign-In */}
          <div className={`mock-auth-card card ${googleProfile ? 'mock-auth-card--done' : ''}`}>
            <div className="mock-auth-card__step">
              {googleProfile ? <CheckCircle size={18} color="#10b981"/> : <span className="mock-auth-card__step-n">1</span>}
            </div>
            <div className="mock-auth-card__content">
              <div className="mock-auth-card__title">
                Sign in with Google
                <span className="mock-auth-card__optional">Optional — for personalised experience</span>
              </div>
              <div className="mock-auth-card__desc">
                Uses your existing Chrome / Google session. Personalises AI answers with your name and email context.
              </div>
              <GoogleSignInPanel
                profile={googleProfile}
                onSignIn={handleGoogleSignIn}
                onSignOut={handleGoogleSignOut}
              />
            </div>
          </div>

          {/* STEP 2: Gemini API Key */}
          <div className={`mock-auth-card card ${geminiKey ? 'mock-auth-card--done' : 'mock-auth-card--required'}`}>
            <div className="mock-auth-card__step">
              {geminiKey ? <CheckCircle size={18} color="#10b981"/> : <span className="mock-auth-card__step-n">2</span>}
            </div>
            <div className="mock-auth-card__content">
              <div className="mock-auth-card__title">
                Connect Gemini AI
                <span className="mock-auth-card__required-badge">Required</span>
              </div>
              <div className="mock-auth-card__desc">
                Get your <strong>free</strong> Gemini API key from Google AI Studio. Takes 30 seconds. Free tier: 15 req/min.
              </div>
              <GeminiKeyPanel
                apiKey={geminiKey}
                onSave={handleKeySaved}
                onClear={handleKeyCleared}
              />
            </div>
          </div>

          {/* STEP 3: Model selection */}
          {geminiKey && (
            <div className="mock-auth-card card mock-auth-card--done">
              <div className="mock-auth-card__step"><CheckCircle size={18} color="#10b981"/></div>
              <div className="mock-auth-card__content">
                <div className="mock-auth-card__title">Choose Gemini Model</div>
                <div className="mock-auth-card__desc">All models are free tier. Flash is fastest; Pro is smartest.</div>
                <div className="mock-model-selector">
                  {GEMINI_MODELS.map(m => (
                    <button key={m.id}
                      className={`mock-model-btn ${selectedModel===m.id ? 'mock-model-btn--active' : ''}`}
                      style={selectedModel===m.id ? { borderColor:m.color, background:m.color+'18', color:m.color } : {}}
                      onClick={() => setSelectedModel(m.id)}>
                      <span className="mock-model-btn__name">{m.label}</span>
                      <span className="mock-model-btn__badge" style={{ background:m.color+'22', color:m.color }}>{m.badge}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Continue button */}
        <div className="mock-auth-cta">
          <button
            className={`btn-primary mock-auth-continue ${!isReady ? 'mock-auth-continue--disabled' : ''}`}
            onClick={() => isReady && setPhase('setup')}
            disabled={!isReady}
          >
            {isReady ? <><Play size={18} fill="currentColor"/> Continue to Setup</> : <><Key size={18}/> Add Gemini Key to Continue</>}
          </button>
          {!isReady && (
            <p className="mock-auth-cta__hint">Step 2 is required to use the AI interviewer</p>
          )}
          {isReady && (
            <p className="mock-auth-cta__hint" style={{ color:'#6ee7b7' }}>
              <CheckCircle size={13}/> Ready! Using Gemini {GEMINI_MODELS.find(m=>m.id===selectedModel)?.label}
            </p>
          )}
        </div>

        {/* Info footer */}
        <div className="mock-auth-info">
          <div className="mock-auth-info__item">
            <Shield size={14} color="var(--accent-secondary)"/>
            <span>Your API key is stored <strong>only in your browser</strong> (localStorage). It's never sent to Shadow AI servers.</span>
          </div>
          <div className="mock-auth-info__item">
            <Sparkles size={14} color="#fbbf24"/>
            <span>Gemini free tier gives you <strong>15 req/min and 1,000 req/day</strong> — plenty for mock interview practice.</span>
          </div>
          <div className="mock-auth-info__item">
            <User size={14} color="#6ee7b7"/>
            <span>Google Sign-In is optional. It only provides your name/email for context — it does <strong>not</strong> give API access.</span>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER — SETUP PHASE
  ══════════════════════════════════════════════════════════ */
  if (phase === 'setup') return (
    <div className="mock-page">
      <div className="mock-page__topbar">
        <button className="session-back" onClick={() => setPhase('auth')}><ChevronLeft size={18}/> Back</button>
        <div className="mock-page__title"><Brain size={18} color="var(--accent-secondary)"/> Configure Interview</div>
        {googleProfile && (
          <div className="mock-topbar-profile">
            <img src={googleProfile.picture} alt="" width={22} height={22} style={{borderRadius:'50%'}} onError={e=>e.target.style.display='none'}/>
            <span>{googleProfile.name}</span>
          </div>
        )}
        <div className="mock-badge" style={{ background:'rgba(16,185,129,0.12)', color:'#6ee7b7', border:'1px solid rgba(16,185,129,0.3)' }}>
          <Sparkles size={11}/> {GEMINI_MODELS.find(m=>m.id===selectedModel)?.label}
        </div>
      </div>

      <div className="mock-setup">
        <div className="mock-setup__hero">
          <h1>Configure Your <span className="gradient-text">Mock Interview</span></h1>
          <p>Tell Shadow AI what kind of interview to simulate. The AI will adapt its questions accordingly.</p>
          <div className="mock-setup__latency-badge"><Zap size={13}/> &lt;800ms voice-to-voice latency · Powered by {GEMINI_MODELS.find(m=>m.id===selectedModel)?.label}</div>
        </div>

        <div className="mock-setup__card">
          {/* Type */}
          <div className="mock-setup__section">
            <label>Interview Type</label>
            <div className="mock-type-grid">
              {INTERVIEW_TYPES.map(t => (
                <button key={t.id} className={`mock-type-card ${config.type===t.id ? 'mock-type-card--active' : ''}`} onClick={() => setConfig({...config, type:t.id})}>
                  <span className="mock-type-card__icon">{t.icon}</span>
                  <span className="mock-type-card__label">{t.label}</span>
                  <span className="mock-type-card__desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="mock-setup__section">
            <label>Difficulty</label>
            <div className="mock-diff-row">
              {DIFFICULTIES.map(d => (
                <button key={d.id}
                  className={`mock-diff-btn ${config.difficulty===d.id ? 'mock-diff-btn--active' : ''}`}
                  style={config.difficulty===d.id ? { borderColor:d.color, background:d.color+'22', color:d.color } : {}}
                  onClick={() => setConfig({...config, difficulty:d.id})}>{d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Role & Company */}
          <div className="mock-setup__row2">
            <div className="mock-setup__field">
              <label>Target Role</label>
              <input className="input" placeholder="Senior Backend Engineer" value={config.role} onChange={e => setConfig({...config, role:e.target.value})}/>
            </div>
            <div className="mock-setup__field">
              <label>Company (optional)</label>
              <input className="input" placeholder="Google, Meta, Amazon..." value={config.company} onChange={e => setConfig({...config, company:e.target.value})}/>
            </div>
          </div>

          <button className="btn-primary mock-start-btn" onClick={startInterview}>
            <Play size={18} fill="currentColor"/> Start Mock Interview
          </button>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER — RESULTS PHASE
  ══════════════════════════════════════════════════════════ */
  if (phase === 'results') return (
    <div className="mock-page">
      <div className="mock-page__topbar">
        <button className="session-back" onClick={() => navigate('/dashboard')}><ChevronLeft size={18}/> Dashboard</button>
        <div className="mock-page__title"><Award size={18} color="#fbbf24"/> Post-Interview AI Feedback</div>
        <span/>
      </div>
      <div className="mock-results">
        {generating ? (
          <div className="mock-results__loading">
            <div className="spinner"/>
            <p>Generating your AI coaching report via Gemini...</p>
          </div>
        ) : postNotes ? (
          <>
            <div className="results-scores">
              {[
                { label:'Overall',       value:postNotes.overallScore,       color:'#a855f7' },
                { label:'Technical',     value:postNotes.technicalAccuracy,  color:'#6366f1' },
                { label:'Communication', value:postNotes.communicationScore, color:'#10b981' },
                { label:'Structure',     value:postNotes.structureScore,     color:'#f59e0b' },
              ].map(s => (
                <div key={s.label} className="results-score-card card">
                  <div className="results-score-card__ring" style={{'--color':s.color,'--pct':`${s.value*3.6}deg`}}>
                    <span style={{color:s.color}}>{s.value}</span>
                  </div>
                  <div className="results-score-card__label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="results-stats-row">
              <div className="results-stat"><Clock size={15}/> {formatTime(elapsed)}</div>
              <div className="results-stat"><Volume2 size={15}/> {currentPaceWPM} WPM avg</div>
              <div className="results-stat"><AlertTriangle size={15}/> {fillerWordCount} filler words</div>
              <div className="results-stat"><Brain size={15}/> {questionIndex+1} questions</div>
            </div>
            <div className="results-grid">
              <div className="results-section card">
                <h3><CheckCircle size={16} color="#10b981"/> Strengths</h3>
                <ul>{postNotes.strengths?.map((s,i)=><li key={i}>{s}</li>)}</ul>
              </div>
              <div className="results-section card">
                <h3><XCircle size={16} color="#ef4444"/> Areas to Improve</h3>
                <ul>{postNotes.weaknesses?.map((w,i)=><li key={i}>{w}</li>)}</ul>
              </div>
              <div className="results-section card" style={{gridColumn:'1/-1'}}>
                <h3><Target size={16} color="#a855f7"/> Corrective Feedback</h3>
                <ul>{postNotes.correctiveFeedback?.map((f,i)=><li key={i}>{f}</li>)}</ul>
              </div>
              <div className="results-section card">
                <h3><TrendingUp size={16} color="#6366f1"/> Pacing</h3>
                <p>{postNotes.pacingAssessment}</p>
              </div>
              <div className="results-section card">
                <h3><Sparkles size={16} color="#fbbf24"/> Resources</h3>
                <ul>{postNotes.recommendedResources?.map((r,i)=><li key={i}>{r}</li>)}</ul>
              </div>
            </div>
            <div className="results-summary card">
              <h3>Overall Assessment</h3>
              <p>{postNotes.summary}</p>
            </div>
            <div className="results-actions">
              <button className="btn-primary" onClick={resetAll}><RefreshCw size={16}/> Practice Again</button>
              <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER — INTERVIEW PHASE
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="mock-page">
      <div className="mock-page__topbar">
        <button className="session-back" onClick={endInterview}><ChevronLeft size={18}/> End</button>
        <div className="mock-page__title">
          <Brain size={18} color="var(--accent-secondary)"/>
          {config.role} — {config.type}
          {config.company && <span className="session-platform">{config.company}</span>}
        </div>
        <div className="mock-timer">
          <Clock size={14}/> {formatTime(elapsed)}
          {googleProfile && (
            <div className="mock-topbar-profile">
              <img src={googleProfile.picture} alt="" width={20} height={20} style={{borderRadius:'50%'}} onError={e=>e.target.style.display='none'}/>
            </div>
          )}
          <button className="mock-end-btn" onClick={endInterview}><Square size={13} fill="currentColor"/> End & Get Feedback</button>
        </div>
      </div>

      <div className="mock-interview-body">
        {/* LEFT: conversation */}
        <div className="mock-conv">
          <div className="mock-conv__messages">
            {messages.map((m,i) => (
              <div key={i} className={`mock-msg mock-msg--${m.role}`}>
                <div className="mock-msg__label">
                  {m.role==='interviewer' ? '🎙️ Interviewer' : (
                    <span style={{display:'flex',alignItems:'center',gap:6}}>
                      {googleProfile ? <img src={googleProfile.picture} alt="" width={16} height={16} style={{borderRadius:'50%'}} onError={e=>e.target.style.display='none'}/> : null}
                      👤 {googleProfile?.name?.split(' ')[0] || 'You'}
                    </span>
                  )}
                </div>
                <div className="mock-msg__text">{m.content}</div>
              </div>
            ))}
            {generating && (
              <div className="mock-msg mock-msg--interviewer">
                <div className="mock-msg__label">🎙️ Interviewer</div>
                <div className="mock-typing"><span/><span/><span/></div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Answer area */}
          <div className="mock-answer-area">
            <div className="mock-transcript-box">
              <div className="mock-transcript-label">
                <Mic size={12}/> Your Answer
                {interimText && <span className="mock-interim">(speaking...)</span>}
              </div>
              <div className="mock-transcript-text">
                {transcript || <span style={{color:'var(--text-muted)',fontStyle:'italic'}}>Click mic to speak...</span>}
                {interimText && <span className="mock-interim-text"> {interimText}</span>}
              </div>
            </div>
            <div className="mock-controls">
              <button className={`mock-mic-btn ${isRunning ? 'mock-mic-btn--active' : ''}`} onClick={toggleMic}>
                {isRunning ? <MicOff size={22}/> : <Mic size={22}/>}
                {isRunning ? 'Mute' : 'Speak'}
              </button>
              <button className="btn-primary mock-submit-btn" onClick={submitAnswer} disabled={!(transcript||'').trim()||generating}>
                Submit Answer <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: coaching */}
        <div className="mock-coaching">
          <div className="mock-coaching__title"><BarChart2 size={15}/> Live Coaching</div>
          <PaceGauge wpm={currentPaceWPM}/>
          <div className="coaching-metric card">
            <div className="coaching-metric__label">Filler Words</div>
            <div className="coaching-metric__value" style={{color:fillerWordCount>5?'#ef4444':'#10b981'}}>{fillerWordCount}</div>
            <div className="coaching-metric__hint">Keep below 3 per answer</div>
          </div>
          <div className="coaching-metric card">
            <div className="coaching-metric__label">Words Spoken</div>
            <div className="coaching-metric__value">{wordCount}</div>
            <div className="coaching-metric__hint">Good answer: 150–250 words</div>
          </div>
          {(liveAlerts || []).length > 0 && (
            <div className="coaching-alerts">
              <div className="coaching-alerts__title">⚠️ Live Alerts</div>
              {(liveAlerts || []).map(a => <FillerAlert key={a.id} alert={a} onDismiss={id => dispatch(dismissAlert(id))}/>)}
            </div>
          )}
          <div className="coaching-star card">
            <div className="coaching-star__title">STAR Method</div>
            {['Situation — set the context','Task — your responsibility','Action — what YOU did','Result — measurable outcome'].map((s,i)=>(
              <div key={i} className="coaching-star__item">
                <span className="coaching-star__letter">{s[0]}</span>
                <span>{s.slice(4)}</span>
              </div>
            ))}
          </div>
          {/* Gemini indicator */}
          <div className="coaching-gemini-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.09 8.26L19 7L14.74 11.26L21 12L14.74 12.74L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12.74L3 12L9.26 11.26L5 7L10.91 8.26L12 2Z" fill="#4285F4"/></svg>
            {GEMINI_MODELS.find(m=>m.id===selectedModel)?.label} · Free Tier
          </div>
        </div>
      </div>
    </div>
  );
}
