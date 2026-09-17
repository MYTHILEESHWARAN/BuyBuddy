import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders } from '../services/orderService';
import { formatINR } from '../utils/formatCurrency';

const STATUS_COLORS = {
  Pending: 'pending',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await getMyOrders();
        setOrders(data.orders);
      } catch {
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1rem' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, marginBottom: 16, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="error-state">
          <span>⚠️</span>
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="container">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track all your purchases</p>

        {orders.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 0' }}>
            <span className="empty-state__icon">📦</span>
            <h2>No orders yet</h2>
            <p>When you place an order, it will appear here.</p>
            <Link to="/products" className="btn btn--primary btn--lg">Start Shopping →</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-card__header">
                  <div>
                    <span className="order-card__id">Order #{order._id.slice(-8).toUpperCase()}</span>
                    <span className="order-card__date">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="order-card__header-right">
                    <span className={`status-badge status-badge--${STATUS_COLORS[order.status]}`}>{order.status}</span>
                    <span className="order-card__total">{formatINR(order.totalAmount)}</span>
                  </div>
                </div>

                <div className="order-card__items">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="order-card__item">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="order-card__item-img"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/50x50?text=IMG'; }}
                      />
                      <span className="order-card__item-name">{item.name}</span>
                      <span className="order-card__item-qty">×{item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <span className="order-card__more">+{order.items.length - 3} more items</span>
                  )}
                </div>

                <div className="order-card__footer">
                  <span className="order-card__item-count">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                  <Link to={`/orders/${order._id}`} className="btn btn--outline btn--sm">View Details →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
