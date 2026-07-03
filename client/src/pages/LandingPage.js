import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Shield, Mic, Code2, Brain, Star, ChevronDown,
  Check, Globe, Upload, FileText, Bell, StickyNote, Play,
  Sparkles, ArrowRight, Award, TrendingUp, MessageSquare,
  Users, X, Youtube, Twitter, Linkedin, Instagram, Smartphone
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import './LandingPage.css';

/* ─── Data ─────────────────────────────────────────────── */
const PLATFORMS = [
  { name: 'Zoom',            emoji: '📹' },
  { name: 'Google Meet',     emoji: '📺' },
  { name: 'Microsoft Teams', emoji: '💼' },
  { name: 'Webex',           emoji: '🔷' },
  { name: 'Amazon Chime',    emoji: '🔔' },
  { name: 'HackerRank',      emoji: '💻' },
  { name: 'LeetCode',        emoji: '⚡' },
  { name: 'Phone Screen',    emoji: '📱' },
  { name: 'CoderPad',        emoji: '🖊️' },
  { name: 'Karat',           emoji: '💎' },
];

const FEATURES = [
  {
    icon: <Mic size={22} />, color: '#7c3aed',
    title: 'Blazing Fast Transcription',
    desc: 'State-of-the-art speech recognition converts your interview audio to text in real-time, under 300ms latency.'
  },
  {
    icon: <Brain size={22} />, color: '#a855f7',
    title: '100% Accurate AI Responses',
    desc: 'Powered by the latest GPT-5, Claude 4, and Gemini 2.5 models. Choose which AI engine answers your questions.'
  },
  {
    icon: <Code2 size={22} />, color: '#6366f1',
    title: 'Full Coding Interview Support',
    desc: 'Handles LeetCode, HackerRank, and screen-shared code questions. Outputs optimized solutions with explanations.'
  },
  {
    icon: <Upload size={22} />, color: '#ec4899',
    title: 'Resume-Matched Answers',
    desc: 'Upload your resume once. Every AI answer is perfectly tailored to your background and experience level.'
  },
  {
    icon: <FileText size={22} />, color: '#10b981',
    title: 'Knowledge Base Documents',
    desc: 'Upload job descriptions, company notes, or reference docs. Shadow AI references them for hyper-accurate answers.'
  },
  {
    icon: <Bell size={22} />, color: '#f59e0b',
    title: 'Auto-Detect Meetings',
    desc: 'Runs silently in the background. Automatically detects your calls and prompts you to activate Shadow AI.'
  },
  {
    icon: <StickyNote size={22} />, color: '#06b6d4',
    title: 'AI-Generated Notes',
    desc: 'After every session, get a smart summary: key points, action items, and decisions — nothing gets lost.'
  },
  {
    icon: <Globe size={22} />, color: '#84cc16',
    title: '50+ Languages',
    desc: 'Shadow AI listens and responds in your language. Perfect for interviews anywhere in the world.'
  },
];

const PRIVACY_ITEMS = [
  'Invisible on Screen Share',
  'Invisible in Dock / Taskbar',
  'Invisible in Task Manager',
  'Invisible to Tab Switching',
  'Cursor Undetectability',
  'Undetectable by Proctoring Software',
];

const TESTIMONIALS = [
  { name: 'Rahul S.',    email: 'rahul.s...@gmail.com',  text: 'I had no issues during the interview. Shadow AI was well-designed and easy to use. It helped me land my dream job at a top tech company!', date: 'Apr 29, 2025', stars: 5 },
  { name: 'Jane D.',     email: 'janed...@gmail.com',     text: 'If I\'m honest, there were absolutely zero faults. It is really a game changer. I\'ve already recommended it to all my friends!', date: 'Jan 17, 2025', stars: 5 },
  { name: 'Alex K.',     email: 'alex.k...@gmail.com',   text: 'Shadow AI is incredible. Got answers in real-time, completely invisible to the interviewer. Got 3 offers in 2 weeks!', date: 'Mar 12, 2025', stars: 5 },
  { name: 'Priya M.',    email: 'priya.m...@gmail.com',  text: 'As a non-native English speaker, Shadow AI helped me understand questions and respond confidently. Absolutely life-changing.', date: 'Feb 8, 2025', stars: 5 },
  { name: 'Vikram R.',   email: 'vikram.r...@gmail.com', text: 'The coding interview support is phenomenal. It captured the shared screen question and gave me a perfect solution instantly.', date: 'May 3, 2025', stars: 5 },
  { name: 'Sarah L.',    email: 'sarah.l...@gmail.com',  text: 'I was skeptical at first but Shadow AI delivered. Used it for 4 rounds at FAANG and got an offer. Worth every penny.', date: 'Jun 1, 2025', stars: 5 },
];

