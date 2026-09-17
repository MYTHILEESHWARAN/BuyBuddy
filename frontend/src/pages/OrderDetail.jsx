import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderById, cancelOrder } from '../services/orderService';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/formatCurrency';

const STATUS_TIMELINE = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data } = await getOrderById(id);
      setOrder(data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found or access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? Item stock will be restocked.')) return;
    setCancelling(true);
    try {
      await cancelOrder(order._id);
      toast.success('Order cancelled successfully');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1rem' }}>
        <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="error-state">
          <span>🚫</span>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <Link to="/my-orders" className="btn btn--primary">My Orders</Link>
        </div>
      </div>
    );
  }

  const currentStatusIdx = STATUS_TIMELINE.indexOf(order.status);
  const canCancel = ['Pending', 'Confirmed', 'Processing'].includes(order.status);

  return (
    <div className="order-detail-page">
      <div className="container" style={{ padding: '2rem 1rem 5rem' }}>
        <Link to="/my-orders" className="back-link">← Back to My Orders</Link>

        <div className="order-detail-card">
          <div className="order-detail-card__header">
            <div>
              <h1 className="order-detail-card__title">
                Order #{order._id.slice(-8).toUpperCase()}
              </h1>
              <p className="order-detail-card__date">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className={`status-badge status-badge--${order.status.toLowerCase()}`}>{order.status}</span>
              {canCancel && (
                <button className="btn btn--ghost btn--sm" onClick={handleCancelOrder} disabled={cancelling} style={{ color: 'var(--red)' }}>
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>

          {/* Delivery Timeline Tracker */}
          {order.status !== 'Cancelled' ? (
            <div className="order-timeline-wrap">
              <h3 className="section-title">📦 Delivery Tracking Timeline</h3>
              <div className="timeline-steps">
                {STATUS_TIMELINE.map((st, idx) => {
                  const isCompleted = currentStatusIdx >= idx;
                  const isCurrent = currentStatusIdx === idx;
                  return (
                    <div key={st} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                      <div className="timeline-dot">{isCompleted ? '✓' : idx + 1}</div>
                      <span className="timeline-label">{st}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="order-cancelled-banner">
              ❌ This order was cancelled on {new Date(order.updatedAt).toLocaleDateString()}. Inventory has been restocked.
            </div>
          )}

          <div className="order-detail-grid" style={{ marginTop: '2rem' }}>
            {/* Items */}
            <div className="order-items-list">
              <h3>Ordered Products</h3>
              {order.items.map((item, idx) => (
                <div key={idx} className="order-item-row">
                  <img src={item.image} alt={item.name} className="order-item-img" />
                  <div className="order-item-info">
                    <h4>{item.name}</h4>
                    <p>{formatINR(item.price)} × {item.quantity}</p>
                  </div>
                  <span className="order-item-total">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Address & Payment Info */}
            <div className="order-info-sidebar">
              <div className="info-block">
                <h3>📍 Shipping Address</h3>
                <p><strong>{order.shippingAddress.fullName}</strong></p>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
                <p>📞 {order.shippingAddress.phone}</p>
              </div>

              <div className="info-block" style={{ marginTop: '1.5rem' }}>
                <h3>💳 Payment Details</h3>
                <p>Method: <strong>{order.paymentMethod || 'COD'}</strong></p>
                <p>Payment Status: <strong>{order.paymentStatus || 'Pending'}</strong></p>
              </div>

              <div className="order-total-block" style={{ marginTop: '1.5rem' }}>
                <div className="cart-summary__row">
                  <span>Grand Total</span>
                  <span className="grand-total">{formatINR(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderDetail;
