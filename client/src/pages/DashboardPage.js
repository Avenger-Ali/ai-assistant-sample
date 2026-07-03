import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  LayoutDashboard, Mic, FileText, Settings, CreditCard, LogOut,
  Plus, Trash2, Play, Clock, Zap, Brain, Upload, Check,
  Globe, Bell, ChevronRight, Copy, Star, Users, Building2,
  TrendingUp, Shield, BookOpen, Smartphone, Code2, StickyNote,
  Volume2, Eye, MessageSquare, Sparkles, Award, BarChart2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { logout, updateSettings } from '../store/slices/authSlice';
import { fetchSessions, createSession, deleteSession } from '../store/slices/sessionsSlice';
import DesktopLauncherPanel from '../components/dashboard/DesktopLauncherPanel';
import './DashboardPage.css';

const TABS = [
  { id:'overview',    label:'Overview',        icon:<LayoutDashboard size={15}/> },
  { id:'sessions',    label:'Live Sessions',   icon:<Mic size={15}/> },
  { id:'mock',        label:'Mock Simulator',  icon:<Brain size={15}/>, badge:'NEW' },
  { id:'documents',   label:'Documents',       icon:<FileText size={15}/> },
  { id:'billing',     label:'Billing',         icon:<CreditCard size={15}/> },
  { id:'enterprise',  label:'Enterprise',      icon:<Building2 size={15}/>, badge:'B2B' },
  { id:'affiliate',   label:'Affiliate',       icon:<TrendingUp size={15}/>, badge:'$$$' },
  { id:'mobile',      label:'Mobile View',     icon:<Smartphone size={15}/> },
  { id:'settings',    label:'Settings',        icon:<Settings size={15}/> },
];

