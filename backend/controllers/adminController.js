const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics (sales, users, orders, low stock)
// @access  Private/Admin
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const orders = await Order.find({ status: { $ne: 'Cancelled' } });
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const lowStockProducts = await Product.find({ stock: { $lte: 5 } }).select('name stock price category');

    return res.status(200).json({
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalSales: parseFloat(totalSales.toFixed(2)),
        lowStockCount: lowStockProducts.length,
      },
      lowStockProducts,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({ message: 'Server error fetching admin stats' });
  }
};

// @route   GET /api/admin/orders
// @desc    Get all orders across all customers
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    return res.status(500).json({ message: 'Server error fetching orders' });
  }
};

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status timeline & payment status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  const { status, paymentStatus } = req.body;
  const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status: ${status}` });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    return res.status(200).json({ message: 'Order updated successfully', order });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ message: 'Server error updating order' });
  }
};

module.exports = { getStats, getAllOrders, updateOrderStatus };
