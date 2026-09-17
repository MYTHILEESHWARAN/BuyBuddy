import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { validateCoupon } from '../services/couponService';
import { formatINR } from '../utils/formatCurrency';
import toast from 'react-hot-toast';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Please login to checkout');
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    // Pass applied coupon to checkout
    navigate('/checkout', { state: { appliedCoupon } });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setIsApplying(true);
    try {
      const data = await validateCoupon(couponCode, cartTotal);
      setAppliedCoupon(data);
      toast.success('Coupon applied successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  const discountAmount = appliedCoupon?.discountAmount || 0;
  const grandTotal = cartTotal - discountAmount;

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="empty-state">
          <span className="empty-state__icon" style={{ fontSize: '5rem' }}>🛒</span>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <Link to="/products" className="btn btn--primary btn--lg">Start Shopping →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="page-title">Shopping Cart</h1>
        <p className="page-subtitle">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your cart</p>

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item._id} className="cart-item">
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-item__image"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/100x100?text=No+Image'; }}
                />
                <div className="cart-item__info">
                  <Link to={`/products/${item._id}`} className="cart-item__name">{item.name}</Link>
                  <span className="cart-item__category">{item.category}</span>
                  <span className="cart-item__unit-price">{formatINR(item.price)} each</span>
                </div>
                <div className="cart-item__controls">
                  <div className="quantity-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item._id, item.quantity - 1, item.stock)}
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >−</button>
                    <span className="qty-display">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item._id, item.quantity + 1, item.stock)}
                      disabled={item.quantity >= item.stock}
                      aria-label="Increase quantity"
                    >+</button>
                  </div>
                  <div className="cart-item__subtotal">
                    {formatINR(item.price * item.quantity)}
                  </div>
                  <button
                    className="cart-item__remove"
                    onClick={() => removeFromCart(item._id)}
                    aria-label={`Remove ${item.name}`}
                  >🗑</button>
                </div>
              </div>
            ))}

            <button className="btn btn--ghost btn--sm" onClick={clearCart} style={{ marginTop: '1rem' }}>
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="cart-summary">
            <h2 className="cart-summary__title">Order Summary</h2>
            
            {/* Coupon Section */}
            <div className="coupon-section" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-50)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>Apply Coupon</h3>
              {!appliedCoupon ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter code (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    style={{ flex: 1, textTransform: 'uppercase' }}
                  />
                  <button 
                    className="btn btn--outline" 
                    onClick={handleApplyCoupon}
                    disabled={isApplying || !couponCode.trim()}
                  >
                    {isApplying ? '...' : 'Apply'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f2fe', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #0ea5e9' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#0369a1', display: 'block' }}>{appliedCoupon.code} Applied!</span>
                    <span style={{ fontSize: '0.8rem', color: '#0284c7' }}>You saved {formatINR(discountAmount)}</span>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={handleRemoveCoupon} style={{ color: '#dc2626' }}>Remove</button>
                </div>
              )}
            </div>

            <div className="cart-summary__rows">
              <div className="cart-summary__row">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>{formatINR(cartTotal)}</span>
              </div>
              {appliedCoupon && (
                <div className="cart-summary__row" style={{ color: 'var(--green)' }}>
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{formatINR(discountAmount)}</span>
                </div>
              )}
            </div>
            
            <div className="cart-summary__divider" />
            
            <div className="cart-summary__total">
              <span>Grand Total</span>
              <span>{formatINR(grandTotal)}</span>
            </div>
            
            <button
              className="btn btn--primary btn--full btn--lg"
              onClick={handleCheckout}
              id="checkout-btn"
            >
              Proceed to Checkout →
            </button>
            <Link to="/products" className="btn btn--ghost btn--full" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
