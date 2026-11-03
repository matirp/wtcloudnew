const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { verifyToken } = require('../middleware/auth');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}

// POST /api/auth/register
// Customer self-registration: creates the mess subscription + linked user account.
// Optional 128-value faceDescriptor enrolls the customer's face for the scanner.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, planType, faceDescriptor } = req.body;
    if (!name || !email || !password || !phone || !planType) {
      return res.status(400).json({ message: 'name, email, password, phone, planType are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let descriptor = undefined;
    if (faceDescriptor) {
      if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
        return res.status(400).json({ message: 'faceDescriptor must be an array of 128 numbers' });
      }
      descriptor = faceDescriptor;
    }

    const customer = new Customer({ name, email, phone, planType, faceDescriptor: descriptor });
    await customer.save();

    const user = new User({ name, email, password, role: 'customer', customerId: customer._id });
    await user.save();

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        customerId: customer._id,
        messId: customer.messId,
      },
    });
  } catch (err) {
    // If user creation fails after customer was saved, clean up the orphan customer.
    if (err.code === 11000 && err.keyValue && err.keyValue.email) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    let messId = null;
    if (req.user.customerId) {
      const c = await Customer.findById(req.user.customerId);
      if (c) messId = c.messId;
    }
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        customerId: req.user.customerId,
        messId,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
