const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const User    = require('../models/User');
const Razorpay = require('razorpay');
const crypto   = require('crypto');

// ── Razorpay instance ───────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID     || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

// ── All plans ───────────────────────────────────────────────
const PLANS = [
  // Credits
  { id:'credits_3',  name:'3 Credits',  type:'credits', credits:3,  priceINR:369000,  priceUSD:38.90,  hours:'~1.5 hrs' },
  { id:'credits_7',  name:'7 Credits',  type:'credits', credits:7,  priceINR:738000,  priceUSD:77.90,  hours:'~3.5 hrs', popular:true },
  { id:'credits_15', name:'15 Credits', type:'credits', credits:15, priceINR:1107000, priceUSD:116.90, hours:'~7.5 hrs' },
  // Subscriptions
  { id:'monthly',  name:'Monthly',  type:'subscription', period:'month', priceINR:947000,  priceUSD:99.90  },
  { id:'yearly',   name:'Yearly',   type:'subscription', period:'year',  priceINR:2842000, priceUSD:299.90, badge:'Save 75%', popular:true },
  { id:'lifetime', name:'Lifetime', type:'subscription', period:'once',  priceINR:7499000, priceUSD:799.00  },
  // Enterprise
  { id:'ent_10',  name:'10 Seats',  type:'enterprise', seats:10,  priceINR:2900000,  priceUSD:290 },
  { id:'ent_50',  name:'50 Seats',  type:'enterprise', seats:50,  priceINR:12000000, priceUSD:1200 },
  { id:'ent_100', name:'100 Seats', type:'enterprise', seats:100, priceINR:19000000, priceUSD:1900 },
];

// ── GET /api/billing/plans ──────────────────────────────────
router.get('/plans', (_req, res) => res.json({ plans: PLANS }));

// ── GET /api/billing/key ─── send Razorpay public key ──────
router.get('/key', (_req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID || '' });
});

// ── POST /api/billing/create-order ─────────────────────────
// Creates a Razorpay order that the frontend uses to open the checkout
router.post('/create-order', auth, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    const order = await razorpay.orders.create({
      amount:   plan.priceINR,   // in paise (₹1 = 100 paise)
      currency: 'INR',
      receipt:  `receipt_${Date.now()}`,
      notes:    { planId, userId: req.user._id.toString(), planName: plan.name },
    });

    res.json({ order, plan });
  } catch (e) {
    console.error('Razorpay order error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/billing/verify ── verify signature & activate ─
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    // Verify HMAC signature
    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Activate plan
    const plan = PLANS.find(p => p.id === planId);
    const user = await User.findById(req.user._id);

    if (plan.type === 'credits') {
      user.credits += plan.credits;
      await user.save();
      return res.json({ success: true, message: `${plan.credits} credits added`, credits: user.credits });
    }

    if (plan.type === 'subscription') {
      const days = { month: 30, year: 365, once: 365 * 99 };
      user.subscription = {
        type:   plan.period === 'once' ? 'lifetime' : plan.id === 'monthly' ? 'monthly' : 'yearly',
        status: 'active',
        startDate: new Date(),
        endDate:   new Date(Date.now() + (days[plan.period] || 30) * 86400000),
      };
      await user.save();
      return res.json({ success: true, message: `${plan.name} subscription activated`, subscription: user.subscription });
    }

    res.json({ success: true, message: 'Payment verified' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/billing/purchase (mock fallback) ──────────────
router.post('/purchase', auth, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = await User.findById(req.user._id);
    const creditMap = { credits_3: 3, credits_7: 7, credits_15: 15 };
    const subMap    = { monthly: 'monthly', yearly: 'yearly', lifetime: 'lifetime' };

    if (creditMap[planId] !== undefined) {
      user.credits += creditMap[planId];
      await user.save();
      return res.json({ success: true, credits: user.credits });
    }
    if (subMap[planId]) {
      const days = { monthly: 30, yearly: 365, lifetime: 365 * 99 };
      user.subscription = {
        type: subMap[planId], status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + (days[subMap[planId]] || 30) * 86400000),
      };
      await user.save();
      return res.json({ success: true, subscription: user.subscription });
    }
    res.status(400).json({ message: 'Invalid plan' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/invoices', auth, (_req, res) => res.json({ invoices: [] }));

module.exports = router;
