const axios = require('axios');
require('dotenv').config();

let shiprocketToken = null;

const getShiprocketToken = async () => {
  if (shiprocketToken) return shiprocketToken;

  try {
    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
      email: process.env.SHIPROCKET_EMAIL || 'demo@shiprocket.com',
      password: process.env.SHIPROCKET_PASSWORD || 'demo',
    });
    shiprocketToken = response.data.token;
    return shiprocketToken;
  } catch (error) {
    console.error('Shiprocket Auth Error:', error.response?.data || error.message);
    return null;
  }
};

const createShiprocketOrder = async (order) => {
  try {
    // If not configured, just return a mock success
    if (process.env.SHIPROCKET_EMAIL === 'your_shiprocket_email') {
      console.log('📦 [Shiprocket Mock] Order pushed to logistics:', order._id);
      return { success: true, tracking_id: 'MOCK_AWB_123456789' };
    }

    const token = await getShiprocketToken();
    if (!token) throw new Error('Shiprocket authentication failed');

    const shiprocketOrderData = {
      order_id: order._id.toString(),
      order_date: new Date(order.createdAt).toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: order.shippingAddress.fullName,
      billing_last_name: "",
      billing_address: order.shippingAddress.address,
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.postalCode,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: order.user?.email || "customer@example.com",
      billing_phone: order.shippingAddress.phone,
      shipping_is_billing: true,
      order_items: order.items.map(item => ({
        name: item.product?.name || 'Product',
        sku: item.product?._id?.toString() || 'SKU',
        units: item.quantity,
        selling_price: item.product?.price || 0,
      })),
      payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      sub_total: order.totalAmount,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 1,
    };

    const response = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', shiprocketOrderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📦 [Shiprocket] Order created:', response.data.order_id);
    return { success: true, tracking_id: response.data.awb_code || response.data.order_id };
  } catch (error) {
    console.error('Shiprocket Order Error:', error.response?.data || error.message);
    return { success: false };
  }
};

module.exports = { createShiprocketOrder };
