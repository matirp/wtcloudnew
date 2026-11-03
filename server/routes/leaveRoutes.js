const router = require('express').Router();
const Leave    = require('../models/Leave');
const Customer = require('../models/Customer');

// POST /api/leaves — apply for leave (admin applies on behalf of a subscriber).
router.post('/', async (req, res, next) => {
  try {
    const { messId, date, mealSlot, reason } = req.body;
    if (!messId || !date || !mealSlot) return res.status(400).json({ message: 'messId, date and mealSlot are required' });

    const c = await Customer.findOne({ messId: String(messId).toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Customer not found' });

    const leave = await Leave.create({ customer: c._id, messId: c.messId, date, mealSlot, reason });
    res.status(201).json(leave);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Leave already applied for this slot' });
    next(err);
  }
});

// GET /api/leaves — list with optional filters.
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.messId)  filter.messId  = String(req.query.messId).toUpperCase();
    if (req.query.date)    filter.date    = req.query.date;
    if (req.query.status)  filter.status  = req.query.status;
    const list = await Leave.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json(list);
  } catch (err) { next(err); }
});

// PATCH /api/leaves/:id — approve or reject a leave request.
router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved or rejected' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ message: 'Only pending leaves can be updated' });

    leave.status = status;
    await leave.save();

    // Refund one meal credit when approved
    if (status === 'approved') {
      await Customer.findByIdAndUpdate(leave.customer, { $inc: { mealsRemaining: 1 } });
    }

    res.json(leave);
  } catch (err) { next(err); }
});

// DELETE /api/leaves/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await Leave.findByIdAndDelete(req.params.id);
    res.json({ message: 'Leave deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
