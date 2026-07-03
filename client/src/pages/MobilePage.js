import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Zap, Brain, Mic, Copy, RefreshCw, Eye, EyeOff, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import './MobilePage.css';

const SAMPLE_QS = [
  "Tell me about yourself and your background.",
  "What's your greatest technical achievement?",
  "How do you handle disagreements with your team?",
  "Describe a time you improved system performance significantly.",
  "How would you design a URL shortener at scale?",
];

export default function MobilePage() {
  const { user } = useSelector(s => s.auth);
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [generating, setGenerating] = useState(false);
  const [visible, setVisible] = useState(true);
  const [fontSize, setFontSize] = useState(15);
  const [opacity, setOpacity] = useState(95);
  const [sampleQ, setSampleQ] = useState(0);

  const generateAnswer = async (q) => {
    const target = q || question;
    if (!target.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 600,
          system: 'You are Shadow AI on a mobile companion device. Give concise, bulleted talking points for interview answers. Max 5 bullets. Start each with a bold keyword.',
          messages: [{ role: 'user', content: `Interview question: "${target}"` }]
        })
      });
      const data = await res.json();
      setAnswer(data.content?.[0]?.text || 'Unable to generate. Check connection.');
    } catch {
      setAnswer('• Strong technical foundation\n• Collaborative team player\n• Results-driven approach\n• Continuous learner\n• Clear communicator');
    } finally { setGenerating(false); }
  };

  const copyAnswer = () => { navigator.clipboard.writeText(answer); toast.success('Copied!'); };

  useEffect(() => {
    document.title = 'Shadow AI — Mobile Companion';
  }, []);

  return (
    <div className="mobile-page" style={{ opacity: opacity / 100 }}>
      {/* Header */}
      <div className="mobile-header">
        <div className="mobile-logo">
          <Zap size={16} fill="currentColor" color="var(--accent-secondary)" />
          <span>Shadow<b>AI</b> Mobile</span>
        </div>
        <div className="mobile-header-actions">
          <button className="mobile-icon-btn" onClick={() => setVisible(!visible)}>
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <div className="mobile-dot-live"><span className="dot-green" /> Live</div>
        </div>
      </div>

      {visible && (
        <>
          {/* Question input */}
          <div className="mobile-section">
            <label className="mobile-label">Question</label>
            <textarea
              className="mobile-input"
              placeholder="Type or paste interview question..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={3}
            />
            <div className="mobile-sample-qs">
              {SAMPLE_QS.slice(0, 3).map((q, i) => (
                <button key={i} className="mobile-sample-q"
                  onClick={() => { setQuestion(q); generateAnswer(q); }}>
                  {q.slice(0, 32)}…
                </button>
              ))}
            </div>
            <button
              className="btn-primary mobile-gen-btn"
              onClick={() => generateAnswer(question)}
              disabled={generating || !question.trim()}
            >
              {generating ? <><RefreshCw size={14} className="spin-icon" /> Generating...</> : <><Brain size={14} /> Get Answer</>}
            </button>
          </div>

          {/* Answer */}
          {answer && (
            <div className="mobile-answer-section">
              <div className="mobile-answer-header">
                <label className="mobile-label">AI Answer</label>
                <button className="mobile-copy-btn" onClick={copyAnswer}><Copy size={13} /> Copy</button>
              </div>
              <div className="mobile-answer" style={{ fontSize }}>
                {answer}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mobile-controls">
            <div className="mobile-control">
              <label>Font Size: {fontSize}px</label>
              <input type="range" min={12} max={22} value={fontSize} onChange={e => setFontSize(+e.target.value)} />
            </div>
            <div className="mobile-control">
              <label>Opacity: {opacity}%</label>
              <input type="range" min={30} max={100} value={opacity} onChange={e => setOpacity(+e.target.value)} />
            </div>
          </div>

          {/* Tips */}
          <div className="mobile-tips">
            <div className="mobile-tip">📱 Position this device beside your main screen</div>
            <div className="mobile-tip">🔇 Mute this device's audio</div>
            <div className="mobile-tip">👁️ Glance naturally — don't stare</div>
          </div>
        </>
      )}

      {!visible && (
        <div className="mobile-hidden-msg">
          <Eye size={24} color="var(--text-muted)" />
          <p>Panel hidden. Tap eye icon to show.</p>
        </div>
      )}

      <div className="mobile-footer">
        <Smartphone size={12} /> Shadow AI Mobile Companion · <Link to="/">Full App</Link>
      </div>
    </div>
  );
}
