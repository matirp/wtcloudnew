const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    messId: { type: String, required: true },
    name: { type: String, required: true },
    mealSlot: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner'], required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate check-ins: one per customer per meal slot per day.
attendanceSchema.index({ customer: 1, date: 1, mealSlot: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
