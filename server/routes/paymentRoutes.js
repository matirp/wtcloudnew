const router = require('express').Router();
const Payment  = require('../models/Payment');
const Customer = require('../models/Customer');

// POST /api/payments — record a payment and update the customer's paymentStatus.
router.post('/', async (req, res, next) => {
  try {
    const { messId, amount, method, note } = req.body;
    if (!messId || !amount) return res.status(400).json({ message: 'messId and amount are required' });

    const c = await Customer.findOne({ messId: String(messId).toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Customer not found' });

    const payment = await Payment.create({ customer: c._id, messId: c.messId, amount, method, note });

    // Recalculate paymentStatus from total paid vs plan cost
    const PLAN_COSTS = { 'Full Board': 3000, 'Lunch Only': 1200, 'Breakfast + Dinner': 2200 };
    const planCost = PLAN_COSTS[c.planType] || 0;
    const payments = await Payment.find({ customer: c._id });
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    c.paymentStatus = totalPaid >= planCost ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending';
    await c.save();

    res.status(201).json({ payment, customer: { messId: c.messId, paymentStatus: c.paymentStatus, totalPaid } });
  } catch (err) { next(err); }
});

// GET /api/payments?messId=XXX — payment history for a customer.
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.messId) filter.messId = String(req.query.messId).toUpperCase();
    const list = await Payment.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(list);
  } catch (err) { next(err); }
});

// GET /api/payments/summary — total collected and outstanding per customer.
router.get('/summary', async (req, res, next) => {
  try {
    const PLAN_COSTS = { 'Full Board': 3000, 'Lunch Only': 1200, 'Breakfast + Dinner': 2200 };
    const customers = await Customer.find({ active: true });
    const payments  = await Payment.find();

    const byCustomer = {};
    for (const p of payments) {
      const key = String(p.customer);
      byCustomer[key] = (byCustomer[key] || 0) + p.amount;
    }

    const summary = customers.map((c) => {
      const paid    = byCustomer[String(c._id)] || 0;
      const due     = Math.max(0, (PLAN_COSTS[c.planType] || 0) - paid);
      return { messId: c.messId, name: c.name, planType: c.planType, paid, due, paymentStatus: c.paymentStatus };
    });

    res.json(summary);
  } catch (err) { next(err); }
});

// DELETE /api/payments/:id — remove a mis-recorded payment.
router.delete('/:id', async (req, res, next) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
