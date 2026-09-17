require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const products = require('../utils/seedData');

const initialCoupons = [
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 499,
    maxDiscountAmount: 500,
    description: '10% OFF up to ₹500 on your first order over ₹499!'
  },
  {
    code: 'SAVE500',
    discountType: 'fixed',
    discountValue: 500,
    minOrderValue: 2499,
    description: 'Flat ₹500 OFF on orders above ₹2,499!'
  },
  {
    code: 'SHOPNOW20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 1999,
    maxDiscountAmount: 1000,
    description: '20% OFF up to ₹1,000 on fashion & accessories over ₹1,999!'
  },
  {
    code: 'FESTIVE15',
    discountType: 'percentage',
    discountValue: 15,
    minOrderValue: 999,
    maxDiscountAmount: 750,
    description: '15% OFF up to ₹750 festive deal on minimum order of ₹999!'
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing products and coupons
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    console.log('🗑  Cleared existing products and coupons');

    // Insert seed products
    const insertedProducts = await Product.insertMany(products);
    console.log(`🌱 Seeded ${insertedProducts.length} products successfully`);

    // Insert seed coupons
    const insertedCoupons = await Coupon.insertMany(initialCoupons);
    console.log(`🎟  Seeded ${insertedCoupons.length} promo coupons successfully`);

    console.log('\nProducts seeded:');
    insertedProducts.forEach((p) => console.log(`  • [${p.category}] ${p.name} — ₹${p.price}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();

