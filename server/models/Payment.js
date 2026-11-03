const mongoose = require('mongoose');

// Individual payment transaction for a customer.
const paymentSchema = new mongoose.Schema(
  {
    customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    messId:     { type: String, required: true },
    amount:     { type: Number, required: [true, 'Amount is required'], min: [1, 'Amount must be positive'] },
    method:     { type: String, enum: ['Cash', 'UPI', 'Card', 'Other'], default: 'Cash' },
    note:       { type: String, default: '' },
    recordedBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
