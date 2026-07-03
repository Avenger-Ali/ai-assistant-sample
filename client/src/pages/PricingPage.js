import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Check, Star, Zap, ArrowRight, Shield, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import "./PricingPage.css";

const API =
  process.env.REACT_APP_API_URL || "ai-assistant-sample.vercel.app" || "/api";
const H = () => ({
  Authorization: `Bearer ${localStorage.getItem("shadow_token")}`,
});

const CREDIT_PLANS = [
  {
    id: "credits_3",
    name: "3 Credits",
    priceINR: 3690,
    priceUSD: 38.9,
    hours: "~1.5 hrs",
    features: [
      "3 sessions (30 min each)",
      "All AI models",
      "Resume matching",
      "AI notes",
      "Credits never expire",
    ],
  },
  {
    id: "credits_7",
    name: "7 Credits",
    priceINR: 7380,
    priceUSD: 77.9,
    hours: "~3.5 hrs",
    popular: true,
    features: [
      "7 sessions (30 min each)",
      "All AI models",
      "Resume matching",
      "AI notes",
      "Credits never expire",
    ],
  },
  {
    id: "credits_15",
    name: "15 Credits",
    priceINR: 11070,
    priceUSD: 116.9,
    hours: "~7.5 hrs",
    features: [
      "15 sessions (30 min each)",
      "All AI models",
      "Resume matching",
      "AI notes",
      "Credits never expire",
    ],
  },
];

const SUB_PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    priceINR: 9470,
    priceUSD: 99.9,
    period: "month",
    features: [
      "Unlimited calls",
      "GPT-4o, Claude, Gemini",
      "Resume-matched answers",
      "Auto-detect meetings",
      "AI notes",
      "Cancel anytime",
    ],
  },
  {
    id: "yearly",
    name: "Yearly",
    priceINR: 28420,
    priceUSD: 299.9,
    period: "year",
    badge: "Save 75%",
    popular: true,
    features: [
      "Everything in Monthly",
      "Save 75% vs monthly",
      "AI Resume Tailor",
      "HITL 1 session bonus",
      "Priority support",
    ],
  },
  {
    id: "lifetime",
    name: "Lifetime",
    priceINR: 74990,
    priceUSD: 799.0,
    period: "once",
    badge: "Best Value",
    features: [
      "Unlimited access forever",
      "All future features",
      "2 free HITL sessions",
      "Priority support",
      "Creator program top tier",
    ],
  },
];

const ENTERPRISE_PLANS = [
  { id: "ent_10", seats: 10, priceUSD: 290, perSeat: 29 },
  { id: "ent_50", seats: 50, priceUSD: 1200, perSeat: 24, popular: true },
  { id: "ent_100", seats: 100, priceUSD: 1900, perSeat: 19 },
];

const COMPARE_ROWS = [
  {
    feature: "Live AI answers",
    credits: true,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "Coding interview support",
    credits: true,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "GPT-4o, Claude, Gemini models",
    credits: true,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "Resume-matched answers",
    credits: true,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "Auto-detect meetings",
    credits: false,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "AI session notes",
    credits: false,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "Knowledge base docs",
    credits: false,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "AI Resume Tailor",
    credits: false,
    monthly: false,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "Stealth / Screen-share mode",
    credits: true,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "HITL expert access",
    credits: false,
    monthly: false,
    yearly: "1 session",
    lifetime: "2 sessions",
  },
  {
    feature: "Priority support",
    credits: false,
    monthly: true,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "Affiliate program",
    credits: false,
    monthly: false,
    yearly: true,
    lifetime: true,
  },
  {
    feature: "Credits never expire",
    credits: true,
    monthly: "N/A",
    yearly: "N/A",
    lifetime: "N/A",
  },
];

function PlanCell({ val }) {
  if (val === true)
    return (
      <span className="pc-check">
        <Check size={13} />
      </span>
    );
  if (val === false)
    return (
      <span className="pc-x">
        <X size={12} />
      </span>
    );
  return <span className="pc-text">{val}</span>;
}

