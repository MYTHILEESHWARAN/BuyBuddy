const Coupon = require('../models/Coupon');

// @route   GET /api/coupons
// @desc    Get active coupons list
// @access  Public
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true });
    return res.status(200).json({ coupons });
  } catch (error) {
    console.error('Get coupons error:', error);
    return res.status(500).json({ message: 'Server error fetching coupons' });
  }
};

// @route   POST /api/coupons/validate
// @desc    Validate coupon code and return discount amount in INR
// @access  Public
const validateCoupon = async (req, res) => {
  const { code } = req.body;
  const rawSubtotal = req.body.subtotal ?? req.body.orderAmount;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  const numericSubtotal = parseFloat(rawSubtotal);
  if (isNaN(numericSubtotal) || numericSubtotal <= 0) {
    return res.status(400).json({ message: 'Invalid cart subtotal' });
  }

  try {
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or expired coupon code' });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    if (numericSubtotal < coupon.minOrderValue) {
      return res.status(400).json({
        message: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString('en-IN')} required for coupon ${coupon.code}`,
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percent') {
      discountAmount = (numericSubtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, numericSubtotal);
    discountAmount = parseFloat(discountAmount.toFixed(2));

    return res.status(200).json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      description: coupon.description,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return res.status(500).json({ message: 'Server error validating coupon' });
  }
};

module.exports = { getCoupons, validateCoupon };
