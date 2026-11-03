const router = require('express').Router();
const Menu = require('../models/Menu');

// GET /api/menu?date=YYYY-MM-DD — get menu for a specific date (default today).
router.get('/', async (req, res, next) => {
  try {
    const today = new Date();
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const date = req.query.date || defaultDate;
    const menu = await Menu.findOne({ date }) || { date, breakfast: '', lunch: '', dinner: '' };
    res.json(menu);
  } catch (err) { next(err); }
});

// GET /api/menu/week — current week's menus.
router.get('/week', async (req, res, next) => {
  try {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      dates.push(str);
    }
    const menus = await Menu.find({ date: { $in: dates } });
    // Return map of date→menu, fill missing dates with empty
    const map = {};
    for (const m of menus) map[m.date] = m;
    res.json(dates.map((d) => map[d] || { date: d, breakfast: '', lunch: '', dinner: '' }));
  } catch (err) { next(err); }
});

// PUT /api/menu — upsert today's (or specified) menu.
router.put('/', async (req, res, next) => {
  try {
    const { date, breakfast, lunch, dinner } = req.body;
    if (!date) return res.status(400).json({ message: 'date is required' });
    const menu = await Menu.findOneAndUpdate(
      { date },
      { date, breakfast, lunch, dinner },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(menu);
  } catch (err) { next(err); }
});

module.exports = router;
