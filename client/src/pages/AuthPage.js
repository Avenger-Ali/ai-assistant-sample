import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../store/slices/authSlice';
import { Zap, Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Shield, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import './AuthPage.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID ||
  '303034635408-48nb7n71uag1v6b84mkgqissnikbv6gb.apps.googleusercontent.com';

export default function AuthPage() {
  const { mode } = useParams();
  const isSignIn = mode === 'signin';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector(s => s.auth);

  const [form, setForm] = useState({ email:'', password:'', name:'', referralCode:'' });
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);

  // Load Google Identity Services (also loaded in index.html, but double-check here)
  useEffect(() => {
    const check = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        setGisReady(true);
        clearInterval(check);
      }
    }, 200);
    // Safety timeout
    const timeout = setTimeout(() => clearInterval(check), 8000);
    return () => { clearInterval(check); clearTimeout(timeout); };
  }, []);

  useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please fill all required fields'); return; }
    if (!isSignIn && form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (isSignIn) dispatch(login({ email: form.email, password: form.password }));
    else dispatch(register(form));
  };

  /* ── Google OAuth: single robust find-or-create flow ──────────────────
     1. Get Google profile via OAuth popup
     2. POST to /api/auth/register with provider:'google'
     3. Server auto-detects existing user and logs them in instead
        (see server/routes/auth.js — provider==='google' && user exists)
  ───────────────────────────────────────────────────────────────────── */
  const handleGoogleAuth = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_')) {
      toast.error('⚙️ Google Sign-In not configured. Set REACT_APP_GOOGLE_CLIENT_ID in client/.env', { duration: 6000 });
      return;
    }
    if (!gisReady || !window.google?.accounts?.oauth2) {
      toast.error('Google Sign-In is still loading. Please wait a moment and try again.');
      return;
    }

    setGoogleLoading(true);

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (response) => {
          if (response.error) {
            toast.error(`Google sign-in failed: ${response.error}`);
            setGoogleLoading(false);
            return;
          }
          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            });
            if (!profileRes.ok) throw new Error('Failed to fetch Google profile');
            const info = await profileRes.json();

            // Single call — server handles find-or-create for provider:'google'
            const result = await dispatch(register({
              email: info.email,
              name: info.name,
              password: 'google_oauth_' + info.sub,
              provider: 'google',
              referralCode: form.referralCode || undefined,
            }));

            if (result.type.endsWith('fulfilled')) {
              toast.success(`Welcome, ${info.name}! 🎉`);
            } else {
              toast.error(result.payload || 'Google sign-in failed. Please try email/password.');
            }
          } catch (err) {
            toast.error('Google authentication failed: ' + err.message);
          } finally {
            setGoogleLoading(false);
          }
        },
        error_callback: (err) => {
          // User closed popup or other client-side error
          if (err.type !== 'popup_closed') {
            toast.error('Google sign-in error: ' + (err.type || 'unknown'));
          }
          setGoogleLoading(false);
        },
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      toast.error('Could not start Google sign-in: ' + err.message);
      setGoogleLoading(false);
    }
  }, [gisReady, dispatch, form.referralCode]);

  return (
    <div className="auth-page">
      <div className="auth-bg-glow-1" />
      <div className="auth-bg-glow-2" />

      <div className="auth-page__inner">
        <Link to="/" className="auth-logo">
          <div className="auth-logo__icon"><Zap size={18} fill="currentColor" /></div>
          <span>Shadow<span style={{ color:'var(--accent-secondary)' }}>AI</span></span>
        </Link>

        <div className="auth-card">
          <div className="auth-card__header">
            <h1>{isSignIn ? 'Welcome back' : 'Start for free'}</h1>
            <p>{isSignIn ? 'Sign in to your Shadow AI account' : 'Create your account. No credit card required.'}</p>
          </div>

          {!isSignIn && (
            <div className="auth-perks">
              {['10 free interview sessions','1 free 45-min call','All AI models included','100% private & undetectable'].map((p,i) => (
                <div key={i} className="auth-perk">
                  <div className="auth-perk__icon"><Check size={11} /></div>
                  {p}
                </div>
              ))}
            </div>
          )}

          <button className="auth-google-btn" onClick={handleGoogleAuth} disabled={googleLoading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Connecting...' : !gisReady ? 'Loading Google...' : `${isSignIn ? 'Sign in' : 'Sign up'} with Google`}
          </button>

          <div className="auth-divider"><span>or continue with email</span></div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isSignIn && (
              <div className="auth-field">
                <label>Full Name <span className="auth-optional">(optional)</span></label>
                <div className="auth-input-wrap">
                  <User size={15} className="auth-input-icon" />
                  <input type="text" className="input" placeholder="Your name"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    style={{ paddingLeft: 38 }} />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label>Email Address <span className="auth-required">*</span></label>
              <div className="auth-input-wrap">
                <Mail size={15} className="auth-input-icon" />
                <input type="email" className="input" placeholder="you@example.com" required
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ paddingLeft: 38 }} />
              </div>
            </div>

            <div className="auth-field">
              <label>Password <span className="auth-required">*</span></label>
              <div className="auth-input-wrap">
                <Lock size={15} className="auth-input-icon" />
                <input type={showPassword ? 'text' : 'password'} className="input"
                  placeholder={isSignIn ? 'Your password' : 'Min 6 characters'} required
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingLeft: 38, paddingRight: 44 }} />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {!isSignIn && (
              <div className="auth-field">
                <label>Referral Code <span className="auth-optional">(optional — get 1 extra credit)</span></label>
                <input type="text" className="input" placeholder="Enter referral code"
                  value={form.referralCode} onChange={e => setForm({ ...form, referralCode: e.target.value })} />
              </div>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? 'Please wait...' : (isSignIn ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="auth-card__footer">
            {isSignIn
              ? <p>Don't have an account? <Link to="/auth/signup">Sign up free</Link></p>
              : <p>Already have an account? <Link to="/auth/signin">Sign in</Link></p>}
          </div>
        </div>

        <div className="auth-trust">
          <div className="auth-trust__item"><Shield size={13} color="#6ee7b7" /> 100% Private</div>
          <div className="auth-trust__item"><Sparkles size={13} color="#fbbf24" /> AI-Powered</div>
          <div className="auth-trust__item"><Check size={13} color="#6ee7b7" /> No Card Required</div>
        </div>

        <p className="auth-legal">
          By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy-policy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