const AI_MODELS = [
  { id:'gpt-5',    label:'GPT-5',     badge:'Latest', color:'#10b981' },
  { id:'gpt-4.1',  label:'GPT-4.1',   badge:'Fast',   color:'#6366f1' },
  { id:'claude-4', label:'Claude 4',  badge:'Smart',  color:'#a855f7' },
  { id:'gemini-2.5',label:'Gemini 2.5',badge:'Free',  color:'#06b6d4' },
];
const LANGUAGES = ['English','Hindi','Spanish','French','German','Chinese','Japanese','Korean','Portuguese','Arabic','Russian','Italian'];
const PLATFORMS  = ['Zoom','Google Meet','Microsoft Teams','Webex','Phone Screen','HackerRank','LeetCode','CoderPad'];
const PROC_ALIASES = ['chrome_helper','spotify_service','system_updater','audio_daemon','net_monitor'];

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { user } = useSelector(s => s.auth);
  const { sessions, loading:sessLoading } = useSelector(s => s.sessions);

  const [activeTab, setActiveTab] = useState(sp.get('tab') || 'overview');
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSess, setNewSess] = useState({
    type:'non-coding', language:'English', aiModel:'gpt-5',
    platform:'Zoom', extraContext:'', title:''
  });
  const [localSettings, setLocalSettings] = useState(user?.settings || {});

  useEffect(() => { dispatch(fetchSessions()); }, [dispatch]);
  useEffect(() => { if (user?.settings) setLocalSettings(user.settings); }, [user]);

  const handleLogout = () => { dispatch(logout()); navigate('/'); };

  const handleCreateSession = async () => {
    if (!newSess.title) newSess.title = `${newSess.platform} — ${new Date().toLocaleDateString()}`;
    const res = await dispatch(createSession(newSess));
    if (res.payload?.session) {
      toast.success('Session created!'); setShowNewSession(false);
      navigate(`/session/${res.payload.session._id}`);
    } else { toast.error(res.payload || 'Failed — is the server running?'); }
  };

  const handleDeleteSession = async id => {
    if (!window.confirm('Delete this session?')) return;
    await dispatch(deleteSession(id)); toast.success('Deleted');
  };

  const handleSaveSettings = () => { dispatch(updateSettings(localSettings)); toast.success('Settings saved!'); };
  const copyReferral = () => { navigator.clipboard.writeText(user?.referralCode || ''); toast.success('Referral code copied!'); };

  const isAdmin      = user?.isAdmin === true || user?.role === 'admin';
  const hasUnlimited = isAdmin || user?.subscription?.status === 'active';
  const credits = typeof user?.credits === 'number' ? user.credits : 0;

  return (
    <div className="dashboard">
      {/* ── Sidebar ── */}
      <aside className="dashboard__sidebar">
        <Link to="/" className="dashboard__logo">
          <div className="dashboard__logo-icon"><Zap size={15} fill="currentColor" /></div>
          <span>Shadow<span style={{color:'var(--accent-secondary)'}}>AI</span></span>
        </Link>

        <div className="dashboard__user">
          <div className="dashboard__avatar">{user?.email?.[0]?.toUpperCase()}</div>
          <div className="dashboard__user-info">
            <div className="dashboard__user-name">{user?.name || user?.email?.split('@')[0]}</div>
            <div className="dashboard__user-email">{user?.email}</div>
          </div>
        </div>

        {isAdmin && (
          <div className="dashboard__admin-badge">
            <Shield size={12} /> Admin Access — No Subscription Required
          </div>
        )}

        <div className="dashboard__credits-box">
          {hasUnlimited ? (
            <div className="dashboard__unlimited"><Zap size={13} fill="currentColor" /> {isAdmin ? 'Admin — Full Access' : 'Unlimited Active'}</div>
          ) : (
            <>
              <div className="dashboard__credits-label">Credits Remaining</div>
              <div className="dashboard__credits-value">{credits.toFixed(1)}</div>
              <div className="dashboard__credits-note">0.5 per 30-min session</div>
            </>
          )}
        </div>

        <nav className="dashboard__nav">
          {TABS.map(t => (
            <button key={t.id}
              className={`dashboard__nav-item ${activeTab===t.id ? 'dashboard__nav-item--active' : ''}`}
              onClick={() => setActiveTab(t.id)}>
              {t.icon}
              <span style={{flex:1}}>{t.label}</span>
              {t.badge && (
                <span className="dashboard__nav-badge" style={{
                  background: t.badge==='$$$' ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--gradient-accent)'
                }}>{t.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <button className="dashboard__logout" onClick={handleLogout}>
          <LogOut size={15} /> Sign Out
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="dashboard__main">

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <div className="dash-section">
            <div className="dash-section__header">
              <h2>Welcome back{user?.name ? `, ${user.name}` : ''} 👋</h2>
              <p>Your Shadow AI career dashboard</p>
            </div>

            {/* Stats */}
            <div className="dash-stats">
              {[
                { icon:<Mic size={19}/>,       value:sessions.length,       label:'Total Sessions',  bg:'rgba(124,58,237,.15)', color:'#a855f7' },
                { icon:<Check size={19}/>,      value:sessions.filter(s=>s.status==='ended').length, label:'Completed', bg:'rgba(16,185,129,.15)', color:'#6ee7b7' },
                { icon:<Zap size={19}/>,        value:hasUnlimited ? '∞' : credits.toFixed(1), label:hasUnlimited?'Unlimited':'Credits Left', bg:'rgba(99,102,241,.15)', color:'#818cf8' },
                { icon:<Star size={19}/>,       value:user?.subscription?.type==='none' ? 'Free' : (user?.subscription?.type||'Free'), label:'Plan', bg:'rgba(245,158,11,.15)', color:'#fbbf24' },
              ].map((s,i) => (
                <div key={i} className="dash-stat card">
                  <div className="dash-stat__icon" style={{background:s.bg,color:s.color}}>{s.icon}</div>
                  <div className="dash-stat__value">{s.value}</div>
                  <div className="dash-stat__label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Desktop Overlay App — premium-gated, 75-minute launch token */}
            <DesktopLauncherPanel />

            {/* Quick actions */}
            <div className="dash-actions">
              <button className="btn-primary" onClick={() => { setActiveTab('sessions'); setShowNewSession(true); }}>
                <Plus size={17} /> New Live Session
              </button>
              <button className="btn-secondary" onClick={() => navigate('/mock')}>
                <Brain size={17} /> Mock Interview
              </button>
              <Link to="/pricing" className="btn-secondary"><CreditCard size={17} /> Upgrade</Link>
            </div>

            {/* Feature grid */}
            <h3 className="dash-sub-title">Platform Features</h3>
            <div className="dash-feature-grid">
              {[
                { icon:<Brain size={20}/>, bg:'rgba(124,58,237,.15)', color:'#a855f7', title:'Mock Simulator', desc:'Voice-to-voice AI. Pacing coach. Real-time coaching.', badge:'Safe Mode', badgeBg:'rgba(16,185,129,.12)', badgeColor:'#6ee7b7', onClick:()=>navigate('/mock') },
                { icon:<Shield size={20}/>, bg:'rgba(16,185,129,.15)', color:'#6ee7b7', title:'Live Co-Pilot', desc:'100% undetectable. Dynamic masking. HITL backup.', badge:'Stealth', badgeBg:'rgba(124,58,237,.12)', badgeColor:'#a855f7', onClick:()=>setActiveTab('sessions') },
                { icon:<Building2 size={20}/>, bg:'rgba(99,102,241,.15)', color:'#818cf8', title:'Enterprise B2B', desc:'Multi-seat agency dashboard. Track bench developers.', badge:'B2B', badgeBg:'rgba(99,102,241,.12)', badgeColor:'#818cf8', onClick:()=>navigate('/enterprise') },
                { icon:<TrendingUp size={20}/>, bg:'rgba(245,158,11,.15)', color:'#fbbf24', title:'Affiliate Program', desc:'30% lifetime commission. Creator $600–$4,000+/mo.', badge:'Earn', badgeBg:'rgba(245,158,11,.12)', badgeColor:'#fbbf24', onClick:()=>navigate('/affiliate') },
                { icon:<Star size={20}/>, bg:'rgba(239,68,68,.15)', color:'#f87171', title:'Human-in-the-Loop', desc:'Live expert engineers. 15-second connection SLA.', badge:'Elite', badgeBg:'rgba(239,68,68,.12)', badgeColor:'#f87171', onClick:()=>setActiveTab('sessions') },
                { icon:<Smartphone size={20}/>, bg:'rgba(6,182,212,.15)', color:'#22d3ee', title:'Mobile Companion', desc:'/mobile — glance-friendly secondary screen UI.', badge:'Mobile', badgeBg:'rgba(6,182,212,.12)', badgeColor:'#22d3ee', onClick:()=>navigate('/mobile') },
              ].map((f,i) => (
                <div key={i} className="dash-feature-card card" onClick={f.onClick}>
                  <div className="dash-feature-card__icon" style={{background:f.bg, color:f.color}}>{f.icon}</div>
                  <div className="dash-feature-card__title">{f.title}</div>
                  <div className="dash-feature-card__desc">{f.desc}</div>
                  <span className="dash-feature-card__badge" style={{background:f.badgeBg, color:f.badgeColor}}>{f.badge}</span>
                </div>
              ))}
            </div>

            {/* Recent sessions */}
            <h3 className="dash-sub-title">Recent Sessions</h3>
            {sessions.slice(0,3).length === 0 ? (
              <div className="dash-empty">
                <Mic size={36} color="var(--text-muted)" />
                <p>No sessions yet. Create your first live interview session!</p>
              </div>
            ) : sessions.slice(0,3).map(s => (
              <div key={s._id} className="dash-session-row card" onClick={() => navigate(`/session/${s._id}`)}>
                <div className="dash-session-row__icon"><Mic size={15} /></div>
                <div className="dash-session-row__info">
                  <div className="dash-session-row__title">{s.title}</div>
                  <div className="dash-session-row__meta">{s.type} · {s.platform} · {new Date(s.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`dash-session-row__status dash-session-row__status--${s.status}`}>{s.status}</div>
                <ChevronRight size={15} color="var(--text-muted)" />
              </div>
            ))}

            {/* Referral box */}
            <div className="dash-referral card">
              <div className="dash-referral__left">
                <Users size={22} color="var(--accent-secondary)" />
                <div>
                  <h4>Invite Friends — Earn 2 Credits Each</h4>
                  <p>Both you and your friend earn 2 un-expirable credits on signup.</p>
                </div>
              </div>
              <div className="dash-referral__code">
                <span className="dash-referral__code-val">{user?.referralCode}</span>
                <button className="btn-secondary" style={{padding:'7px 14px',fontSize:12}} onClick={copyReferral}>
                  <Copy size={13} /> Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SESSIONS ═══ */}
        {activeTab === 'sessions' && (
          <div className="dash-section">
            <div className="dash-section__header">
              <h2>Live Interview Sessions</h2>
              <button className="btn-primary" onClick={() => setShowNewSession(!showNewSession)}>
                <Plus size={16} /> New Session
              </button>
            </div>

            {showNewSession && (
              <div className="dash-new-session card">
                <h3>Configure Session</h3>
                <div className="dash-new-session__grid">
                  <div className="form-field">
                    <label>Session Title</label>
                    <input className="input" placeholder="e.g. Google SWE Interview"
                      value={newSess.title} onChange={e => setNewSess({...newSess,title:e.target.value})} />
                  </div>
                  <div className="form-field">
                    <label>Type</label>
                    <div className="dash-type-btns">
                      {['non-coding','coding','phone'].map(t => (
                        <button key={t} className={`type-btn ${newSess.type===t?'type-btn--active':''}`}
                          onClick={() => setNewSess({...newSess,type:t})}>
                          {t==='coding'&&<Code2 size={12}/>}{t==='non-coding'&&<Mic size={12}/>}{t==='phone'&&<Globe size={12}/>}
                          {t.charAt(0).toUpperCase()+t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Platform</label>
                    <select className="input" value={newSess.platform} onChange={e => setNewSess({...newSess,platform:e.target.value})}>
                      {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>AI Model</label>
                    <div className="dash-model-btns">
                      {AI_MODELS.map(m => (
                        <button key={m.id} className={`model-btn ${newSess.aiModel===m.id?'model-btn--active':''}`}
                          onClick={() => setNewSess({...newSess,aiModel:m.id})}>
                          <Brain size={12}/> {m.label}
                          <span style={{fontSize:10,padding:'1px 6px',borderRadius:3,background:m.color+'22',color:m.color}}>{m.badge}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Language</label>
                    <select className="input" value={newSess.language} onChange={e => setNewSess({...newSess,language:e.target.value})}>
                      {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-field" style={{gridColumn:'1/-1'}}>
                    <label>Extra Context <span style={{color:'var(--text-muted)',fontSize:11}}>(role, company, JD)</span></label>
                    <textarea className="input" rows={2} style={{resize:'vertical'}}
                      placeholder="e.g. Senior Backend role at Google. Focus on distributed systems..."
                      value={newSess.extraContext} onChange={e => setNewSess({...newSess,extraContext:e.target.value})} />
                  </div>
                </div>
                <div style={{display:'flex',gap:10,marginTop:16}}>
                  <button className="btn-primary" onClick={handleCreateSession}><Play size={14}/> Start Session</button>
                  <button className="btn-secondary" onClick={() => setShowNewSession(false)}>Cancel</button>
                </div>
              </div>
            )}

            {sessLoading ? <div className="dash-loading"><div className="spinner"/></div>
             : sessions.length === 0 ? (
              <div className="dash-empty">
                <Mic size={48} color="var(--text-muted)"/><h3>No sessions yet</h3>
                <p>Create your first session to start using Shadow AI in interviews</p>
              </div>
            ) : (
              <div className="dash-sessions-list">
                {sessions.map(s => (
                  <div key={s._id} className="dash-session-card card">
                    <div className="dash-session-card__header">
                      <span className="dash-session-card__title">{s.title}</span>
                      <span className={`dash-session-card__status dash-session-card__status--${s.status}`}>{s.status}</span>
                    </div>
                    <div className="dash-session-card__meta">
                      <span><Brain size={11}/>{s.aiModel}</span>
                      <span><Globe size={11}/>{s.platform}</span>
                      <span><Clock size={11}/>{new Date(s.createdAt).toLocaleDateString()}</span>
                      <span><Mic size={11}/>{s.type}</span>
                    </div>
                    {s.aiNotes?.summary && <p className="dash-session-card__summary">{s.aiNotes.summary}</p>}
                    <div className="dash-session-card__actions">
                      {s.status !== 'ended' && (
                        <button className="btn-primary" style={{padding:'7px 16px',fontSize:12}} onClick={()=>navigate(`/session/${s._id}`)}>
                          <Play size={13}/> Continue
                        </button>
                      )}
                      {s.status === 'ended' && (
                        <button className="btn-secondary" style={{padding:'7px 16px',fontSize:12}} onClick={()=>navigate(`/session/${s._id}`)}>
                          <FileText size={13}/> View Notes
                        </button>
                      )}
                      <button className="dash-session-card__delete" onClick={()=>handleDeleteSession(s._id)}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ MOCK ═══ */}
        {activeTab === 'mock' && (
          <div className="dash-section">
            <div className="dash-section__header">
              <h2>Mock Interview Simulator</h2>
              <span className="dash-safe-badge">🛡️ Safe Mode — Ethical Practice</span>
            </div>
            <div className="card" style={{padding:32}}>
              <div style={{display:'flex',alignItems:'center',gap:28,flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <h3 style={{fontSize:20,fontWeight:700,marginBottom:12}}>Voice-to-Voice AI Interviewer</h3>
                  <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:9,marginBottom:24}}>
                    {['Under 800ms voice latency','Real-time pacing coach (130–160 WPM target)','Filler word detector: um, uh, like, basically','Post-session AI coaching report with scores','5 interview types · 5 difficulty levels','Behavioral, Technical, System Design, Coding, Mixed'].map((f,i)=>(
                      <li key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,color:'var(--text-secondary)'}}>
                        <Check size={14} color="#6ee7b7"/> {f}
                      </li>
                    ))}
                  </ul>
                  <button className="btn-primary" style={{fontSize:16,padding:'13px 32px'}} onClick={()=>navigate('/mock')}>
                    <Brain size={17}/> Launch Mock Simulator
                  </button>
                </div>
                <Brain size={90} color="rgba(124,58,237,0.2)" />
              </div>
            </div>
          </div>
        )}

        {/* ═══ DOCUMENTS ═══ */}
        {activeTab === 'documents' && (
          <div className="dash-section">
            <div className="dash-section__header">
              <h2>Documents & Resume</h2>
              <p>Upload your resume and knowledge base for AI-personalised answers</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {[
                { icon:<FileText size={19}/>, title:'Resume', desc:'Shadow AI uses your resume to personalise every answer to match your background.', isResume:true },
                { icon:<BookOpen size={19}/>, title:'Knowledge Base', desc:'Upload job descriptions, company notes, or reference documents for context-aware answers.', isResume:false },
              ].map((d,i) => (
                <div key={i} className="card" style={{padding:24}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:16}}>
                    <div style={{width:42,height:42,background:'rgba(124,58,237,.12)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent-secondary)',flexShrink:0}}>{d.icon}</div>
                    <div><h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>{d.title}</h3><p style={{fontSize:13,color:'var(--text-secondary)'}}>{d.desc}</p></div>
                  </div>
                  {d.isResume && user?.resume?.originalName && (
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'rgba(16,185,129,.05)',border:'1px solid rgba(16,185,129,.2)',borderRadius:8,marginBottom:12,fontSize:13}}>
                      <FileText size={14} color="var(--accent-secondary)"/>{user.resume.originalName}
                      <Check size={13} color="#10b981" style={{marginLeft:'auto'}}/>
                    </div>
                  )}
                  <label style={{display:'flex',alignItems:'center',gap:7,padding:'10px 16px',background:'rgba(124,58,237,.06)',border:'1px dashed rgba(124,58,237,.4)',borderRadius:8,color:'var(--accent-secondary)',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .2s'}}>
                    <Upload size={14}/> {d.isResume && user?.resume?.originalName ? 'Replace' : 'Upload'} {d.title}
                    <input type="file" accept=".pdf,.doc,.docx,.txt" style={{display:'none'}}
                      onChange={e => { if(e.target.files[0]) toast.success(`"${e.target.files[0].name}" uploaded!`); }} />
                  </label>
                  <p style={{fontSize:11,color:'var(--text-muted)',marginTop:6}}>PDF, DOC, DOCX, TXT — max 10MB</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ BILLING ═══ */}
        {activeTab === 'billing' && (
          <div className="dash-section">
            <div className="dash-section__header"><h2>Billing & Subscription</h2></div>
            <div className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:24,marginBottom:24,gap:20,flexWrap:'wrap'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:7,fontSize:12,fontWeight:700,color:'var(--accent-tertiary)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.05em'}}>
                  {hasUnlimited ? <Zap size={15} fill="currentColor"/> : <CreditCard size={15}/>}
                  {hasUnlimited ? `${user.subscription.type} Plan` : 'Free / Credits'}
                </div>
                <h3 style={{fontSize:17,fontWeight:700,marginBottom:4}}>{hasUnlimited ? 'Unlimited Access Active' : `${credits.toFixed(1)} Credits Remaining`}</h3>
                {hasUnlimited && user?.subscription?.endDate && <p style={{fontSize:13,color:'var(--text-muted)'}}>Renews {new Date(user.subscription.endDate).toLocaleDateString()}</p>}
              </div>
              <Link to="/pricing" className="btn-primary">{hasUnlimited ? 'Manage Plan' : 'Upgrade Now'}</Link>
            </div>

            <h3 className="dash-sub-title">Subscription Plans</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:28}}>
              {[{name:'Monthly',inr:'₹9,470',usd:'$99.90',per:'month',tag:'Unlimited Calls'},{name:'Yearly',inr:'₹28,420',usd:'$299.90',per:'year',tag:'Save 75%',popular:true},{name:'Lifetime',inr:'₹74,990',usd:'$799',per:'once',tag:'Forever Access'}].map(p => (
                <div key={p.name} className={`card ${p.popular?'dash-popular-card':''}`} style={{padding:20,position:'relative'}}>
                  {p.popular && <div style={{position:'absolute',top:-9,left:'50%',transform:'translateX(-50%)',background:'var(--gradient-accent)',color:'white',fontSize:10,fontWeight:700,padding:'2px 12px',borderRadius:100,whiteSpace:'nowrap'}}>Best Value</div>}
                  <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:16,fontWeight:700,marginBottom:6}}>{p.name}</div>
                  <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:28,fontWeight:800,background:'var(--gradient-accent)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{p.inr}<span style={{fontSize:14,WebkitTextFillColor:'var(--text-muted)',color:'var(--text-muted)'}}> /{p.per}</span></div>
                  <div style={{fontSize:12,color:'var(--text-muted)',margin:'4px 0 12px'}}>{p.usd} · {p.tag}</div>
                  <button className={p.popular?'btn-primary':'btn-secondary'} style={{width:'100%',justifyContent:'center',padding:'9px'}} onClick={()=>navigate('/pricing')}>{p.popular?'Subscribe Now':'View Plan'}</button>
                </div>
              ))}
            </div>

            <h3 className="dash-sub-title">Credit Packs</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
              {[{name:'3 Credits',inr:'₹3,690',usd:'$38.90',hours:'~1.5 hrs'},{name:'7 Credits',inr:'₹7,380',usd:'$77.90',hours:'~3.5 hrs',popular:true},{name:'15 Credits',inr:'₹11,070',usd:'$116.90',hours:'~7.5 hrs'}].map(p => (
                <div key={p.name} className={`card ${p.popular?'dash-popular-card':''}`} style={{padding:18,position:'relative'}}>
                  {p.popular && <div style={{position:'absolute',top:-9,left:'50%',transform:'translateX(-50%)',background:'var(--gradient-accent)',color:'white',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:100,whiteSpace:'nowrap'}}>Popular</div>}
                  <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{p.name}</div>
                  <div style={{fontFamily:'Space Grotesk,sans-serif',fontSize:24,fontWeight:800,background:'var(--gradient-accent)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>{p.inr}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',margin:'3px 0 12px'}}>{p.usd} · {p.hours}</div>
                  <button className={p.popular?'btn-primary':'btn-secondary'} style={{width:'100%',justifyContent:'center',padding:'8px',fontSize:12}} onClick={()=>navigate('/pricing')}>Buy Now</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ENTERPRISE ═══ */}
        {activeTab === 'enterprise' && (
          <div className="dash-section">
            <div className="dash-section__header"><h2>Enterprise Dashboard</h2><p>B2B multi-seat management for IT staffing firms</p></div>
            <button className="btn-primary" onClick={()=>navigate('/enterprise')}><Building2 size={16}/> Open Enterprise Dashboard</button>
          </div>
        )}

        {/* ═══ AFFILIATE ═══ */}
        {activeTab === 'affiliate' && (
          <div className="dash-section">
            <div className="dash-section__header"><h2>Affiliate & Creator Program</h2><p>Earn $600–$4,000+/month</p></div>
            <button className="btn-primary" onClick={()=>navigate('/affiliate')}><TrendingUp size={16}/> Open Affiliate Dashboard</button>
          </div>
        )}

        {/* ═══ MOBILE ═══ */}
        {activeTab === 'mobile' && (
          <div className="dash-section">
            <div className="dash-section__header"><h2>Mobile Companion</h2><p>Open on a secondary device during your interview</p></div>
            <div className="card" style={{padding:28,maxWidth:480}}>
              <Smartphone size={38} color="var(--accent-secondary)" style={{marginBottom:14}}/>
              <h3 style={{marginBottom:8,fontSize:16,fontWeight:700}}>How to use</h3>
              <ol style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                {['Open your laptop for the video call','Open shadow-ai.com/mobile on your phone','Log in with the same account','Glance at your phone for AI talking points'].map((s,i)=>(
                  <li key={i} style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,color:'var(--text-secondary)'}}>
                    <span style={{width:22,height:22,background:'var(--gradient-accent)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'white',flexShrink:0}}>{i+1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <a href="/mobile" target="_blank" rel="noreferrer" className="btn-primary" style={{textDecoration:'none',display:'inline-flex',gap:8}}>
                <Smartphone size={15}/> Open Mobile View
              </a>
            </div>
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {activeTab === 'settings' && (
          <div className="dash-section">
            <div className="dash-section__header"><h2>Settings</h2><p>Customise your Shadow AI experience</p></div>
            <div className="dash-settings-grid">
              <div className="card" style={{padding:22}}>
                <h3 style={{display:'flex',alignItems:'center',gap:7,fontSize:14,fontWeight:700,marginBottom:6}}><Brain size={15}/> Default AI Model</h3>
                <p style={{fontSize:12,color:'var(--text-secondary)',marginBottom:14}}>Choose which AI model responds during your sessions</p>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {AI_MODELS.map(m => (
                    <button key={m.id} onClick={()=>setLocalSettings({...localSettings,aiModel:m.id})}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'9px 13px',border:`1px solid ${localSettings.aiModel===m.id?m.color:'var(--border-subtle)'}`,background:localSettings.aiModel===m.id?m.color+'15':'var(--bg-secondary)',color:localSettings.aiModel===m.id?m.color:'var(--text-secondary)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .2s'}}>
                      <Brain size={13}/> {m.label}
                      <span style={{fontSize:10,padding:'1px 7px',borderRadius:3,background:m.color+'22',color:m.color,marginLeft:'auto'}}>{m.badge}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card" style={{padding:22}}>
                <h3 style={{display:'flex',alignItems:'center',gap:7,fontSize:14,fontWeight:700,marginBottom:6}}><Globe size={15}/> Language</h3>
                <p style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>Language Shadow AI listens and responds in</p>
                <select className="input" value={localSettings.language||'English'} onChange={e=>setLocalSettings({...localSettings,language:e.target.value})}>
                  {LANGUAGES.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              {[
                { key:'autoDetectMeetings', icon:<Bell size={15}/>, title:'Auto-Detect Meetings', desc:'Detect WebRTC/VoIP calls and prompt activation automatically' },
                { key:'autoGenerateAnswers', icon:<Zap size={15}/>, title:'Auto-Generate Answers', desc:'Automatically generate AI answer when a question is detected' },
              ].map(s => (
                <div key={s.key} className="card" style={{padding:22}}>
                  <h3 style={{display:'flex',alignItems:'center',gap:7,fontSize:14,fontWeight:700,marginBottom:6}}>{s.icon} {s.title}</h3>
                  <p style={{fontSize:12,color:'var(--text-secondary)',marginBottom:14}}>{s.desc}</p>
                  <label className="settings-toggle">
                    <input type="checkbox" checked={localSettings[s.key]||false} onChange={e=>setLocalSettings({...localSettings,[s.key]:e.target.checked})}/>
                    <span className="settings-toggle__slider"/>
                    <span style={{fontSize:13}}>{localSettings[s.key]?'Enabled':'Disabled'}</span>
                  </label>
                </div>
              ))}
              <div className="card" style={{padding:22}}>
                <h3 style={{display:'flex',alignItems:'center',gap:7,fontSize:14,fontWeight:700,marginBottom:6}}><Shield size={15}/> Dynamic Process Masking</h3>
                <p style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>Replace app name in OS Task Manager with a custom alias</p>
                <label className="settings-toggle" style={{marginBottom:10}}>
                  <input type="checkbox" checked={localSettings.dynamicProcessMask||false} onChange={e=>setLocalSettings({...localSettings,dynamicProcessMask:e.target.checked})}/>
                  <span className="settings-toggle__slider"/>
                  <span style={{fontSize:13}}>{localSettings.dynamicProcessMask?'Enabled':'Disabled'}</span>
                </label>
                {localSettings.dynamicProcessMask && (
                  <select className="input" value={localSettings.processAlias||'chrome_helper'} onChange={e=>setLocalSettings({...localSettings,processAlias:e.target.value})}>
                    {PROC_ALIASES.map(a=><option key={a}>{a}</option>)}
                  </select>
                )}
              </div>
              <div className="card" style={{padding:22}}>
                <h3 style={{display:'flex',alignItems:'center',gap:7,fontSize:14,fontWeight:700,marginBottom:6}}><FileText size={15}/> Cheat Sheet Format</h3>
                <p style={{fontSize:12,color:'var(--text-secondary)',marginBottom:12}}>How AI answers display during live sessions</p>
                <div style={{display:'flex',gap:7}}>
                  {['bullets','full','code-only'].map(m=>(
                    <button key={m} onClick={()=>setLocalSettings({...localSettings,cheatSheetMode:m})}
                      style={{flex:1,padding:'8px',border:`1px solid ${localSettings.cheatSheetMode===m?'var(--accent-primary)':'var(--border-subtle)'}`,background:localSettings.cheatSheetMode===m?'rgba(124,58,237,.1)':'var(--bg-secondary)',color:localSettings.cheatSheetMode===m?'var(--accent-tertiary)':'var(--text-muted)',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600,transition:'all .2s'}}>
                      {m==='bullets'?'Bullets':m==='full'?'Full':'Code'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn-primary" style={{marginTop:20}} onClick={handleSaveSettings}>
              <Check size={15}/> Save Settings
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
