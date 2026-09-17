import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getOrderById } from '../services/orderService';
import { formatINR } from '../utils/formatCurrency';

const OrderConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order) {
      const fetchOrder = async () => {
        try {
          const { data } = await getOrderById(id);
          setOrder(data.order);
        } catch {
          setError('Could not load order details.');
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [id, order]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="error-state">
          <span>⚠️</span>
          <h2>Order Not Found</h2>
          <p>{error}</p>
          <Link to="/my-orders" className="btn btn--primary">View My Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 1rem 5rem' }}>
      <div className="confirmation-card">
        <div className="confirmation-card__header">
          <div className="confirmation-icon">🎉</div>
          <h1>Order Confirmed!</h1>
          <p>Thank you for your purchase. Your order has been placed successfully.</p>
        </div>

        <div className="confirmation-card__meta">
          <div className="meta-item">
            <span className="meta-label">Order ID</span>
            <span className="meta-value meta-value--mono">#{order._id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Date</span>
            <span className="meta-value">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Status</span>
            <span className={`status-badge status-badge--${order.status.toLowerCase()}`}>{order.status}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Total</span>
            <span className="meta-value meta-value--price">{formatINR(order.totalAmount)}</span>
          </div>
        </div>

        {/* Items */}
        <div className="confirmation-card__section">
          <h3>Items Ordered</h3>
          <div className="confirmation-items">
            {order.items.map((item, i) => (
              <div key={i} className="confirmation-item">
                <img src={item.image} alt={item.name} className="confirmation-item__img"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/70x70?text=IMG'; }} />
                <div className="confirmation-item__info">
                  <span className="confirmation-item__name">{item.name}</span>
                  <span className="confirmation-item__detail">Qty: {item.quantity} × {formatINR(item.price)}</span>
                </div>
                <span className="confirmation-item__total">{formatINR(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping */}
        <div className="confirmation-card__section">
          <h3>Shipping Address</h3>
          <div className="shipping-display">
            <p>{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.address}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
            <p>📞 {order.shippingAddress.phone}</p>
          </div>
        </div>

        <div className="confirmation-card__actions">
          <Link to="/products" className="btn btn--primary btn--lg">Continue Shopping →</Link>
          <Link to="/my-orders" className="btn btn--outline btn--lg">View All Orders</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
