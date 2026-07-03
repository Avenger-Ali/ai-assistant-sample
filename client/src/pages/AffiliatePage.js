import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Copy, Link2, ChevronLeft,
  Youtube, Instagram, Twitter, Users, Star, Zap,
  CheckCircle, BarChart2, Plus, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAffiliate, applyAffiliate, fetchAffiliateStats, addContentLink } from '../store/slices/affiliateSlice';
import './AffiliatePage.css';

const CREATOR_TIERS = [
  { label: 'Micro Creator', range: '$600–$1,500/mo', followers: '1K–50K', color: '#6366f1' },
  { label: 'Mid Creator',   range: '$1,500–$2,500/mo', followers: '50K–200K', color: '#a855f7' },
  { label: 'Macro Creator', range: '$2,500–$4,000+/mo', followers: '200K+', color: '#f59e0b' },
];

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: <Youtube size={16} />, color: '#ff0000' },
  { id: 'instagram', label: 'Instagram', icon: <Instagram size={16} />, color: '#e1306c' },
  { id: 'tiktok', label: 'TikTok', icon: <span style={{fontSize:14}}>🎵</span>, color: '#69c9d0' },
  { id: 'twitter', label: 'X / Twitter', icon: <Twitter size={16} />, color: '#1da1f2' },
];

