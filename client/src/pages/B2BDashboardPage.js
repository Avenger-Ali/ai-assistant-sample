import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, BarChart2, Plus, Trash2, Shield,
  ChevronLeft, CheckCircle, XCircle, Clock, Zap,
  TrendingUp, UserCheck, UserX, Mail, RefreshCw, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchEnterprise, createEnterprise, assignSeat, revokeSeat, fetchEnterpriseAnalytics
} from '../store/slices/enterpriseSlice';
import './B2BDashboardPage.css';

const PLANS = [
  { id: 'seats_10',  seats: 10,  priceUSD: 290,  perSeat: 29, label: 'Starter — 10 Seats' },
  { id: 'seats_50',  seats: 50,  priceUSD: 1200, perSeat: 24, label: 'Growth — 50 Seats', popular: true },
  { id: 'seats_100', seats: 100, priceUSD: 1900, perSeat: 19, label: 'Enterprise — 100 Seats' },
];

export default function B2BDashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { enterprise, analytics, loading } = useSelector(s => s.enterprise);
  const { user } = useSelector(s => s.auth);

  const [activeTab, setActiveTab] = useState('overview');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ companyName: '', companyEmail: '', plan: 'seats_10' });
  const [seatEmail, setSeatEmail] = useState('');

  useEffect(() => {
    dispatch(fetchEnterprise());
    dispatch(fetchEnterpriseAnalytics());
  }, [dispatch]);

  const handleCreate = async () => {
    if (!createForm.companyName) { toast.error('Company name required'); return; }
    const res = await dispatch(createEnterprise(createForm));
    if (res.payload?.enterprise) {
      toast.success('Enterprise account created! 14-day trial active.');
      setShowCreate(false);
    } else {
      toast.error(res.payload || 'Failed');
    }
  };

  const handleAssign = async () => {
    if (!seatEmail) { toast.error('Email required'); return; }
    const res = await dispatch(assignSeat(seatEmail));
    if (res.payload?.enterprise) { toast.success(`Seat assigned to ${seatEmail}`); setSeatEmail(''); }
    else toast.error(res.payload || 'Failed to assign seat');
  };

  const handleRevoke = async (seatId, email) => {
    if (!window.confirm(`Revoke seat for ${email}?`)) return;
    await dispatch(revokeSeat(seatId));
    toast.success('Seat revoked');
  };

  const usedPct = enterprise ? Math.round((enterprise.usedSeats / enterprise.totalSeats) * 100) : 0;

  if (loading && !enterprise) return (
    <div className="b2b-page">
      <div className="b2b-topbar">
        <button className="session-back" onClick={() => navigate('/dashboard')}><ChevronLeft size={18} /> Dashboard</button>
        <h2>B2B Enterprise</h2>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
    </div>
  );

  return (
    <div className="b2b-page">
      <div className="b2b-topbar">
        <button className="session-back" onClick={() => navigate('/dashboard')}><ChevronLeft size={18} /> Dashboard</button>
        <div className="b2b-topbar__title"><Building2 size={18} color="var(--accent-secondary)" /> Enterprise Dashboard</div>
        {enterprise && (
          <div className={`b2b-status b2b-status--${enterprise.status}`}>{enterprise.status}</div>
        )}
      </div>

      {!enterprise && !showCreate ? (
        <div className="b2b-empty">
          <div className="b2b-empty__icon"><Building2 size={64} color="var(--accent-secondary)" /></div>
          <h2>Launch Your Enterprise Account</h2>
          <p>Deploy Shadow AI across your entire bench. Track usage, manage seats, and boost your placement rate.</p>

          <div className="b2b-plans-grid">
            {PLANS.map(p => (
              <div key={p.id} className={`b2b-plan-card card ${p.popular ? 'b2b-plan-card--popular' : ''}`}>
                {p.popular && <div className="b2b-plan-badge">Most Popular</div>}
                <div className="b2b-plan-name">{p.label}</div>
                <div className="b2b-plan-price">${p.priceUSD}<span>/month</span></div>
                <div className="b2b-plan-perseat">${p.perSeat}/seat/month</div>
                <ul className="b2b-plan-features">
                  <li><CheckCircle size={13} /> {p.seats} concurrent seats</li>
                  <li><CheckCircle size={13} /> Unlimited sessions per seat</li>
                  <li><CheckCircle size={13} /> Admin dashboard & analytics</li>
                  <li><CheckCircle size={13} /> Seat provision / revoke</li>
                  {p.id !== 'seats_10' && <li><CheckCircle size={13} /> HITL access included</li>}
                  {p.id === 'seats_100' && <li><CheckCircle size={13} /> Dedicated account manager</li>}
                </ul>
                <button className={`btn-primary b2b-plan-cta ${!p.popular ? 'btn-secondary' : ''}`}
                  onClick={() => { setCreateForm({ ...createForm, plan: p.id }); setShowCreate(true); }}>
                  Start 14-Day Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : showCreate ? (
        <div className="b2b-create-form">
          <div className="card" style={{ maxWidth: 480, margin: '0 auto', padding: 36 }}>
            <h3>Create Enterprise Account</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
              <div className="form-field">
                <label>Company Name *</label>
                <input className="input" placeholder="Acme Corp" value={createForm.companyName}
                  onChange={e => setCreateForm({ ...createForm, companyName: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Company Email</label>
                <input className="input" placeholder="admin@acme.com" type="email" value={createForm.companyEmail}
                  onChange={e => setCreateForm({ ...createForm, companyEmail: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Plan</label>
                <select className="input" value={createForm.plan} onChange={e => setCreateForm({ ...createForm, plan: e.target.value })}>
                  {PLANS.map(p => <option key={p.id} value={p.id}>{p.label} — ${p.priceUSD}/mo</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCreate}>
                  <Building2 size={16} /> Create Account
                </button>
                <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="b2b-tabs">
            {['overview', 'seats', 'analytics'].map(t => (
              <button key={t} className={`b2b-tab ${activeTab === t ? 'b2b-tab--active' : ''}`}
                onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="b2b-content">
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <div className="b2b-overview-header">
                  <div>
                    <h2>{enterprise.companyName}</h2>
                    <p>{enterprise.companyEmail}</p>
                  </div>
                  <div className="b2b-trial-badge">
                    {enterprise.status === 'trial' ? (
                      <><Clock size={13} /> Trial — expires {enterprise.endDate ? new Date(enterprise.endDate).toLocaleDateString() : 'soon'}</>
                    ) : (
                      <><CheckCircle size={13} /> Active Plan</>
                    )}
                  </div>
                </div>

                <div className="b2b-stats-grid">
                  <div className="b2b-stat card">
                    <Users size={22} color="var(--accent-secondary)" />
                    <div className="b2b-stat__value">{enterprise.usedSeats} / {enterprise.totalSeats}</div>
                    <div className="b2b-stat__label">Seats Used</div>
                    <div className="b2b-seat-bar">
                      <div className="b2b-seat-bar__fill" style={{ width: `${usedPct}%` }} />
                    </div>
                    <div className="b2b-stat__sub">{enterprise.totalSeats - enterprise.usedSeats} available</div>
                  </div>
                  <div className="b2b-stat card">
                    <BarChart2 size={22} color="#6366f1" />
                    <div className="b2b-stat__value">{enterprise.totalSessionsAcross || 0}</div>
                    <div className="b2b-stat__label">Total Sessions</div>
                  </div>
                  <div className="b2b-stat card">
                    <TrendingUp size={22} color="#10b981" />
                    <div className="b2b-stat__value">{enterprise.avgPlacementRate || 0}%</div>
                    <div className="b2b-stat__label">Avg Placement Rate</div>
                  </div>
                  <div className="b2b-stat card">
                    <Shield size={22} color="#a855f7" />
                    <div className="b2b-stat__value">{enterprise.hitlEnabled ? 'Active' : 'Off'}</div>
                    <div className="b2b-stat__label">HITL Access</div>
                  </div>
                </div>

                <div className="b2b-upgrade card" style={{ padding: 24, marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3>Need more seats?</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Upgrade to a larger plan and unlock HITL access</p>
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/pricing')}>Upgrade Plan</button>
                  </div>
                </div>
              </div>
            )}

            {/* SEATS */}
            {activeTab === 'seats' && (
              <div>
                <div className="b2b-seats-header">
                  <h3>Manage Seats</h3>
                  <div className="b2b-assign-row">
                    <input className="input" placeholder="developer@company.com" value={seatEmail}
                      onChange={e => setSeatEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAssign()}
                      style={{ width: 280 }} />
                    <button className="btn-primary" onClick={handleAssign} style={{ padding: '10px 20px' }}>
                      <Plus size={15} /> Assign Seat
                    </button>
                  </div>
                </div>

                <div className="b2b-seats-list">
                  {enterprise.seats?.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <Users size={36} color="var(--text-muted)" />
                      <p>No seats assigned yet. Add your developers above.</p>
                    </div>
                  ) : enterprise.seats?.map(seat => (
                    <div key={seat._id} className="b2b-seat-row card">
                      <div className="b2b-seat-avatar">{seat.email[0]?.toUpperCase()}</div>
                      <div className="b2b-seat-info">
                        <div className="b2b-seat-email">{seat.email}</div>
                        <div className="b2b-seat-meta">
                          Assigned {new Date(seat.assignedAt).toLocaleDateString()}
                          {seat.sessionsUsed > 0 && ` · ${seat.sessionsUsed} sessions`}
                        </div>
                      </div>
                      <div className={`b2b-seat-status b2b-seat-status--${seat.status}`}>
                        {seat.status === 'active' && <><UserCheck size={12} /> Active</>}
                        {seat.status === 'pending' && <><Clock size={12} /> Pending</>}
                        {seat.status === 'revoked' && <><UserX size={12} /> Revoked</>}
                      </div>
                      {seat.status !== 'revoked' && (
                        <button className="b2b-revoke-btn" onClick={() => handleRevoke(seat._id, seat.email)}>
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ANALYTICS */}
            {activeTab === 'analytics' && (
              <div>
                <h3>Analytics Overview</h3>
                <div className="b2b-analytics-grid">
                  {analytics && Object.entries({
                    'Total Seats':      analytics.totalSeats,
                    'Used Seats':       analytics.usedSeats,
                    'Available':        analytics.availableSeats,
                    'Active Members':   analytics.activeMembers,
                    'Total Sessions':   analytics.totalSessionsAcross,
                    'Placement Rate':   `${analytics.avgPlacementRate || 0}%`,
                  }).map(([k, v]) => (
                    <div key={k} className="b2b-analytics-card card">
                      <div className="b2b-analytics-value">{v}</div>
                      <div className="b2b-analytics-label">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="b2b-analytics-note card" style={{ padding: 20, marginTop: 20 }}>
                  <TrendingUp size={18} color="var(--accent-secondary)" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Detailed per-seat analytics, session recordings, and placement tracking are available in the Enterprise tier.
                    <a href="#" style={{ color: 'var(--accent-secondary)', marginLeft: 6 }}>Contact sales →</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
