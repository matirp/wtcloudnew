const mongoose = require('mongoose');

// A leave request marks a subscriber absent for a specific meal slot on a date.
// The meal credit is refunded when the leave is approved.
const leaveSchema = new mongoose.Schema(
  {
    customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    messId:    { type: String, required: true },
    date:      { type: String, required: true },           // "YYYY-MM-DD"
    mealSlot:  { type: String, enum: ['Breakfast', 'Lunch', 'Dinner'], required: true },
    status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason:    { type: String, default: '' },
  },
  { timestamps: true }
);

// One leave request per customer per meal per day
leaveSchema.index({ customer: 1, date: 1, mealSlot: 1 }, { unique: true });

module.exports = mongoose.model('Leave', leaveSchema);
