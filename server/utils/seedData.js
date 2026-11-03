require('dotenv').config();
const mongoose  = require('mongoose');
const connectDB = require('../config/db');

const Customer  = require('../models/Customer');
const Attendance= require('../models/Attendance');
const Payment   = require('../models/Payment');
const Leave     = require('../models/Leave');
const Notice    = require('../models/Notice');
const Menu      = require('../models/Menu');

const { computeValidity, computeMeals, allowedSlots, todayStr } = require('./plans');

// ── Helpers ────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d;
}
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Seed data ──────────────────────────────────────────────────────────────
const CUSTOMERS = [
  { name: 'Arjun Sharma',     email: 'arjun.sharma@college.edu',    phone: '9876543210', planType: 'Full Board',        paymentStatus: 'Paid',    active: true  },
  { name: 'Priya Patel',      email: 'priya.patel@college.edu',     phone: '9876543211', planType: 'Lunch Only',        paymentStatus: 'Paid',    active: true  },
  { name: 'Rohit Verma',      email: 'rohit.verma@college.edu',     phone: '9876543212', planType: 'Full Board',        paymentStatus: 'Partial', active: true  },
  { name: 'Sneha Gupta',      email: 'sneha.gupta@college.edu',     phone: '9876543213', planType: 'Breakfast + Dinner',paymentStatus: 'Paid',    active: true  },
  { name: 'Karan Mehta',      email: 'karan.mehta@college.edu',     phone: '9876543214', planType: 'Lunch Only',        paymentStatus: 'Pending', active: true  },
  { name: 'Ananya Singh',     email: 'ananya.singh@college.edu',    phone: '9876543215', planType: 'Full Board',        paymentStatus: 'Paid',    active: true  },
  { name: 'Vikram Reddy',     email: 'vikram.reddy@college.edu',    phone: '9876543216', planType: 'Breakfast + Dinner',paymentStatus: 'Partial', active: true  },
  { name: 'Meera Joshi',      email: 'meera.joshi@college.edu',     phone: '9876543217', planType: 'Full Board',        paymentStatus: 'Paid',    active: true  },
  { name: 'Aditya Kumar',     email: 'aditya.kumar@college.edu',    phone: '9876543218', planType: 'Lunch Only',        paymentStatus: 'Paid',    active: true  },
  { name: 'Pooja Nair',       email: 'pooja.nair@college.edu',      phone: '9876543219', planType: 'Full Board',        paymentStatus: 'Pending', active: true  },
  { name: 'Siddharth Rao',    email: 'siddharth.rao@college.edu',   phone: '9876543220', planType: 'Breakfast + Dinner',paymentStatus: 'Paid',    active: true  },
  { name: 'Kavya Iyer',       email: 'kavya.iyer@college.edu',      phone: '9876543221', planType: 'Full Board',        paymentStatus: 'Partial', active: true  },
  { name: 'Rahul Tiwari',     email: 'rahul.tiwari@college.edu',    phone: '9876543222', planType: 'Lunch Only',        paymentStatus: 'Paid',    active: true  },
  { name: 'Divya Menon',      email: 'divya.menon@college.edu',     phone: '9876543223', planType: 'Full Board',        paymentStatus: 'Paid',    active: true  },
  { name: 'Nikhil Desai',     email: 'nikhil.desai@college.edu',    phone: '9876543224', planType: 'Breakfast + Dinner',paymentStatus: 'Pending', active: true  },
  { name: 'Tanvi Bhatt',      email: 'tanvi.bhatt@college.edu',     phone: '9876543225', planType: 'Full Board',        paymentStatus: 'Paid',    active: true  },
  { name: 'Akash Yadav',      email: 'akash.yadav@college.edu',     phone: '9876543226', planType: 'Lunch Only',        paymentStatus: 'Partial', active: true  },
  { name: 'Riya Kapoor',      email: 'riya.kapoor@college.edu',     phone: '9876543227', planType: 'Full Board',        paymentStatus: 'Paid',    active: true  },
  { name: 'Harsh Malhotra',   email: 'harsh.malhotra@college.edu',  phone: '9876543228', planType: 'Breakfast + Dinner',paymentStatus: 'Paid',    active: false },
  { name: 'Ishaan Chatterjee',email: 'ishaan.chatterjee@college.edu',phone:'9876543229', planType: 'Full Board',        paymentStatus: 'Pending', active: true  },
];