export default function PricingPage() {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const [tab, setTab] = useState("subscription");
  const [processing, setProcessing] = useState("");
  const [rzpKey, setRzpKey] = useState(
    process.env.REACT_APP_RAZORPAY_KEY_ID || ""
  );

  // Load Razorpay script once
  useEffect(() => {
    if (document.getElementById("rzp-script")) return;
    const s = document.createElement("script");
    s.id = "rzp-script";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);

    // Also fetch public key from server
    axios
      .get(`${API}/billing/key`)
      .then((r) => {
        if (r.data.key) setRzpKey(r.data.key);
      })
      .catch(() => {});
  }, []);

  const handlePurchase = useCallback(
    async (planId, planName, priceINR, priceUSD) => {
      if (!isAuthenticated) {
        toast.error("Please sign in first");
        navigate("/auth/signin");
        return;
      }

      setProcessing(planId);

      try {
        // Create Razorpay order on server
        const { data } = await axios.post(
          `${API}/billing/create-order`,
          { planId },
          { headers: H() }
        );
        const { order, plan } = data;

        if (!rzpKey) {
          // Fallback: mock purchase if Razorpay not configured
          await axios.post(
            `${API}/billing/purchase`,
            { planId },
            { headers: H() }
          );
          toast.success(
            `✅ ${planName} activated! (Demo mode — no real payment)`
          );
          setProcessing("");
          return;
        }

        // Open Razorpay checkout
        const options = {
          key: rzpKey,
          amount: order.amount,
          currency: order.currency,
          name: "Shadow AI",
          description: planName,
          order_id: order.id,
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
          },
          theme: { color: "#7c3aed" },
          modal: { backdropclose: false },
          handler: async (response) => {
            try {
              // Verify payment on server
              const verify = await axios.post(
                `${API}/billing/verify`,
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planId,
                },
                { headers: H() }
              );

              if (verify.data.success) {
                toast.success(`✅ ${planName} activated! Payment successful.`);
                setTimeout(() => navigate("/dashboard"), 1500);
              }
            } catch (err) {
              toast.error(
                "Payment verification failed: " +
                  (err.response?.data?.message || err.message)
              );
            } finally {
              setProcessing("");
            }
          },
          "modal.ondismiss": () => {
            setProcessing("");
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (e) => {
          toast.error("Payment failed: " + e.error.description);
          setProcessing("");
        });
        rzp.open();
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Failed to initiate payment"
        );
        setProcessing("");
      }
    },
    [isAuthenticated, navigate, rzpKey, user]
  );

  return (
    <div className="pricing-page">
      {/* Navbar */}
      <nav className="pricing-nav">
        <Link to="/" className="pricing-nav__logo">
          <div className="pricing-nav__logo-icon">
            <Zap size={14} fill="currentColor" />
          </div>
          <span>
            Shadow<span style={{ color: "var(--accent-secondary)" }}>AI</span>
          </span>
        </Link>
        <div className="pricing-nav__links">
          <Link to="/">Home</Link>
          {isAuthenticated ? (
            <Link to="/dashboard">Dashboard</Link>
          ) : (
            <Link to="/auth/signin">Sign In</Link>
          )}
          {!isAuthenticated && (
            <Link
              to="/auth/signup"
              className="btn-primary"
              style={{ padding: "8px 18px", fontSize: 13 }}
            >
              Try Free
            </Link>
          )}
        </div>
      </nav>

      <div className="pricing-page__inner">
        <div className="pricing-glow-1" />
        <div className="container">
          {/* Header */}
          <div className="pricing-header">
            <div className="pricing-tag">
              <Zap size={12} />
              Pricing
            </div>
            <h1 className="pricing-title">
              Buy Credits or
              <br />
              <span className="gradient-text">Go Unlimited ✨</span>
            </h1>
            <p className="pricing-sub">
              Start free with 10 sessions. No credit card required.
            </p>
            <div className="pricing-freebies">
              {[
                "10 Free Sessions",
                "1 Free 45-min Call",
                "7-Day Refund",
                "Cancel Anytime",
              ].map((f) => (
                <div key={f} className="pricing-freebie">
                  <Check size={12} color="#6ee7b7" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="pricing-tabs-row">
            {[
              { id: "subscription", label: "Subscription" },
              { id: "credits", label: "Credits" },
              { id: "enterprise", label: "Enterprise" },
              { id: "compare", label: "Compare" },
            ].map((t) => (
              <button
                key={t.id}
                className={`pricing-tab ${
                  tab === t.id ? "pricing-tab--active" : ""
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SUBSCRIPTION ── */}
          {tab === "subscription" && (
            <div className="pricing-sub-grid">
              {SUB_PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`pricing-card card ${
                    p.popular ? "pricing-card--popular" : ""
                  }`}
                >
                  {p.badge && (
                    <div
                      className={`pricing-badge ${
                        p.id === "yearly" ? "pricing-badge--save" : ""
                      }`}
                    >
                      {p.badge}
                    </div>
                  )}
                  <div className="pricing-card__name">{p.name}</div>
                  <div className="pricing-card__price">
                    ₹{p.priceINR.toLocaleString()}
                  </div>
                  <div className="pricing-card__usd">
                    ${p.priceUSD} USD / {p.period}
                  </div>
                  <div className="pricing-card__tag">Unlimited Calls</div>
                  <ul className="pricing-card__features">
                    {p.features.map((f, i) => (
                      <li key={i}>
                        <Check size={12} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`${
                      p.popular ? "btn-primary" : "btn-secondary"
                    } pricing-card__cta`}
                    onClick={() =>
                      handlePurchase(p.id, p.name, p.priceINR * 100, p.priceUSD)
                    }
                    disabled={processing === p.id}
                  >
                    {processing === p.id
                      ? "Processing…"
                      : `Subscribe ${p.name}`}
                    {processing !== p.id && <ArrowRight size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── CREDITS ── */}
          {tab === "credits" && (
            <>
              <div className="pricing-credits-grid">
                {CREDIT_PLANS.map((p) => (
                  <div
                    key={p.id}
                    className={`pricing-card card ${
                      p.popular ? "pricing-card--popular" : ""
                    }`}
                  >
                    {p.popular && (
                      <div className="pricing-badge">Most Popular</div>
                    )}
                    <div className="pricing-card__name">{p.name}</div>
                    <div className="pricing-card__price">
                      ₹{p.priceINR.toLocaleString()}
                    </div>
                    <div className="pricing-card__usd">
                      ${p.priceUSD} · {p.hours}
                    </div>
                    <div className="pricing-card__tag">Pay As You Go</div>
                    <ul className="pricing-card__features">
                      {p.features.map((f, i) => (
                        <li key={i}>
                          <Check size={12} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`${
                        p.popular ? "btn-primary" : "btn-secondary"
                      } pricing-card__cta`}
                      onClick={() =>
                        handlePurchase(
                          p.id,
                          p.name,
                          p.priceINR * 100,
                          p.priceUSD
                        )
                      }
                      disabled={processing === p.id}
                    >
                      {processing === p.id ? "Processing…" : `Get ${p.name}`}
                      {processing !== p.id && <ArrowRight size={14} />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="pricing-credits-note">
                <Zap size={13} color="var(--accent-secondary)" />1 credit = 2
                sessions of 30 minutes. Credits never expire. Initiating a
                session costs 0.5 credits.
              </div>
            </>
          )}

          {/* ── ENTERPRISE ── */}
          {tab === "enterprise" && (
            <div>
              <div className="pricing-enterprise-hero">
                <h2>Enterprise Multi-Seat Plans</h2>
                <p>
                  Deploy Shadow AI across your bench. Manage seats, track usage,
                  boost placement rates.
                </p>
              </div>
              <div className="pricing-credits-grid">
                {ENTERPRISE_PLANS.map((p) => (
                  <div
                    key={p.id}
                    className={`pricing-card card ${
                      p.popular ? "pricing-card--popular" : ""
                    }`}
                  >
                    {p.popular && <div className="pricing-badge">Popular</div>}
                    <div className="pricing-card__name">{p.seats} Seats</div>
                    <div className="pricing-card__price">
                      ${p.priceUSD.toLocaleString()}
                    </div>
                    <div className="pricing-card__usd">
                      ${p.perSeat}/seat/month
                    </div>
                    <div className="pricing-card__tag">
                      Unlimited Calls Per Seat
                    </div>
                    <ul className="pricing-card__features">
                      {[
                        `${p.seats} concurrent seats`,
                        `$${p.perSeat}/seat/month`,
                        "Admin dashboard & analytics",
                        "Seat provision / revoke",
                        p.seats >= 50
                          ? "HITL access included"
                          : "HITL add-on available",
                        p.seats === 100
                          ? "Dedicated account manager"
                          : "Priority support",
                      ].map((f, i) => (
                        <li key={i}>
                          <Check size={12} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={`${
                        p.popular ? "btn-primary" : "btn-secondary"
                      } pricing-card__cta`}
                      onClick={() => navigate("/enterprise")}
                    >
                      Start 14-Day Trial <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pricing-enterprise-note card">
                <Shield size={18} color="var(--accent-secondary)" />
                <div>
                  <h4>HITL — Human Expert Access</h4>
                  <p>
                    For L6+/FAANG interviews: live expert engineer in &lt;15
                    seconds. $500 (Senior) or $1,000 (Principal) per session.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── COMPARE ── */}
          {tab === "compare" && (
            <div className="pricing-compare">
              <div className="pricing-compare__table">
                <div className="pricing-compare__header">
                  <div className="pch-feature">Feature</div>
                  {["Credits", "Monthly", "Yearly", "Lifetime"].map((h) => (
                    <div
                      key={h}
                      className={`pch-col ${
                        h === "Yearly" ? "pch-col--popular" : ""
                      }`}
                    >
                      {h}
                      {h === "Yearly" && (
                        <span className="pch-pop-badge">Popular</span>
                      )}
                    </div>
                  ))}
                </div>
                {COMPARE_ROWS.map((row, i) => (
                  <div
                    key={i}
                    className={`pricing-compare__row ${
                      i % 2 === 0 ? "pricing-compare__row--alt" : ""
                    }`}
                  >
                    <div className="pch-feature">{row.feature}</div>
                    <div className="pch-col">
                      <PlanCell val={row.credits} />
                    </div>
                    <div className="pch-col">
                      <PlanCell val={row.monthly} />
                    </div>
                    <div className="pch-col pch-col--popular">
                      <PlanCell val={row.yearly} />
                    </div>
                    <div className="pch-col">
                      <PlanCell val={row.lifetime} />
                    </div>
                  </div>
                ))}
                <div className="pricing-compare__footer">
                  <div className="pch-feature" />
                  {[
                    { id: "credits_7", l: "Get Credits" },
                    { id: "monthly", l: "Monthly" },
                    { id: "yearly", l: "Get Yearly" },
                    { id: "lifetime", l: "Lifetime" },
                  ].map((b, i) => (
                    <div
                      key={b.id}
                      className={`pch-col ${i === 2 ? "pch-col--popular" : ""}`}
                    >
                      <button
                        className={i === 2 ? "btn-primary" : "btn-secondary"}
                        style={{ fontSize: 12, padding: "8px 14px" }}
                        onClick={() => {
                          const p = [...CREDIT_PLANS, ...SUB_PLANS].find(
                            (x) => x.id === b.id
                          );
                          if (p)
                            handlePurchase(
                              p.id,
                              p.name,
                              (p.priceINR || 0) * 100,
                              p.priceUSD || 0
                            );
                        }}
                      >
                        {b.l}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment methods */}
          <div className="pricing-payment-section">
            <div className="pricing-payment-title">
              Accepted Payment Methods
            </div>
            <div className="pricing-payment-methods">
              {[
                "💳 Visa",
                "💳 Mastercard",
                "💳 Amex",
                "🍎 Apple Pay",
                "🔵 Google Pay",
                "📱 UPI",
                "📱 GPay",
                "📱 PhonePe",
                "🏦 Net Banking",
              ].map((m) => (
                <span key={m} className="pricing-payment-pill">
                  {m}
                </span>
              ))}
            </div>
            <div className="pricing-razorpay-badge">
              <img
                src="https://razorpay.com/assets/razorpay-glyph.svg"
                alt="Razorpay"
                width={14}
                height={14}
                onError={(e) => (e.target.style.display = "none")}
              />
              Secured by Razorpay
            </div>
          </div>

          {/* Guarantee */}
          <div className="pricing-guarantee card">
            <Shield size={36} color="var(--accent-secondary)" />
            <div>
              <h3>7-Day Money-Back Guarantee</h3>
              <p>
                If you haven't used the service, we'll give you a full refund
                within 7 days — no questions asked.
              </p>
            </div>
          </div>

          <div className="pricing-final-cta">
            <Link
              to="/auth/signup"
              className="btn-primary"
              style={{ padding: "15px 44px", fontSize: 16 }}
            >
              Start Free — No Card Needed <ArrowRight size={18} />
            </Link>
            <p>10 free sessions + 1 free 45-minute call on signup</p>
          </div>
        </div>
      </div>
    </div>
  );
}