const FAQS = [
  { q: 'What languages does Shadow AI support?', a: 'Shadow AI supports 50+ languages including English, Hindi, Spanish, French, German, Chinese, Japanese, Korean, Portuguese, Arabic, and more. You can switch languages during a session at any time.' },
  { q: 'Can Shadow AI listen in one language and respond in another?', a: 'Currently Shadow AI responds in the same language it listens in for maximum accuracy. Multi-language mode with separate input/output is on our roadmap.' },
  { q: 'Does Shadow AI support coding interviews?', a: 'Yes! Shadow AI fully supports coding interviews. It can listen for verbally described questions AND capture screen-shared LeetCode/HackerRank-style problems, then generate optimized solutions with time/space complexity explanations.' },
  { q: 'Can I use headphones during the call?', a: 'Absolutely. Shadow AI listens to system audio directly, not speaker output, so headphones work perfectly with zero configuration needed.' },
  { q: 'Can I provide extra context during the call?', a: 'Yes. Use the Context Injector to paste job descriptions, company info, or custom notes mid-session. You can also manually type any question to get an instant AI answer.' },
  { q: 'Is Shadow AI detectable by proctoring software?', a: 'No. Shadow AI operates at the system level and is completely invisible to proctoring tools, screen-share software, and recording applications. We verify this against all major platforms daily.' },
  { q: 'How does the credit system work?', a: 'Each credit equals one 30-minute session. Starting a session deducts 0.5 credits. One minute before expiry it auto-extends and deducts another 0.5 credits. Credits never expire. Subscribe for unlimited access.' },
  { q: 'What is your refund policy?', a: '7-day full refund for unused or accidental purchases. One refund per user lifetime. Sessions already activated are non-refundable as service delivery begins immediately.' },
  { q: 'Can I update answers mid-call?', a: 'Yes! The Context Injector lets you paste any question or additional information during your live session for on-the-fly answer generation.' },
  { q: 'Does Shadow AI have a mobile app?', a: 'Shadow AI has a mobile companion view at /mobile — open it on your phone as a secondary screen during interviews for a glance-friendly answer display.' },
];

const UPLOAD_FEATURES = [
  { icon: '📄', title: 'Upload your Resume', desc: 'Shadow AI uses your resume to personalise every answer to match your specific background and experience.' },
  { icon: '📋', title: 'Auto Generate Answers', desc: 'Based on your resume and the question detected, Shadow AI automatically generates the perfect tailored response.' },
];

const DOC_FEATURES = [
  { icon: '📁', title: 'Documents', desc: 'Upload job descriptions, technical docs, or company research. Shadow AI references them for context-aware answers.' },
  { icon: '🔔', title: 'Auto-detect meetings', desc: 'Shadow AI runs as a background daemon, detecting your calls and prompting activation automatically.' },
  { icon: '📝', title: 'AI notes', desc: 'After every session, Shadow AI generates structured notes including key points, action items, and decisions.' },
];

/* ─── Sub-components ─────────────────────────────────────── */



