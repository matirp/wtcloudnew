const mongoose = require('mongoose');

// Daily meal menu. One document per date; upserted by the admin.
const menuSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // "YYYY-MM-DD"
    breakfast: { type: String, default: '' },
    lunch:     { type: String, default: '' },
    dinner:    { type: String, default: '' },
    updatedBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Menu', menuSchema);
