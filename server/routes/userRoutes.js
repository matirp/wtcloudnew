const router = require('express').Router();
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');

// All user-management routes are admin-only.
router.use(verifyToken, requireRole('admin'));

// POST /api/users  (admin) — create another user (e.g. an admin).
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const user = new User({ name, email, password, role: role || 'admin' });
    await user.save();
    res
      .status(201)
      .json({ message: 'User created', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// GET /api/users  (admin) — list users.
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