export default function AffiliatePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { affiliate, stats } = useSelector(s => s.affiliate);

  const [activeTab, setActiveTab] = useState('overview');
  const [applying, setApplying] = useState(false);
  const [applyForm, setApplyForm] = useState({ tier: 'standard', isCreator: false });
  const [contentForm, setContentForm] = useState({ platform: 'youtube', url: '', views: '' });

  useEffect(() => {
    dispatch(fetchAffiliate());
  }, [dispatch]);

  useEffect(() => {
    if (affiliate?.status === 'active') dispatch(fetchAffiliateStats());
  }, [affiliate, dispatch]);

  const handleApply = async () => {
    setApplying(true);
    const res = await dispatch(applyAffiliate(applyForm));
    setApplying(false);
    if (res.payload?.affiliate) toast.success('Application submitted! We\'ll review within 24h.');
    else toast.error(res.payload || 'Failed to apply');
  };

  const copyLink = () => {
    const link = `https://shadow-ai.com?ref=${affiliate?.trackingCode || stats?.trackingCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const handleAddContent = async () => {
    if (!contentForm.url) { toast.error('URL required'); return; }
    await dispatch(addContentLink({ ...contentForm, views: parseInt(contentForm.views) || 0 }));
    toast.success('Content link added!');
    setContentForm({ platform: 'youtube', url: '', views: '' });
  };

  const hasAffiliate = !!affiliate;
  const isActive = affiliate?.status === 'active';
  const code = stats?.trackingCode || affiliate?.trackingCode;

  return (
    <div className="affiliate-page">
      <div className="affiliate-topbar">
        <button className="session-back" onClick={() => navigate('/dashboard')}><ChevronLeft size={18} /> Dashboard</button>
        <div className="affiliate-topbar__title"><TrendingUp size={18} color="var(--accent-secondary)" /> Affiliate & Creator Program</div>
        <span />
      </div>

      {!hasAffiliate ? (
        <div className="affiliate-landing">
          {/* Hero */}
          <div className="affiliate-hero">
            <div className="affiliate-hero__badge">💰 Earn With Shadow AI</div>
            <h1>Earn <span className="gradient-text">$600–$4,000+</span> Per Month</h1>
            <p>Join our affiliate and creator program. Get paid for every subscription you drive — 30% lifetime recurring commission.</p>
          </div>

          {/* Creator tiers */}
          <div className="creator-tiers">
            {CREATOR_TIERS.map(t => (
              <div key={t.label} className="creator-tier-card card" style={{ borderColor: t.color + '44' }}>
                <div className="creator-tier-label" style={{ color: t.color }}>{t.label}</div>
                <div className="creator-tier-range">{t.range}</div>
                <div className="creator-tier-followers">{t.followers} followers</div>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="affiliate-benefits">
            {[
              { icon: '💸', title: '30% Lifetime Commission', desc: 'Earn 30% recurring on every subscription your referrals generate, forever.' },
              { icon: '🎬', title: 'Creator Retainer', desc: 'Active creators earn $600–$4,000+/month in base retainer payments.' },
              { icon: '🎯', title: 'Viral Bonus', desc: 'Earn up to $2,000 bonus for videos that go viral (1M+ views).' },
              { icon: '🔗', title: 'Custom Tracking Link', desc: 'Your own unique affiliate link with real-time click and conversion tracking.' },
            ].map(b => (
              <div key={b.title} className="affiliate-benefit card">
                <span className="affiliate-benefit__icon">{b.icon}</span>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Apply form */}
          <div className="affiliate-apply-card card">
            <h3>Apply to Join</h3>
            <div className="affiliate-apply-form">
              <div className="form-field">
                <label>Account Type</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{id:'standard',label:'Standard Affiliate'},{id:'influencer',label:'Influencer'},{id:'creator',label:'Creator'}].map(t => (
                    <button key={t.id}
                      className={`type-btn ${applyForm.tier === t.id ? 'type-btn--active' : ''}`}
                      onClick={() => setApplyForm({ ...applyForm, tier: t.id })}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="affiliate-creator-toggle">
                <input type="checkbox" checked={applyForm.isCreator}
                  onChange={e => setApplyForm({ ...applyForm, isCreator: e.target.checked })} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>I create content (TikTok, YouTube, Instagram, X)</span>
              </label>
              <button className="btn-primary affiliate-apply-btn" onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting...' : <><Zap size={16} /> Apply Now — It's Free</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Status banner */}
          {affiliate.status === 'pending' && (
            <div className="affiliate-pending-banner">
              ⏳ Your application is under review. We'll email you within 24 hours.
            </div>
          )}

          {isActive && (
            <>
              {/* Tabs */}
              <div className="affiliate-tabs">
                {['overview', 'content', 'payouts'].map(t => (
                  <button key={t} className={`affiliate-tab ${activeTab === t ? 'affiliate-tab--active' : ''}`}
                    onClick={() => setActiveTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="affiliate-content">
                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                  <div>
                    {/* Referral link */}
                    <div className="affiliate-link-card card">
                      <div className="affiliate-link-label"><Link2 size={14} /> Your Referral Link</div>
                      <div className="affiliate-link-row">
                        <div className="affiliate-link-url">https://shadow-ai.com?ref={code}</div>
                        <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={copyLink}>
                          <Copy size={14} /> Copy
                        </button>
                      </div>
                      <div className="affiliate-link-code">Code: <strong>{code}</strong> · 30% lifetime commission</div>
                    </div>

                    {/* Stats */}
                    <div className="affiliate-stats-grid">
                      {[
                        { label: 'Total Clicks',      value: stats?.totalClicks || 0,         icon: <BarChart2 size={18}/>, color: '#6366f1' },
                        { label: 'Conversions',       value: stats?.totalConversions || 0,     icon: <CheckCircle size={18}/>, color: '#10b981' },
                        { label: 'Total Earnings',    value: `$${stats?.totalEarnings || 0}`,  icon: <DollarSign size={18}/>, color: '#a855f7' },
                        { label: 'Pending Payout',    value: `$${stats?.pendingPayout || 0}`,  icon: <TrendingUp size={18}/>, color: '#f59e0b' },
                        { label: 'Commission Rate',   value: `${stats?.commissionRate || 30}%`, icon: <Star size={18}/>, color: '#ec4899' },
                        { label: 'Paid Out',          value: `$${stats?.paidOut || 0}`,        icon: <Zap size={18}/>, color: '#6ee7b7' },
                      ].map(s => (
                        <div key={s.label} className="affiliate-stat card">
                          <div className="affiliate-stat__icon" style={{ color: s.color }}>{s.icon}</div>
                          <div className="affiliate-stat__value" style={{ color: s.color }}>{s.value}</div>
                          <div className="affiliate-stat__label">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recent conversions */}
                    <div style={{ marginTop: 24 }}>
                      <h3 style={{ marginBottom: 14, fontSize: 15, fontWeight: 700 }}>Recent Conversions</h3>
                      {stats?.conversions?.length > 0 ? stats.conversions.map((c, i) => (
                        <div key={i} className="conversion-row card">
                          <div><CheckCircle size={14} color="#10b981" /></div>
                          <div className="conversion-plan">{c.plan}</div>
                          <div className="conversion-amount">${c.amount}</div>
                          <div className="conversion-commission">+${c.commission} earned</div>
                          <div className="conversion-date">{new Date(c.date).toLocaleDateString()}</div>
                        </div>
                      )) : (
                        <div className="empty-state" style={{ padding: '32px 0' }}>
                          <p>No conversions yet. Share your link to start earning!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CONTENT */}
                {activeTab === 'content' && (
                  <div>
                    <h3 style={{ marginBottom: 8 }}>Content Tracking</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                      Add your published content links. Viral bonuses (1M+ views) are paid automatically.
                    </p>

                    <div className="content-add-card card" style={{ padding: 24, marginBottom: 20 }}>
                      <h4 style={{ marginBottom: 16 }}>Add Content Link</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 10, alignItems: 'end' }}>
                        <div className="form-field">
                          <label>Platform</label>
                          <select className="input" value={contentForm.platform} onChange={e => setContentForm({...contentForm, platform: e.target.value})}>
                            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                          </select>
                        </div>
                        <div className="form-field">
                          <label>Content URL</label>
                          <input className="input" placeholder="https://youtube.com/watch?v=..." value={contentForm.url}
                            onChange={e => setContentForm({...contentForm, url: e.target.value})} />
                        </div>
                        <div className="form-field">
                          <label>Views</label>
                          <input className="input" placeholder="50000" type="number" value={contentForm.views}
                            onChange={e => setContentForm({...contentForm, views: e.target.value})} style={{ width: 100 }} />
                        </div>
                        <button className="btn-primary" onClick={handleAddContent} style={{ padding: '10px 16px' }}>
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>

                    <div className="content-links-list">
                      {affiliate.contentLinks?.map((c, i) => (
                        <div key={i} className="content-link-row card">
                          <div className="content-link-platform">
                            {PLATFORMS.find(p => p.id === c.platform)?.icon} {c.platform}
                          </div>
                          <a href={c.url} target="_blank" rel="noreferrer" className="content-link-url">
                            {c.url.slice(0, 50)}... <ExternalLink size={12} />
                          </a>
                          <div className="content-link-views">{c.views?.toLocaleString()} views</div>
                          {c.views >= 1000000 && <div className="content-link-viral">🔥 Viral Bonus Eligible</div>}
                        </div>
                      ))}
                      {!affiliate.contentLinks?.length && (
                        <div className="empty-state" style={{ padding: '32px 0' }}>
                          <p>No content links added yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PAYOUTS */}
                {activeTab === 'payouts' && (
                  <div>
                    <h3 style={{ marginBottom: 20 }}>Payout Settings</h3>
                    <div className="payout-card card" style={{ padding: 28, maxWidth: 480 }}>
                      <div className="payout-balance">
                        <DollarSign size={24} color="#10b981" />
                        <div>
                          <div className="payout-balance__amount">${stats?.pendingPayout || 0}</div>
                          <div className="payout-balance__label">Pending Payout</div>
                        </div>
                      </div>
                      <div className="payout-methods">
                        <h4>Payout Method</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                          {['PayPal', 'Bank Transfer', 'UPI', 'Crypto'].map(m => (
                            <label key={m} className="payout-method-option">
                              <input type="radio" name="payout" />
                              <span>{m}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button className="btn-primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}>
                        Request Payout (Min $50)
                      </button>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Payouts processed within 7 business days.</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
