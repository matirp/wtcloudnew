require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' })); // face descriptors can be sizeable
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// API routes (no auth required — open access for the college demo)
app.use('/api/customers',  require('./routes/customerRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/payments',   require('./routes/paymentRoutes'));
app.use('/api/notices',    require('./routes/noticeRoutes'));
app.use('/api/leaves',     require('./routes/leaveRoutes'));
app.use('/api/menu',       require('./routes/menuRoutes'));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  connectDB(process.env.MONGO_URI)
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((err) => {
      console.error('Failed to connect to MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = app;