const MENU_ITEMS = {
  breakfast: [
    'Idli Sambar, Coconut Chutney, Tea/Coffee',
    'Poha, Jalebi, Chai',
    'Paratha, Curd, Pickle, Tea',
    'Upma, Coconut Chutney, Juice',
    'Dosa, Sambar, Chutney, Coffee',
    'Bread Toast, Omelette, Tea',
    'Aloo Puri, Chutney, Chai',
  ],
  lunch: [
    'Dal Tadka, Jeera Rice, Roti, Salad, Papad',
    'Rajma Chawal, Roti, Raita, Salad',
    'Chole Bhature, Onion Salad, Pickle',
    'Paneer Butter Masala, Naan, Dal Soup, Salad',
    'Mixed Veg Sabzi, Rice, Roti, Dal, Curd',
    'Aloo Gobi, Dal Fry, Steamed Rice, Roti, Buttermilk',
    'Kadai Paneer, Roti, Rice, Dal Soup, Sweet',
  ],
  dinner: [
    'Palak Paneer, Roti, Rice, Dal, Salad',
    'Aloo Matar, Dal, Roti, Rice, Kheer',
    'Matar Mushroom, Roti, Fried Rice, Raita',
    'Shahi Paneer, Naan, Rice, Dal, Gulab Jamun',
    'Baingan Bharta, Roti, Dal Tadka, Rice, Curd',
    'Dal Makhani, Butter Naan, Jeera Rice, Salad',
    'Mix Sabzi, Roti, Steamed Rice, Dal, Halwa',
  ],
};

const NOTICES = [
  {
    title: 'Mess Closed on Sunday',
    body: 'The mess will remain closed this Sunday (weekly off). Packed meals will be provided at the hostel counter from 8 AM to 8 PM.',
    priority: 'important',
    active: true,
  },
  {
    title: 'Monthly Fee Due',
    body: 'November mess fees are due by 10th November. Please clear your dues to avoid service interruption. Contact the mess office for UPI/cash payment.',
    priority: 'urgent',
    active: true,
  },
  {
    title: 'Special Dinner on Diwali',
    body: 'A special Diwali dinner will be served on 1st November with sweets and snacks. All subscribers are invited.',
    priority: 'normal',
    active: true,
  },
  {
    title: 'New Breakfast Timing',
    body: 'From this week, breakfast timings have been revised to 7:30 AM – 9:30 AM. Please ensure you arrive on time.',
    priority: 'important',
    active: true,
  },
  {
    title: 'Water Supply Disruption',
    body: 'Due to maintenance work, water supply will be interrupted on 5th November from 10 AM to 2 PM. Drinking water will be available at the mess counter.',
    priority: 'normal',
    active: false,
  },
];

