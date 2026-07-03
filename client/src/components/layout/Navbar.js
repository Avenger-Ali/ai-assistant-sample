import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { Zap, Menu, X, LogOut, LayoutDashboard, ChevronDown, Brain, CreditCard } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenu, setUserMenu]       = useState(false);
  const { isAuthenticated, user }     = useSelector(s => s.auth);
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  // close menus on route change
  useEffect(() => { setMobileOpen(false); setUserMenu(false); }, [location]);

  const handleLogout = () => { dispatch(logout()); navigate('/'); };

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <div className="navbar__logo-icon"><Zap size={16} fill="currentColor" /></div>
          <span>Shadow<span className="navbar__accent">AI</span></span>
        </Link>

        {/* Desktop links */}
        <div className="navbar__links">
          <a href="/#features"  className="navbar__link">Features</a>
          <a href="/#privacy"   className="navbar__link">Privacy</a>
          <Link to="/pricing"   className="navbar__link">Pricing</Link>
          <a href="/#faq"       className="navbar__link">FAQ</a>
          <Link to="/affiliate" className="navbar__link">Earn Money</Link>
        </div>

        {/* Auth area */}
        <div className="navbar__auth">
          {isAuthenticated ? (
            <div className="navbar__user-wrap">
              <button className="navbar__user-btn" onClick={() => setUserMenu(v => !v)}>
                <div className="navbar__user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
                <span className="navbar__user-name">{user?.name || user?.email?.split('@')[0]}</span>
                <ChevronDown size={13} />
              </button>
              {userMenu && (
                <div className="navbar__dropdown">
                  <Link to="/dashboard" className="navbar__drop-item"><LayoutDashboard size={14} /> Dashboard</Link>
                  <Link to="/mock"      className="navbar__drop-item"><Brain size={14} /> Mock Simulator</Link>
                  <Link to="/pricing"   className="navbar__drop-item"><CreditCard size={14} /> Upgrade</Link>
                  <div className="navbar__drop-divider" />
                  <button className="navbar__drop-item navbar__drop-item--danger" onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth/signin" className="navbar__signin">Sign In</Link>
              <Link to="/auth/signup" className="btn-primary navbar__try-btn">Try Free</Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button className="navbar__hamburger" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="navbar__mobile">
          <a href="/#features"  className="navbar__mob-link" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="/#privacy"   className="navbar__mob-link" onClick={() => setMobileOpen(false)}>Privacy</a>
          <Link to="/pricing"   className="navbar__mob-link">Pricing</Link>
          <a href="/#faq"       className="navbar__mob-link" onClick={() => setMobileOpen(false)}>FAQ</a>
          <Link to="/affiliate" className="navbar__mob-link">Earn Money</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="navbar__mob-link">Dashboard</Link>
              <Link to="/mock"      className="navbar__mob-link">Mock Simulator</Link>
              <button className="navbar__mob-link navbar__mob-danger" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <div className="navbar__mob-auth">
              <Link to="/auth/signin" className="btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:14 }}>Sign In</Link>
              <Link to="/auth/signup" className="btn-primary"   style={{ flex:1, justifyContent:'center', fontSize:14 }}>Try Free</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
