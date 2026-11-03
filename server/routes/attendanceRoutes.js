const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Customer = require('../models/Customer');
const { allowedSlots, todayStr } = require('../utils/plans');

// POST /api/attendance/checkin  { messId, mealSlot }
router.post('/checkin', async (req, res, next) => {
  try {
    const { messId, mealSlot } = req.body;
    if (!messId || !mealSlot) {
      return res.status(400).json({ message: 'messId and mealSlot are required' });
    }

    const c = await Customer.findOne({ messId: String(messId).toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    if (!c.active) return res.status(403).json({ message: 'Customer account is deactivated' });

    const today = todayStr();
    const now = new Date();

    if (c.validityDate && new Date(c.validityDate) < now) {
      return res.status(400).json({ message: 'Subscription has expired' });
    }
    if (c.mealsRemaining <= 0) {
      return res.status(400).json({ message: 'No meals remaining' });
    }

    const slots = allowedSlots(c.planType);
    if (!slots.includes(mealSlot)) {
      return res.status(400).json({
        message: `${mealSlot} is not part of the ${c.planType} plan`,
      });
    }

    // Duplicate check: one entry per customer per meal slot per day.
    const existing = await Attendance.findOne({ customer: c._id, date: today, mealSlot });
    if (existing) {
      return res.status(409).json({ message: `Already checked in for ${mealSlot} today` });
    }

    c.mealsRemaining -= 1;
    await c.save();

    const att = await Attendance.create({
      customer: c._id,
      messId: c.messId,
      name: c.name,
      mealSlot,
      date: today,
    });

    res.status(201).json({ message: 'Checked in', attendance: att, customer: c });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance — all logs with optional filters.
router.get('/', async (req, res, next) => {
  try {
    const { date, customer, mealSlot, messId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (customer) filter.customer = customer;
    if (mealSlot) filter.mealSlot = mealSlot;
    if (messId) filter.messId = String(messId).toUpperCase();
    const list = await Attendance.find(filter).sort({ timestamp: -1 }).limit(500);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
