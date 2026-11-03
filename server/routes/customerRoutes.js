const router   = require('express').Router();
const Customer = require('../models/Customer');
const { computeValidity, computeMeals } = require('../utils/plans');

// ── Specific string routes MUST come before /:id ───────────────────────────

// GET /api/customers/faces — enrolled face descriptors for the scanner.
router.get('/faces', async (req, res, next) => {
  try {
    const customers = (await Customer.find({ active: true, faceDescriptor: { $type: 4, $ne: null } }))
      .filter((c) => Array.isArray(c.faceDescriptor) && c.faceDescriptor.length === 128);
    res.json(customers.map((c) => ({
      _id: c._id, messId: c.messId, name: c.name, faceDescriptor: c.faceDescriptor,
    })));
  } catch (err) { next(err); }
});

// GET /api/customers/stats — aggregate counts for the dashboard.
router.get('/stats', async (req, res, next) => {
  try {
    const all      = await Customer.find();
    const now      = new Date();
    const active   = all.filter((c) => c.active).length;
    const expired  = all.filter((c) => c.active && c.validityDate && new Date(c.validityDate) < now).length;
    const lowMeals = all.filter((c) => c.active && c.mealsRemaining <= 5 && c.mealsRemaining > 0).length;
    const pending  = all.filter((c) => c.paymentStatus !== 'Paid').length;
    const enrolled = (await Customer.find({ active: true, faceDescriptor: { $type: 4, $ne: null } }))
      .filter((c) => Array.isArray(c.faceDescriptor) && c.faceDescriptor.length === 128).length;
    res.json({ total: all.length, active, expired, lowMeals, pending, enrolled });
  } catch (err) { next(err); }
});

// GET /api/customers/by-mess/:messId — lookup by mess ID.
router.get('/by-mess/:messId', async (req, res, next) => {
  try {
    const c = await Customer.findOne({ messId: req.params.messId.toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    res.json(c);
  } catch (err) { next(err); }
});

// ── Collection routes ──────────────────────────────────────────────────────

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const { active, planType, paymentStatus, search } = req.query;
    const filter = {};
    if (active !== undefined) filter.active = active === 'true';
    if (planType)      filter.planType      = planType;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search) {
      filter.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { messId: { $regex: search, $options: 'i' } },
        { email:  { $regex: search, $options: 'i' } },
      ];
    }
    const list = await Customer.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/customers — create a subscriber.
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, planType, paymentStatus, faceDescriptor } = req.body;
    const c = new Customer({ name, email, phone, planType, paymentStatus });
    await c.save();
    if (Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      c.faceDescriptor = faceDescriptor;
      await c.save();
    }
    res.status(201).json(c);
  } catch (err) { next(err); }
});

// ── Single resource routes /:id ────────────────────────────────────────────

// GET /api/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    res.json(c);
  } catch (err) { next(err); }
});

// PUT /api/customers/:id — update subscription.
router.put('/:id', async (req, res, next) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    const { name, phone, email, planType, paymentStatus, mealsRemaining, active, startDate } = req.body;
    if (name          !== undefined) c.name          = name;
    if (phone         !== undefined) c.phone         = phone;
    if (email         !== undefined) c.email         = email;
    if (paymentStatus !== undefined) c.paymentStatus = paymentStatus;
    if (mealsRemaining!== undefined) c.mealsRemaining= mealsRemaining;
    if (active        !== undefined) c.active        = active;
    if (startDate     !== undefined) c.startDate     = startDate;
    if (planType !== undefined && planType !== c.planType) {
      c.planType      = planType;
      c.validityDate  = computeValidity(c.startDate, planType);
      c.mealsRemaining= computeMeals(planType);
    }
    await c.save();
    res.json(c);
  } catch (err) { next(err); }
});

// PUT /api/customers/:id/face — store/replace the face descriptor.
router.put('/:id/face', async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ message: 'faceDescriptor must be an array of 128 numbers' });
    }
    const c = await Customer.findByIdAndUpdate(req.params.id, { faceDescriptor }, { new: true });
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Face descriptor saved', customer: { id: c._id, messId: c.messId, name: c.name } });
  } catch (err) { next(err); }
});

// POST /api/customers/:id/renew — renew subscription (adds 30 days + full meal credits).
router.post('/:id/renew', async (req, res, next) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    const { planType } = req.body;          // optional: change plan on renewal
    if (planType) c.planType = planType;
    // If still valid, extend from the current validity date; otherwise start from today.
    const base       = c.validityDate && new Date(c.validityDate) > new Date()
      ? new Date(c.validityDate) : new Date();
    c.startDate      = base;
    c.validityDate   = computeValidity(base, c.planType);
    c.mealsRemaining = computeMeals(c.planType);
    c.active         = true;
    await c.save();
    res.json({ message: 'Subscription renewed', customer: c });
  } catch (err) { next(err); }
});

// DELETE /api/customers/:id — soft-delete (deactivate) by default; ?hard=true for permanent.
router.delete('/:id', async (req, res, next) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Customer not found' });
    if (req.query.hard === 'true') {
      await c.deleteOne();
      return res.json({ message: 'Customer deleted' });
    }
    c.active = false;
    await c.save();
    res.json({ message: 'Customer deactivated', customer: c });
  } catch (err) { next(err); }
});

module.exports = router;
