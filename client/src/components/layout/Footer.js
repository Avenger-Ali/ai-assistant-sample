import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Youtube, Twitter, Linkedin, Instagram } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <div className="footer__logo-icon"><Zap size={14} fill="currentColor" /></div>
              <span>Shadow<span className="gradient-text">AI</span></span>
            </Link>
            <p>Your real-time AI interview assistant. 100% private and undetectable. Used by 1.5M+ professionals worldwide.</p>
            <div className="footer__social">
              {[Youtube, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="footer__social-link"><Icon size={16} /></a>
              ))}
            </div>
          </div>

          <div className="footer__col">
            <h4>Product</h4>
            <a href="/#features">Features</a>
            <a href="/#privacy">Privacy</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/mock">Mock Simulator</Link>
            <Link to="/mobile">Mobile View</Link>
          </div>

          <div className="footer__col">
            <h4>Company</h4>
            <Link to="/affiliate">Creator Program</Link>
            <Link to="/affiliate">Affiliate</Link>
            <Link to="/enterprise">Enterprise</Link>
            <a href="#">Blog</a>
          </div>

          <div className="footer__col">
            <h4>Legal</h4>
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Refund Policy</a>
            <a href="#">Cookie Policy</a>
          </div>

          <div className="footer__col">
            <h4>Support</h4>
            <a href="mailto:support@shadow-ai.com">Contact Us</a>
            <a href="#">Documentation</a>
            <a href="/#faq">FAQ</a>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} Shadow AI. All Rights Reserved.</p>
          <p>Shadow AI is an independent product. Use responsibly and in accordance with your employer's policies.</p>
        </div>
      </div>
    </footer>
  );
}