function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`}>
      <button className="faq-item__q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <ChevronDown size={17} className={`faq-item__chevron ${open ? 'faq-item__chevron--open' : ''}`} />
      </button>
      {open && <div className="faq-item__a">{a}</div>}
    </div>
  );
}

function Counter({ target, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let s = 0;
        const step = Math.ceil(target / 80);
        const t = setInterval(() => {
          s = Math.min(s + step, target);
          setCount(s);
          if (s >= target) clearInterval(t);
        }, 16);
        obs.disconnect();
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Main Landing Page ──────────────────────────────────── */
export default function LandingPage() {
  const [heroMode, setHeroMode] = useState('non-coding');
  const [pricingCycle, setPricingCycle] = useState('subscription');
  const [faqTab, setFaqTab] = useState('Features');
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <div className="lp">
      <Navbar />

      {/* ══ HERO ═══════════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero__glow-1" />
        <div className="lp-hero__glow-2" />
        <div className="lp-hero__grid" />

        <div className="container lp-hero__inner">
          <div className="lp-hero__left">
            {/* Mode toggle — exactly like Parakeet */}
            <div className="lp-hero__mode-toggle">
              <button className={heroMode === 'non-coding' ? 'active' : ''} onClick={() => setHeroMode('non-coding')}>Non-Coding</button>
              <button className={heroMode === 'coding' ? 'active' : ''} onClick={() => setHeroMode('coding')}>
                <Code2 size={13} /> Coding
              </button>
              <div className="lp-hero__mode-undetectable">
                <Shield size={11} /> 100% Undetectable
              </div>
            </div>

            <h1 className="lp-hero__headline">
              Your real-time<br />
              <span className="gradient-text">AI {heroMode === 'coding' ? 'Coding' : 'Interview'} Assistant</span>
            </h1>

            <p className="lp-hero__sub">
              Automatically get an answer to every job interview question with the world's best AI models. 100% private and undetectable.
            </p>

            <div className="lp-hero__ctas">
              <Link to="/auth/signup" className="btn-primary lp-hero__main-cta">
                Try for free <ArrowRight size={18} />
              </Link>
              <a href="#pricing" className="lp-hero__pricing-link">
                <span className="lp-hero__no-card">NO CREDIT CARD REQUIRED</span>
                Credits, Subscriptions, Lifetime
              </a>
            </div>

            {/* Social proof row */}
            <div className="lp-hero__proof">
              <div className="lp-hero__avatars">
                {['R','J','A','P','V'].map((l, i) => (
                  <div key={i} className="lp-hero__avatar" style={{ zIndex: 5 - i }}>{l}</div>
                ))}
              </div>
              <div className="lp-hero__proof-text">
                <div className="lp-hero__stars">{'★★★★★'}</div>
                <span>Used by <strong>1,534,135+</strong> people · 4.86 · 340,066+ reviews</span>
              </div>
            </div>
          </div>

          {/* Demo card */}
          <div className="lp-hero__right">
            <div className="lp-hero__demo-card">
              <div className="lp-hero__demo-header">
                <div className="lp-hero__demo-dots">
                  <span style={{ background: '#ff5f57' }} />
                  <span style={{ background: '#febc2e' }} />
                  <span style={{ background: '#28c840' }} />
                </div>
                <span className="lp-hero__demo-title">Shadow AI — Live Session</span>
                <div className="lp-hero__demo-live"><span className="dot-green" />Live</div>
              </div>
              <div className="lp-hero__demo-body">
                {heroMode === 'non-coding' ? (
                  <>
                    <div className="lp-hero__demo-q">
                      <div className="lp-hero__demo-qlabel"><Mic size={11} /> Question Detected</div>
                      <p>"Tell me about a time you led a team through a difficult technical challenge."</p>
                    </div>
                    <div className="lp-hero__demo-a">
                      <div className="lp-hero__demo-alabel"><Sparkles size={11} /> Shadow AI</div>
                      <p>At my previous company, our payment service experienced a critical outage during Black Friday. I immediately assembled a cross-functional team, set up a war room, and divided responsibilities — infra, code, and comms. Within 90 minutes we identified a database connection pool exhaustion bug and deployed a hotfix. Revenue loss was minimized by 85%. The incident led to our new SLO framework.</p>
                      <div className="lp-hero__demo-typing"><span /><span /><span /></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="lp-hero__demo-q">
                      <div className="lp-hero__demo-qlabel"><Code2 size={11} /> Screen Capture — LeetCode</div>
                      <p>"Two Sum: Return indices of two numbers that add to target."</p>
                    </div>
                    <div className="lp-hero__demo-a">
                      <div className="lp-hero__demo-alabel"><Sparkles size={11} /> Shadow AI — Solution</div>
                      <pre className="lp-hero__demo-code">{`def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
