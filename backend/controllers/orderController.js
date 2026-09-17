const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { createShiprocketOrder } = require('../utils/shiprocket');

// ──────────────────────────────────────────
// @route   POST /api/orders
// @desc    Create new order (server-side price calc + stock check)
// @access  Private
// ──────────────────────────────────────────
const createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' });
  }

  if (!shippingAddress) {
    return res.status(400).json({ message: 'Shipping address is required' });
  }

  try {
    let itemsSubtotal = 0;
    const resolvedItems = [];

    // Verify all items and stock
    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).json({ message: `Invalid product ID: ${item.product}` });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      const qty = parseInt(item.quantity, 10);
      if (!qty || qty < 1) {
        return res.status(400).json({ message: `Invalid quantity for product: ${product.name}` });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        });
      }

      itemsSubtotal += product.price * qty;

      resolvedItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: qty,
      });
    }

    // Deduct stock
    for (const item of resolvedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Apply optional discount, shipping fee, and GST tax
    let discount = 0;
    if (req.body.discountAmount && !isNaN(parseFloat(req.body.discountAmount))) {
      discount = Math.min(Math.max(0, parseFloat(req.body.discountAmount)), itemsSubtotal);
    }
    const shippingFee = (itemsSubtotal - discount) > 499 ? 0 : 50;
    const estimatedTax = (itemsSubtotal - discount) * 0.18;
    const calculatedGrandTotal = parseFloat((itemsSubtotal - discount + shippingFee + estimatedTax).toFixed(2));

    const selectedMethod = ['COD', 'UPI', 'Card', 'NetBanking'].includes(paymentMethod) ? paymentMethod : 'COD';
    const initialPaymentStatus = selectedMethod === 'COD' ? 'Pending' : 'Completed'; // Demo simulation

    const order = await Order.create({
      user: req.user._id,
      items: resolvedItems,
      totalAmount: calculatedGrandTotal,
      shippingAddress,
      paymentMethod: selectedMethod,
      paymentStatus: initialPaymentStatus,
      status: 'Pending',
    });

    if (selectedMethod === 'COD') {
      await createShiprocketOrder(order);
    }

    return res.status(201).json({ order });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ message: 'Server error creating order' });
  }
};

// ──────────────────────────────────────────
// @route   GET /api/orders/my-orders
// @desc    Get all orders for current user
// @access  Private
// ──────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Get my orders error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ──────────────────────────────────────────
// @route   GET /api/orders/:id
// @desc    Get single order — owner or admin can access
// @access  Private
// ──────────────────────────────────────────
const getOrderById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ──────────────────────────────────────────
// @route   PUT /api/orders/:id/cancel
// @desc    Cancel an order (restocks inventory)
// @access  Private
// ──────────────────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this order' });
    }

    if (['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order in state '${order.status}'` });
    }

    // Restock items
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    order.status = 'Cancelled';
    await order.save();

    return res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ message: 'Server error cancelling order' });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder };
