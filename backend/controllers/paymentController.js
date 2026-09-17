const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_fallback',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_fallback',
});

// @desc    Create Razorpay order
// @route   POST /api/payment/create-order
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;
    
    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise for INR)
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ message: 'Some error occurred while creating Razorpay order' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ message: error.message || 'Error creating Razorpay order' });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/payment/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    
    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_fallback')
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Signature is valid, update order status if order_id is provided
      if (order_id) {
        const order = await Order.findById(order_id);
        if (order) {
          order.paymentStatus = 'Completed';
          order.status = 'Confirmed';
          await order.save();
        }
      }
      return res.status(200).json({ message: 'Payment verified successfully' });
    } else {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('Razorpay Verify Error:', error);
    res.status(500).json({ message: error.message || 'Error verifying payment' });
  }
};
