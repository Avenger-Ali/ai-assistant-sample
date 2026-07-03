import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector }                        from 'react-redux';
import { Link }                                            from 'react-router-dom';
import {
  Monitor, Lock, Zap, Clock, ShieldOff, RefreshCw,
  ExternalLink, AlertTriangle, Copy, Shield, CheckCircle,
} from 'lucide-react';
import toast                                               from 'react-hot-toast';
import axios from 'axios';
import {
  requestLaunchToken, fetchMyDesktopSession,
  revokeDesktopSession, tickCountdown,
} from '../../store/slices/desktopSlice';
import './DesktopLauncherPanel.css';

const API = process.env.REACT_APP_API_URL || "ai-assistant-sample.vercel.app" || '/api';
const H   = () => ({ Authorization: `Bearer ${localStorage.getItem('shadow_token')}` });

function fmt(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export default function DesktopLauncherPanel() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const { active, secondsRemaining, lastDeepLink, lastToken, loading, error } =
    useSelector(s => s.desktop);

  const [launching, setLaunching] = useState(false);
  const [adminToken, setAdminToken] = useState(null); // admin gets token directly
  const tickRef = useRef(null);

  // ── Admin check — single source of truth ──────────────────────────
  const isAdmin   = user?.isAdmin === true || user?.role === 'admin';
  const isPremium = isAdmin || (
    user?.subscription?.status === 'active' &&
    ['monthly', 'yearly', 'lifetime'].includes(user?.subscription?.type)
  );

  // On mount: check if a desktop session is already active
  useEffect(() => {
    if (isPremium) dispatch(fetchMyDesktopSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1-second countdown ticker
  useEffect(() => {
    clearInterval(tickRef.current);
    if (active && secondsRemaining > 0) {
      tickRef.current = setInterval(() => dispatch(tickCountdown()), 1000);
    }
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, secondsRemaining > 0]);

  /* ── ADMIN LAUNCH: call /admin-launch, get token directly ──────────
     Admins don't need a deep-link or protocol handler.
     Token is stored in state and can be:
     a) Copy-pasted into the Electron app if already open
     b) Displayed as a QR / instructions panel
     c) Auto-received by Electron if user polls /api/desktop/status
        using their web JWT (the Electron app checks this on startup)
  ─────────────────────────────────────────────────────────────────── */
  const handleAdminLaunch = useCallback(async () => {
    setLaunching(true);
    try {
      const { data } = await axios.post(`${API}/desktop/admin-launch`, {}, { headers: H() });
      setAdminToken(data.token);
      // Store it so the Electron app can pick it up via /api/desktop/status
      // (The Electron app calls /api/desktop/status with the web token,
      //  and the server returns the admin session immediately)
      dispatch({ type: 'desktop/requestLaunchToken/fulfilled', payload: {
        token:           data.token,
        expiresAt:       data.expiresAt,
        durationMinutes: data.durationMinutes,
        deepLink:        null, // admins have no deepLink
      }});
      toast.success('Admin session created! Desktop app is unlocked for 75 minutes.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create admin session');
    } finally {
      setLaunching(false);
    }
  }, [dispatch]);

  /* ── PREMIUM LAUNCH: standard deep-link flow ──────────────────────── */
  const handlePremiumLaunch = useCallback(async () => {
    setLaunching(true);
    const result = await dispatch(requestLaunchToken());
    setLaunching(false);

    if (requestLaunchToken.fulfilled.match(result)) {
      toast.success('Session created — opening desktop app…');
      if (result.payload.deepLink) {
        window.location.href = result.payload.deepLink;
      }
    } else if (result.payload?.code === 'PREMIUM_REQUIRED') {
      toast.error('Desktop overlay requires an active subscription.');
    } else {
      toast.error(result.payload?.message || 'Failed to launch');
    }
  }, [dispatch]);

  const handleLaunch = isAdmin ? handleAdminLaunch : handlePremiumLaunch;

  const handleRevoke = async () => {
    if (!window.confirm('End the desktop session now?')) return;
    await dispatch(revokeDesktopSession());
    setAdminToken(null);
    toast.success('Session revoked.');
  };

  const copyToken = (t) => {
    navigator.clipboard.writeText(t || '');
    toast.success('Token copied — paste it into the Electron app\'s token input field.');
  };

  /* ── Not premium AND not admin ─────────────────────────────────────── */
  if (!isPremium) {
    return (
      <div className="desktop-panel card desktop-panel--locked">
        <div className="desktop-panel__icon-wrap desktop-panel__icon-wrap--locked">
          <Lock size={20} />
        </div>
        <div className="desktop-panel__body">
          <h3>Desktop Overlay App</h3>
          <p>
            The Shadow AI desktop overlay — invisible during screen share — is available
            exclusively to <strong>Monthly, Yearly, or Lifetime</strong> subscribers,
            or <strong>Admin</strong> accounts.
          </p>
          <Link to="/pricing" className="btn-primary desktop-panel__cta">
            <Zap size={15} /> Upgrade to Unlock Desktop App
          </Link>
        </div>
      </div>
    );
  }

  /* ── No active session yet ─────────────────────────────────────────── */
  if (!active) {
    return (
      <div className={`desktop-panel card ${isAdmin ? 'desktop-panel--admin' : ''}`}>
        <div className="desktop-panel__icon-wrap" style={isAdmin ? { background:'rgba(251,191,36,.15)', color:'#fbbf24' } : {}}>
          {isAdmin ? <Shield size={20} /> : <Monitor size={20} />}
        </div>
        <div className="desktop-panel__body">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <h3 style={{ margin:0 }}>Desktop Overlay App</h3>
            {isAdmin && <span className="desktop-panel__admin-tag">ADMIN</span>}
          </div>

          {isAdmin ? (
            <p>As an admin, you have <strong>instant access</strong> — no subscription or deep-link required. Click launch and the 75-minute session is created immediately.</p>
          ) : (
            <p>Launch the native overlay for true screen-share invisibility. Sessions last <strong>75 minutes</strong> and auto-lock when they expire.</p>
          )}

          {error && <div className="desktop-panel__error"><AlertTriangle size={13} /> {error}</div>}

          <button className="btn-primary desktop-panel__cta" onClick={handleLaunch} disabled={launching || loading}>
            {launching || loading
              ? <><RefreshCw size={15} className="spin-icon" /> Creating session…</>
              : isAdmin
                ? <><Shield size={15} /> Launch (Admin — No Token Needed)</>
                : <><Monitor size={15} /> Launch Desktop App</>
            }
          </button>

          {!isAdmin && (
            <p className="desktop-panel__hint">
              Requires the Shadow AI desktop app to be installed.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Active session ────────────────────────────────────────────────── */
  const pct  = Math.max(0, Math.min(100, (secondsRemaining / (75 * 60)) * 100));
  const isLow = secondsRemaining < 5 * 60;
  const currentToken = lastToken || adminToken;

  return (
    <div className={`desktop-panel card desktop-panel--active ${isAdmin ? 'desktop-panel--admin-active' : ''}`}>
      <div className="desktop-panel__icon-wrap desktop-panel__icon-wrap--active">
        {isAdmin ? <Shield size={20} /> : <Monitor size={20} />}
      </div>
      <div className="desktop-panel__body">
        <div className="desktop-panel__active-header">
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <h3>Desktop App Active</h3>
            {isAdmin && <span className="desktop-panel__admin-tag">ADMIN</span>}
          </div>
          <span className="desktop-panel__live-dot"><span className="dot-green" /> Live</span>
        </div>

        {isAdmin
          ? <p>Admin session — overlay unlocked. The Electron app uses your web token to auto-detect this session.</p>
          : <p>Invisible to screen-share viewers. Auto-expires when countdown reaches zero.</p>
        }

        <div className="desktop-panel__countdown">
          <Clock size={16} className={isLow ? 'desktop-panel__clock-icon--low' : ''} />
          <span className={`desktop-panel__countdown-time ${isLow ? 'desktop-panel__countdown-time--low' : ''}`}>
            {fmt(secondsRemaining)}
          </span>
          <span className="desktop-panel__countdown-label">remaining</span>
        </div>

        <div className="desktop-panel__bar-track">
          <div
            className={`desktop-panel__bar-fill ${isLow ? 'desktop-panel__bar-fill--low' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {isLow && (
          <div className="desktop-panel__warning">
            <AlertTriangle size={12} /> Session expiring soon — overlay will auto-disable.
          </div>
        )}

        {/* Admin: show token copy option so they can paste into Electron manually if needed */}
        {isAdmin && currentToken && (
          <div className="desktop-panel__admin-token-row">
            <CheckCircle size={13} color="#6ee7b7" />
            <span>Session active — Electron app auto-detects via your login.</span>
            <button className="desktop-panel__token-copy-btn" onClick={() => copyToken(currentToken)}>
              <Copy size={11} /> Copy Token
            </button>
          </div>
        )}

        <div className="desktop-panel__actions">
          {lastDeepLink && !isAdmin && (
            <button className="btn-secondary desktop-panel__action-btn" onClick={() => { window.location.href = lastDeepLink; }}>
              <ExternalLink size={13} /> Re-open App
            </button>
          )}
          {currentToken && (
            <button className="btn-secondary desktop-panel__action-btn" onClick={() => copyToken(currentToken)}>
              <Copy size={13} /> Copy Token
            </button>
          )}
          <button className="desktop-panel__revoke-btn" onClick={handleRevoke}>
            <ShieldOff size={13} /> End Session
          </button>
        </div>
      </div>
    </div>
  );
}
