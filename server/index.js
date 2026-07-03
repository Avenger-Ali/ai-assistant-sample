require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const app = express();

// CORS — allow localhost:3000 in dev
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/user',       require('./routes/user'));
app.use('/api/sessions',   require('./routes/sessions'));
app.use('/api/billing',    require('./routes/billing'));
app.use('/api/documents',  require('./routes/documents'));
app.use('/api/credits',    require('./routes/credits'));
app.use('/api/mock',       require('./routes/mock'));
app.use('/api/enterprise', require('./routes/enterprise'));
app.use('/api/affiliate',  require('./routes/affiliate'));
app.use('/api/hitl',       require('./routes/hitl'));
app.use('/api/desktop',    require('./routes/desktop'));
app.use('/api/ai',         require('./routes/ai'));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'Shadow AI API v3.0',
  mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  razorpay: !!process.env.RAZORPAY_KEY_ID,
  gemini: !!process.env.GEMINI_API_KEY,
  timestamp: new Date().toISOString(),
}));

// MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shadow-ai';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

mongoose.connection.on('error', err => console.error('MongoDB runtime error:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Shadow AI Server v3.0 running on port ${PORT}`);
  console.log(`   MongoDB: ${MONGO_URI.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`   Razorpay: ${process.env.RAZORPAY_KEY_ID || 'NOT SET'}`);
  console.log(`   Gemini:   ${process.env.GEMINI_API_KEY ? 'SET ✓' : 'NOT SET'}`);
});