async function seed() {
  await connectDB(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Clear existing data ──────────────────────────────────────────────────
  console.log('Clearing existing seed data…');
  await Promise.all([
    Customer.deleteMany({}),
    Attendance.deleteMany({}),
    Payment.deleteMany({}),
    Leave.deleteMany({}),
    Notice.deleteMany({}),
    Menu.deleteMany({}),
  ]);

  // ── Create customers ─────────────────────────────────────────────────────
  console.log('Creating customers…');
  const customers = [];
  for (const data of CUSTOMERS) {
    // Vary start dates: some started 25 days ago (nearly expired), some 5 days ago (fresh)
    const daysBack = Math.floor(Math.random() * 25) + 1;
    const startDate = daysAgo(daysBack);
    const validityDate = computeValidity(startDate, data.planType);

    // Some customers have fewer meals left (simulating usage)
    const totalMeals = computeMeals(data.planType);
    const mealsUsed  = Math.floor(Math.random() * Math.min(totalMeals - 1, daysBack * 2));
    const mealsRemaining = Math.max(1, totalMeals - mealsUsed);

    const c = new Customer({
      ...data,
      startDate,
      validityDate,
      mealsRemaining,
    });
    await c.save();
    customers.push(c);
    process.stdout.write('.');
  }
  console.log(`\n  Created ${customers.length} customers`);

  // ── Create attendance logs for the last 7 days ───────────────────────────
  console.log('Creating attendance logs…');
  let attCount = 0;
  const attendanceDocs = [];

  for (let day = 7; day >= 0; day--) {
    const date = daysAgo(day);
    const dateString = dateStr(date);

    for (const c of customers) {
      if (!c.active) continue;
      const slots = allowedSlots(c.planType);

      for (const slot of slots) {
        // ~75% chance of check-in each slot (simulate realistic attendance)
        if (Math.random() < 0.75) {
          try {
            const doc = {
              customer: c._id,
              messId: c.messId,
              name: c.name,
              mealSlot: slot,
              date: dateString,
              timestamp: new Date(date.getTime() + Math.random() * 3600000),
            };
            attendanceDocs.push(doc);
            attCount++;
          } catch { /* skip duplicates */ }
        }
      }
    }
  }

  // Insert in bulk, ignoring duplicate key errors
  try {
    await Attendance.insertMany(attendanceDocs, { ordered: false });
  } catch (e) { /* ignore E11000 duplicates */ }
  console.log(`  Created ~${attCount} attendance records`);

  // ── Create payments ───────────────────────────────────────────────────────
  console.log('Creating payments…');
  const PLAN_COSTS = { 'Full Board': 3000, 'Lunch Only': 1200, 'Breakfast + Dinner': 2200 };
  const METHODS    = ['Cash', 'UPI', 'Card'];
  let payCount = 0;

  for (const c of customers) {
    const cost   = PLAN_COSTS[c.planType];
    const status = c.paymentStatus;
    const method = pick(METHODS);

    if (status === 'Paid') {
      // One full payment
      await Payment.create({
        customer: c._id, messId: c.messId,
        amount: cost, method,
        note: 'Full payment for November',
      });
      payCount++;
    } else if (status === 'Partial') {
      // Two partial payments
      const first  = Math.round(cost * 0.5);
      const second = Math.round(cost * 0.25);
      await Payment.create({ customer: c._id, messId: c.messId, amount: first,  method, note: 'First instalment' });
      await Payment.create({ customer: c._id, messId: c.messId, amount: second, method, note: 'Second instalment' });
      payCount += 2;
    }
    // Pending = no payment yet, skip
  }
  console.log(`  Created ${payCount} payment records`);

  // ── Create leave requests ─────────────────────────────────────────────────
  console.log('Creating leave requests…');
  const leaveStatuses = ['pending', 'approved', 'rejected'];
  let leaveCount = 0;
  const leaveDocs = [];

  for (const c of customers.slice(0, 12)) {
    const slots = allowedSlots(c.planType);
    // 1-2 leave requests per customer
    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
      const daysOffset = Math.floor(Math.random() * 7) + 1;
      const leaveDate  = dateStr(daysAgo(daysOffset));
      const slot       = pick(slots);
      const reasons    = [
        'Going home for the weekend',
        'Medical appointment',
        'Family function',
        'College trip',
        'Exam preparation — will eat outside',
        'Out of station',
        'Attending workshop',
      ];
      leaveDocs.push({
        customer: c._id, messId: c.messId,
        date: leaveDate, mealSlot: slot,
        status: pick(leaveStatuses),
        reason: pick(reasons),
      });
      leaveCount++;
    }
  }
  try {
    await Leave.insertMany(leaveDocs, { ordered: false });
  } catch { /* ignore duplicates */ }
  console.log(`  Created ~${leaveCount} leave requests`);

  // ── Create notices ────────────────────────────────────────────────────────
  console.log('Creating notices…');
  await Notice.insertMany(NOTICES);
  console.log(`  Created ${NOTICES.length} notices`);

  // ── Create menu for last 3 days + next 4 days ────────────────────────────
  console.log('Creating meal menus…');
  const menuDocs = [];
  for (let i = -3; i <= 4; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    menuDocs.push({
      date:      dateStr(d),
      breakfast: pick(MENU_ITEMS.breakfast),
      lunch:     pick(MENU_ITEMS.lunch),
      dinner:    pick(MENU_ITEMS.dinner),
    });
  }
  try {
    await Menu.insertMany(menuDocs, { ordered: false });
  } catch { /* ignore duplicates */ }
  console.log(`  Created ${menuDocs.length} menu entries`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✓ Seed complete!');
  console.log(`  Customers : ${customers.length}`);
  console.log(`  Attendance: ~${attCount} records (last 7 days)`);
  console.log(`  Payments  : ${payCount} transactions`);
  console.log(`  Leaves    : ~${leaveCount} requests`);
  console.log(`  Notices   : ${NOTICES.length}`);
  console.log(`  Menus     : ${menuDocs.length} days`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
