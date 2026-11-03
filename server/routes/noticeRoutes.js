const router = require('express').Router();
const Notice = require('../models/Notice');

// GET /api/notices — active notices (shown on dashboard).
router.get('/', async (req, res, next) => {
  try {
    const filter = req.query.all === 'true' ? {} : { active: true };
    const list = await Notice.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/notices
router.post('/', async (req, res, next) => {
  try {
    const { title, body, priority } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'title and body are required' });
    const notice = await Notice.create({ title, body, priority });
    res.status(201).json(notice);
  } catch (err) { next(err); }
});

// PUT /api/notices/:id
router.put('/:id', async (req, res, next) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json(notice);
  } catch (err) { next(err); }
});

// DELETE /api/notices/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notice deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
