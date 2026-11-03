const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title:    { type: String, required: [true, 'Title is required'], trim: true },
    body:     { type: String, required: [true, 'Body is required'],  trim: true },
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
    active:   { type: Boolean, default: true },
    postedBy: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);
