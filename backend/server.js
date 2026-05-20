require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { getDb, closeDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// ============ Middleware ============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ============ Initialize Database ============
getDb();

// ============ Routes ============
const authRoutes = require('./routes/auth');
const adrRoutes = require('./routes/adrs');
const commentRoutes = require('./routes/comments');
const tagRoutes = require('./routes/tags');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/adrs', adrRoutes);
app.use('/api/adrs', commentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ============ Health Check ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ Error Handler ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ Start Server ============
app.listen(PORT, () => {
  console.log(`\n🚀 ADR System Backend running on http://localhost:${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
