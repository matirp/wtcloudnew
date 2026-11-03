require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

async function seed() {
  await connectDB(process.env.MONGO_URI);

  const email = process.env.ADMIN_EMAIL || 'admin@mess.local';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin already exists (${email}). Skipping.`);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'Mess Admin',
      email,
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
    });
    console.log(`Admin created -> ${email} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
