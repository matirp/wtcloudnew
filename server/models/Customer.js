const mongoose = require('mongoose');
const { PLAN_NAMES, computeValidity, computeMeals } = require('../utils/plans');

const customerSchema = new mongoose.Schema(
  {
    messId: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone must be 10 digits'],
    },
    planType: {
      type: String,
      required: [true, 'Plan type is required'],
      enum: { values: PLAN_NAMES, message: '{VALUE} is not a valid plan type' },
    },
    startDate:      { type: Date,    default: Date.now },
    validityDate:   { type: Date },
    mealsRemaining: { type: Number,  default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Partial'],
      default: 'Pending',
    },
    // 128-number face descriptor — omitted entirely when not enrolled.
    // The route strips invalid descriptors before saving, so this field
    // is always either absent or a valid 128-element array.
    faceDescriptor: { type: [Number] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-generate a sequential messId (MESS-0001) before validation runs.
customerSchema.pre('validate', async function (next) {
  if (this.isNew && !this.messId) {
    try {
      const count = await mongoose.models.Customer.countDocuments();
      let n = count + 1;
      let candidate = `MESS-${String(n).padStart(4, '0')}`;
      while (await mongoose.models.Customer.exists({ messId: candidate })) {
        n += 1;
        candidate = `MESS-${String(n).padStart(4, '0')}`;
      }
      this.messId = candidate;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Auto-calculate validity date and meal credits on creation.
customerSchema.pre('validate', function (next) {
  if (!this.validityDate) {
    this.validityDate = computeValidity(this.startDate || new Date(), this.planType);
  }
  if (!this.mealsRemaining || this.mealsRemaining === 0) {
    this.mealsRemaining = computeMeals(this.planType);
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