# O(n) time, O(n) space`}</pre>
                    </div>
                  </>
                )}
              </div>
              <div className="lp-hero__demo-footer">
                <span><Brain size={11} /> GPT-5</span>
                <span>Credits: 9.5 remaining</span>
              </div>
            </div>

            {/* Video play button */}
            <button className="lp-hero__video-btn" onClick={() => setVideoOpen(true)}>
              <div className="lp-hero__video-icon"><Play size={20} fill="white" /></div>
              <div>
                <div className="lp-hero__video-label">Watch Demo</div>
                <div className="lp-hero__video-sub">See Shadow AI in action</div>
              </div>
            </button>
          </div>
        </div>

        {/* Verified badge */}
        <div className="lp-hero__verified">
          <Award size={15} />
          <span>Verified #1 by SimilarWeb — based on total website visits · Most Interview Assistant visits worldwide</span>
        </div>
      </section>

      {/* Video Modal */}
      {videoOpen && (
        <div className="lp-video-modal" onClick={() => setVideoOpen(false)}>
          <div className="lp-video-modal__box" onClick={e => e.stopPropagation()}>
            <button className="lp-video-modal__close" onClick={() => setVideoOpen(false)}><X size={20} /></button>
            <iframe
              src="https://www.youtube.com/embed/fXFe0e96_qQ?autoplay=1"
              title="Shadow AI Demo"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="lp-video-modal__iframe"
            />
          </div>
        </div>
      )}

      {/* ══ STATS BAR ════════════════════════════════════════ */}
      <section className="lp-stats">
        <div className="container lp-stats__grid">
          {[
            { label: 'Users Worldwide',   target: 1534135, suffix: '+' },
            { label: '5-Star Reviews',    target: 340066,  suffix: '+' },
            { label: 'Languages',         target: 50,      suffix: '+' },
            { label: 'Undetectability',   target: 99,      suffix: '%' },
          ].map(s => (
            <div key={s.label} className="lp-stats__item">
              <div className="lp-stats__value gradient-text">
                <Counter target={s.target} suffix={s.suffix} />
              </div>
              <div className="lp-stats__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ #1 BADGE ═════════════════════════════════════════ */}
      <section className="lp-badge-section">
        <div className="container">
          <div className="lp-badge-inner">
            <div className="lp-badge-icon"><Award size={32} color="#fbbf24" /></div>
            <div>
              <h2 className="lp-badge-title">#1 Interview Assistant on the market</h2>
              <p className="lp-badge-sub">Based on the number of website visits — verified by SimilarWeb</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CODING FEATURE ═══════════════════════════════════ */}
      <section className="lp-coding" id="features">
        <div className="container">
          <div className="lp-coding__inner">
            <div className="lp-coding__left">
              <div className="lp-section-tag"><Code2 size={13} /> Programming</div>
              <h2 className="lp-section-title">Full Coding Interview<br /><span className="gradient-text">Support</span></h2>
              <p className="lp-section-sub">
                Shadow AI works for coding interviews. It listens for coding questions spoken aloud AND captures the screen if a LeetCode-style question is being screen-shared with you.
              </p>
              <ul className="lp-coding__list">
                {['Captures screen-shared LeetCode / HackerRank problems','Generates optimized solutions with complexity analysis','Explains approach step-by-step as you code','Supports Python, JavaScript, Java, C++, Go, and more','Works with CoderPad, HackerRank, LeetCode, Karat'].map((f, i) => (
                  <li key={i}><Check size={15} color="#6ee7b7" /> {f}</li>
                ))}
              </ul>
              <a href="#" className="lp-coding__video-link">
                <Play size={14} fill="currentColor" /> Video tutorial: Programming
              </a>
            </div>
            <div className="lp-coding__right">
              <div className="lp-coding__preview card">
                <div className="lp-coding__preview-header">
                  <Code2 size={14} color="var(--accent-secondary)" />
                  <span>Screen Capture Active</span>
                  <div className="lp-coding__preview-live"><span className="dot-green" /> Capturing</div>
                </div>
                <div className="lp-coding__preview-problem">
                  <div className="lp-coding__preview-tag">LeetCode · Medium</div>
                  <p>"Given a binary tree, return the level order traversal of its nodes' values."</p>
                </div>
                <div className="lp-coding__preview-solution">
                  <div className="lp-coding__preview-sol-label"><Sparkles size={11} /> Generated Solution</div>
                  <pre>{`from collections import deque

def levelOrder(root):
    if not root: return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result
# O(n) time · O(n) space`}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PLATFORMS ════════════════════════════════════════ */}
      <section className="lp-platforms">
        <div className="container">
          <div className="lp-section-tag" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <Globe size={13} /> Compatibility
          </div>
          <h2 className="lp-section-title" style={{ textAlign: 'center' }}>
            Works with any <span className="gradient-text">interview platform</span>
          </h2>
          <p className="lp-section-sub" style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto 40px' }}>
            Shadow AI works with any video or coding platform including Zoom, Google Meet, Teams, HackerRank, and LeetCode.
          </p>
          <a href="#" className="lp-platforms__video-link">
            <Play size={13} fill="currentColor" /> Video tutorial: How to connect
          </a>
        </div>
        <div className="lp-platforms__scroll">
          <div className="lp-platforms__track">
            {[...PLATFORMS, ...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <div key={i} className="lp-platform-pill">
                <span>{p.emoji}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES GRID ════════════════════════════════════ */}
      <section className="lp-features-grid">
        <div className="container">
          <div className="lp-section-tag" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <Sparkles size={13} /> Features
          </div>
          <h2 className="lp-section-title" style={{ textAlign: 'center' }}>
            Everything you need to<br /><span className="gradient-text">ace every interview</span>
          </h2>
          <div className="lp-features-grid__grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card card">
                <div className="lp-feature-card__icon" style={{ background: f.color + '20', color: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RESUME UPLOAD ════════════════════════════════════ */}
      <section className="lp-resume">
        <div className="container">
          <div className="lp-resume__grid">
            {UPLOAD_FEATURES.map((f, i) => (
              <div key={i} className="lp-resume__card card">
                <div className="lp-resume__card-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {i === 0 && (
                  <div className="lp-resume__upload-demo">
                    <div className="lp-resume__file">
                      <FileText size={18} color="var(--accent-secondary)" />
                      <span>resume_2025.pdf</span>
                      <Check size={14} color="#10b981" />
                    </div>
                    <div className="lp-resume__file-hint">Uploaded · Active for all sessions</div>
                  </div>
                )}
                {i === 1 && (
                  <div className="lp-resume__auto-demo">
                    <div className="lp-resume__auto-badge"><Sparkles size={12} /> Auto-generating...</div>
                    <div className="lp-resume__auto-preview">
                      Based on your 5+ years in backend engineering, I built a recommendation engine that improved click-through rates by 34%...
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Docs / Auto-detect / AI notes row */}
          <div className="lp-resume__docs-grid">
            {DOC_FEATURES.map((f, i) => (
              <div key={i} className="lp-resume__doc-card card">
                <div className="lp-resume__doc-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ═════════════════════════════════════ */}
      <section className="lp-testimonials">
        <div className="container">
          <div className="lp-section-tag" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <MessageSquare size={13} /> Testimonials
          </div>
          <h2 className="lp-section-title" style={{ textAlign: 'center' }}>
            People love <span className="gradient-text">Shadow AI</span> 💬
          </h2>
          <div className="lp-testimonials__grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="lp-testimonial-card card">
                <div className="lp-testimonial-stars">{'★'.repeat(t.stars)}</div>
                <p className="lp-testimonial-text">"{t.text}"</p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <div className="lp-testimonial-name">{t.name}</div>
                    <div className="lp-testimonial-email">{t.email}</div>
                  </div>
                  <div className="lp-testimonial-date">{t.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRIVACY SECTION ══════════════════════════════════ */}
      <section className="lp-privacy" id="privacy">
        <div className="container">
          <div className="lp-privacy__inner">
            <div className="lp-privacy__left">
              <div className="lp-section-tag"><Shield size={13} /> Privacy First</div>
              <h2 className="lp-section-title">100% Private &amp;<br /><span className="gradient-text">Undetectable</span></h2>
              <p className="lp-section-sub" style={{ textAlign: 'left' }}>
                Shadow AI operates invisibly at the system level. It cannot be seen by interviewers, proctoring tools, screen-sharing software, or recording applications.
              </p>
              <ul className="lp-privacy__list">
                {PRIVACY_ITEMS.map((item, i) => (
                  <li key={i}>
                    <div className="lp-privacy__check"><Check size={13} /></div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth/signup" className="btn-primary" style={{ marginTop: 28, display: 'inline-flex', gap: 8 }}>
                Try Shadow AI Free <ArrowRight size={17} />
              </Link>
            </div>
            <div className="lp-privacy__right">
              <h4>Verified Undetectable On:</h4>
              <div className="lp-privacy__platforms">
                {PLATFORMS.slice(0, 7).map((p, i) => (
                  <div key={i} className="lp-privacy__platform card">
                    <span className="lp-privacy__platform-emoji">{p.emoji}</span>
                    <div>
                      <div className="lp-privacy__platform-name">{p.name}</div>
                      <div className="lp-privacy__platform-status">
                        <span className="dot-green" /> Undetectable, verified today
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING ══════════════════════════════════════════ */}
      <section className="lp-pricing" id="pricing">
        <div className="container">
          <div className="lp-section-tag" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <Zap size={13} /> Pricing
          </div>
          <h2 className="lp-section-title" style={{ textAlign: 'center' }}>
            Buy Credits or <span className="gradient-text">Go Unlimited ✨</span>
          </h2>
          <p className="lp-section-sub" style={{ textAlign: 'center', margin: '0 auto 32px' }}>
            Start free. Scale when you need more.
          </p>

          {/* Toggle */}
          <div className="lp-pricing__toggle">
            <button className={pricingCycle === 'credits' ? 'active' : ''} onClick={() => setPricingCycle('credits')}>Credits</button>
            <button className={pricingCycle === 'subscription' ? 'active' : ''} onClick={() => setPricingCycle('subscription')}>Subscription</button>
            <button className={pricingCycle === 'lifetime' ? 'active' : ''} onClick={() => setPricingCycle('lifetime')}>Lifetime</button>
          </div>

          {pricingCycle === 'credits' && (
            <div className="lp-pricing__grid">
              {[
                { name: '3 Credits', inr: '₹3,690', usd: '$38.90', hours: '~1.5 hours', credits: 3 },
                { name: '7 Credits', inr: '₹7,380', usd: '$77.90', hours: '~3.5 hours', credits: 7, popular: true },
                { name: '15 Credits', inr: '₹11,070', usd: '$116.90', hours: '~7.5 hours', credits: 15 },
              ].map(p => (
                <div key={p.name} className={`lp-pricing__card card ${p.popular ? 'lp-pricing__card--popular' : ''}`}>
                  {p.popular && <div className="lp-pricing__popular-badge">Most Popular</div>}
                  <div className="lp-pricing__card-name">{p.name}</div>
                  <div className="lp-pricing__card-price">{p.inr}</div>
                  <div className="lp-pricing__card-usd">{p.usd} · {p.hours}</div>
                  <ul className="lp-pricing__features">
                    <li><Check size={13} /> {p.credits} call sessions (30 min each)</li>
                    <li><Check size={13} /> All AI models included</li>
                    <li><Check size={13} /> Resume matching</li>
                    <li><Check size={13} /> AI notes after sessions</li>
                    <li><Check size={13} /> Credits never expire</li>
                  </ul>
                  <Link to="/auth/signup" className={`btn-primary lp-pricing__cta ${!p.popular ? 'lp-pricing__cta--secondary' : ''}`}>
                    Get Credits
                  </Link>
                </div>
              ))}
            </div>
          )}

          {pricingCycle === 'subscription' && (
            <div className="lp-pricing__sub-grid">
              <div className="lp-pricing__card card">
                <div className="lp-pricing__card-name">Monthly</div>
                <div className="lp-pricing__card-price">₹9,470</div>
                <div className="lp-pricing__card-usd">$99.90 USD / month</div>
                <div className="lp-pricing__unlimited-tag">Unlimited Calls</div>
                <ul className="lp-pricing__features">
                  {['Unlimited call sessions','GPT-5, Claude 4, Gemini 2.5','Resume matching','Auto-detect meetings','AI notes after calls','Cancel anytime'].map((f,i) => <li key={i}><Check size={13} />{f}</li>)}
                </ul>
                <Link to="/auth/signup" className="btn-secondary lp-pricing__cta" style={{ justifyContent: 'center' }}>Subscribe Monthly</Link>
              </div>
              <div className="lp-pricing__card lp-pricing__card--popular card">
                <div className="lp-pricing__popular-badge">Save 75%</div>
                <div className="lp-pricing__card-name">Yearly</div>
                <div className="lp-pricing__card-price">₹28,420</div>
                <div className="lp-pricing__card-usd">$299.90 USD / year</div>
                <div className="lp-pricing__unlimited-tag">Unlimited Calls · Save 75%</div>
                <ul className="lp-pricing__features">
                  {['Everything in Monthly','Save 75% vs monthly','Priority support','AI Resume Tailor access','Affiliate program access','HITL 1 session bonus'].map((f,i) => <li key={i}><Check size={13} />{f}</li>)}
                </ul>
                <Link to="/auth/signup" className="btn-primary lp-pricing__cta" style={{ justifyContent: 'center' }}>Subscribe Yearly</Link>
              </div>
            </div>
          )}

          {pricingCycle === 'lifetime' && (
            <div style={{ maxWidth: 420, margin: '0 auto' }}>
              <div className="lp-pricing__card lp-pricing__card--popular card" style={{ padding: 36 }}>
                <div className="lp-pricing__popular-badge">Best Value Forever</div>
                <div className="lp-pricing__card-name">Lifetime Access</div>
                <div className="lp-pricing__card-price">₹74,990</div>
                <div className="lp-pricing__card-usd">$799 USD · One-time payment</div>
                <div className="lp-pricing__unlimited-tag">Lifetime Unlimited Access</div>
                <ul className="lp-pricing__features">
                  {['Unlimited calls forever','All future features included','2 free HITL sessions','Priority support','Affiliate program — top tier','B2B white-label rights','Never pay again'].map((f,i) => <li key={i}><Check size={13} />{f}</li>)}
                </ul>
                <Link to="/auth/signup" className="btn-primary lp-pricing__cta" style={{ justifyContent: 'center' }}>Get Lifetime Access</Link>
              </div>
            </div>
          )}

          {/* Payment methods */}
          <div className="lp-pricing__payments">
            <div className="lp-pricing__payments-label">Accepted Payment Methods</div>
            <div className="lp-pricing__payments-grid">
              {['💳 Visa','💳 Mastercard','💳 Amex','🍎 Apple Pay','🔵 Google Pay','📱 UPI','📱 GPay','📱 PhonePe'].map(p => (
                <span key={p} className="lp-pricing__payment-pill">{p}</span>
              ))}
            </div>
          </div>

          {/* Free trial note */}
          <div className="lp-pricing__free-note">
            <div className="lp-pricing__free-item"><Check size={14} color="#6ee7b7" /> 7-Day Unused Refund</div>
            <div className="lp-pricing__free-item"><Check size={14} color="#6ee7b7" /> Cancel Anytime</div>
            <div className="lp-pricing__free-item"><Check size={14} color="#6ee7b7" /> 10 Free Sessions To Start</div>
            <div className="lp-pricing__free-item"><Check size={14} color="#6ee7b7" /> 1 Free 45-Minute Call</div>
          </div>
        </div>
      </section>

      {/* ══ CREATOR PROGRAM ══════════════════════════════════ */}
      <section className="lp-creator" id="creator">
        <div className="container">
          <div className="lp-creator__inner card">
            <div className="lp-creator__left">
              <div className="lp-section-tag"><TrendingUp size={13} /> Earn Money</div>
              <h2 className="lp-section-title" style={{ marginTop: 12 }}>
                Become a Shadow AI Creator<br />earn <span className="gradient-text">$600–$4,000+</span> per month
              </h2>
              <ul className="lp-creator__list">
                {[
                  'Get paid for every video you post about Shadow AI',
                  'Earn bonuses up to $2,000 for viral videos (1M+ views)',
                  'Step-by-step guidance from our team',
                  '30% lifetime recurring affiliate commission',
                  'Become a full-time content creator'
                ].map((item, i) => (
                  <li key={i}><Check size={15} color="#6ee7b7" /> {item}</li>
                ))}
              </ul>
              <div className="lp-creator__platforms">
                <Youtube size={22} color="#ff0000" />
                <Instagram size={22} color="#e1306c" />
                <Twitter size={22} color="#1da1f2" />
                <span style={{ fontSize: 20 }}>🎵</span>
              </div>
              <Link to="/affiliate" className="btn-primary" style={{ marginTop: 24, display: 'inline-flex', gap: 8 }}>
                Join Creator Program <ArrowRight size={17} />
              </Link>
            </div>
            <div className="lp-creator__right">
              <div className="lp-creator__stat">
                <div className="lp-creator__stat-value gradient-text">$300k+</div>
                <div className="lp-creator__stat-label">Total creator earnings paid</div>
              </div>
              <div className="lp-creator__tiers">
                {[
                  { tier: 'Micro Creator', range: '$600–$1,500/mo', followers: '1K–50K' },
                  { tier: 'Mid Creator',   range: '$1,500–$2,500/mo', followers: '50K–200K' },
                  { tier: 'Macro Creator', range: '$2,500–$4,000+/mo', followers: '200K+' },
                ].map(t => (
                  <div key={t.tier} className="lp-creator__tier">
                    <div className="lp-creator__tier-name">{t.tier}</div>
                    <div className="lp-creator__tier-range">{t.range}</div>
                    <div className="lp-creator__tier-followers">{t.followers}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════ */}
      <section className="lp-faq" id="faq">
        <div className="container">
          <div className="lp-section-tag" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <MessageSquare size={13} /> Support
          </div>
          <h2 className="lp-section-title" style={{ textAlign: 'center' }}>
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>

          <div className="lp-faq__tabs">
            {['Features', 'Privacy', 'Billing', 'Account'].map(t => (
              <button key={t} className={`lp-faq__tab ${faqTab === t ? 'lp-faq__tab--active' : ''}`}
                onClick={() => setFaqTab(t)}>{t}</button>
            ))}
          </div>

          <div className="lp-faq__list">
            {FAQS.slice(0, faqTab === 'Billing' ? 10 : faqTab === 'Privacy' ? 6 : 5).map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════ */}
      <section className="lp-final-cta">
        <div className="lp-final-cta__glow" />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div className="lp-section-tag" style={{ display: 'inline-flex', marginBottom: 16 }}><Sparkles size={13} /> Get Started Today</div>
          <h2 className="lp-section-title">
            Ready to Land Any Dev Role<br />with <span className="gradient-text">100% Undetectable AI?</span>
          </h2>
          <p className="lp-section-sub" style={{ margin: '0 auto 36px' }}>
            Join 1.5+ million professionals who use Shadow AI to ace their interviews.
          </p>
          <div className="lp-final-cta__btns">
            <Link to="/auth/signup" className="btn-primary" style={{ padding: '16px 40px', fontSize: 17 }}>
              Try For Free <ArrowRight size={20} />
            </Link>
            <a href="#pricing" className="btn-secondary" style={{ padding: '16px 40px', fontSize: 17 }}>
              View Pricing
            </a>
          </div>

          {/* Have a question chat widget placeholder */}
          <div className="lp-chat-bubble">
            <MessageSquare size={16} /> HAVE A QUESTION? LET'S CHAT
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
